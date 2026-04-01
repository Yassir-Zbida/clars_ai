import { NextResponse } from "next/server"

import { requireAdminUser } from "@/app/api/admin/_lib"
import { getDb } from "@/server/db"
import { User } from "@/server/models/user"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function escapeRegExp(v: string) {
  return v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export async function GET(request: Request) {
  try {
    const authRes = await requireAdminUser()
    if ("error" in authRes) return authRes.error

    await getDb()
    const { searchParams } = new URL(request.url)
    const search = (searchParams.get("search") ?? "").trim()
    const statusFilter = (searchParams.get("status") ?? "all").toLowerCase()
    const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "10") || 10))
    const skip = (page - 1) * limit

    const clauses: Record<string, unknown>[] = []
    if (search) {
      const re = new RegExp(escapeRegExp(search), "i")
      clauses.push({ $or: [{ name: re }, { email: re }] })
    }
    if (statusFilter === "active") {
      clauses.push({ $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] })
    } else if (statusFilter === "deleted") {
      clauses.push({ deletedAt: { $ne: null } })
    }
    const query = clauses.length > 0 ? { $and: clauses } : {}

    const [rows, total] = await Promise.all([
      User.find(query)
        .select("name email createdAt updatedAt deletedAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ])

    const data = rows.map((row) => {
      const doc = row as {
        _id: { toString(): string }
        name?: string
        email?: string
        createdAt?: Date
        updatedAt?: Date
        deletedAt?: Date | null
      }
      return {
        id: String(doc._id),
        name: doc.name ?? "Unnamed user",
        email: doc.email ?? "",
        status: doc.deletedAt ? "SOFT_DELETED" : "ACTIVE",
        createdAt: doc.createdAt?.toISOString() ?? null,
        updatedAt: doc.updatedAt?.toISOString() ?? null,
      }
    })

    const totalPages = Math.max(1, Math.ceil(total / limit))

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages,
      hasMore: skip + data.length < total,
    })
  } catch (error) {
    console.error("[api/admin/users GET]", error)
    return NextResponse.json({ error: "Failed to list users" }, { status: 500 })
  }
}
