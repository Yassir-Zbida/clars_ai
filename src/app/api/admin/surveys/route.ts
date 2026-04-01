import { NextResponse } from "next/server"
import mongoose from "mongoose"

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

    const { searchParams } = new URL(request.url)
    const search = (searchParams.get("search") ?? "").trim()
    const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "20") || 20))
    const includeSkipped = (searchParams.get("includeSkipped") ?? "true") !== "false"
    const skip = (page - 1) * limit

    await getDb()

    const query: Record<string, unknown> = {
      onboardingSurveyCompletedAt: { $exists: true, $ne: null },
      deletedAt: { $in: [null, undefined] },
    }

    if (!includeSkipped) {
      query["onboardingSurvey.skipped"] = { $ne: true }
    }

    if (search) {
      const re = new RegExp(escapeRegExp(search), "i")
      query.$or = [{ email: re }, { name: re }]
    }

    const [rows, total] = await Promise.all([
      User.find(query)
        .select("name email onboardingSurvey onboardingSurveyCompletedAt createdAt")
        .sort({ onboardingSurveyCompletedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ])

    const data = rows.map((row) => {
      const u = row as {
        _id: mongoose.Types.ObjectId
        name?: string
        email?: string
        onboardingSurveyCompletedAt?: Date
        onboardingSurvey?: Record<string, unknown>
        createdAt?: Date
      }
      const payload = (u.onboardingSurvey ?? {}) as Record<string, unknown>
      return {
        id: String(u._id),
        name: u.name ?? "Unnamed user",
        email: u.email ?? "",
        submittedAt: u.onboardingSurveyCompletedAt?.toISOString() ?? null,
        userCreatedAt: u.createdAt?.toISOString() ?? null,
        skipped: payload.skipped === true,
        answers: payload,
      }
    })

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      hasMore: skip + data.length < total,
    })
  } catch (error) {
    console.error("[api/admin/surveys GET]", error)
    return NextResponse.json({ error: "Failed to load survey submissions" }, { status: 500 })
  }
}

