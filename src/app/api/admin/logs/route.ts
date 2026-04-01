import mongoose from "mongoose"
import { NextResponse } from "next/server"
import { z } from "zod"

import { requireAdminUser } from "@/app/api/admin/_lib"
import { getDb } from "@/server/db"
import {
  ClientActivityLog,
  clientActivityLogLevels,
  clientActivityLogTypes,
} from "@/server/models/client-activity-log"
import { User } from "@/server/models/user"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const QuerySchema = z.object({
  type: z.enum(["all", ...clientActivityLogTypes]).optional().default("all"),
  level: z.enum(["all", ...clientActivityLogLevels]).optional().default("all"),
  userId: z.string().optional(),
  q: z.string().max(200).optional(),
  limit: z.coerce.number().min(1).max(500).optional().default(100),
  offset: z.coerce.number().min(0).optional().default(0),
})

function parseQuery(req: Request) {
  const u = new URL(req.url)
  return QuerySchema.parse({
    type: u.searchParams.get("type") ?? undefined,
    level: u.searchParams.get("level") ?? undefined,
    userId: u.searchParams.get("userId") ?? undefined,
    q: u.searchParams.get("q") ?? undefined,
    limit: u.searchParams.get("limit") ?? undefined,
    offset: u.searchParams.get("offset") ?? undefined,
  })
}

export async function GET(request: Request) {
  try {
    const authRes = await requireAdminUser()
    if ("error" in authRes) return authRes.error

    const q = parseQuery(request)

    await getDb()

    const filter: Record<string, unknown> = {}
    if (q.type !== "all") filter.type = q.type
    if (q.level !== "all") filter.level = q.level
    if (q.userId && mongoose.Types.ObjectId.isValid(q.userId)) {
      filter.userId = new mongoose.Types.ObjectId(q.userId)
    }
    if (q.q?.trim()) {
      const rx = new RegExp(q.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
      filter.$or = [
        { name: rx },
        { message: rx },
        { path: rx },
        { userEmail: rx },
        { "meta.userVisibleMessage": rx },
        { "meta.apiPath": rx },
      ]
    }

    const [total, rows] = await Promise.all([
      ClientActivityLog.countDocuments(filter),
      ClientActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(q.offset)
        .limit(q.limit)
        .lean(),
    ])

    // Attach current user email if missing on older rows
    const userIds = Array.from(new Set(rows.map((r) => String(r.userId))))
    const oidList = userIds.filter((id) => mongoose.Types.ObjectId.isValid(id)).map((id) => new mongoose.Types.ObjectId(id))
    const emails = oidList.length
      ? await User.find({ _id: { $in: oidList } }).select("email").lean()
      : []
    const emailById = new Map(
      emails.map((u: { _id: unknown; email?: string }) => [String(u._id), u.email ?? ""])
    )

    const data = rows.map((r) => ({
      id: String(r._id),
      userId: String(r.userId),
      userEmail: r.userEmail || emailById.get(String(r.userId)) || null,
      sessionId: r.sessionId ?? null,
      type: r.type,
      level: r.level,
      name: r.name,
      message: r.message ?? null,
      path: r.path ?? null,
      meta: r.meta ?? null,
      userAgent: r.userAgent ?? null,
      clientTs: r.clientTs ? new Date(r.clientTs).toISOString() : null,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
    }))

    return NextResponse.json({ data: { total, items: data, limit: q.limit, offset: q.offset } })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: error.flatten() }, { status: 400 })
    }
    console.error("[api/admin/logs GET]", error)
    return NextResponse.json({ error: "Failed to load logs" }, { status: 500 })
  }
}

const DeleteQuerySchema = z.object({
  scope: z.enum(["all", "filtered"]).default("filtered"),
  type: z.enum(["all", ...clientActivityLogTypes]).optional().default("all"),
  level: z.enum(["all", ...clientActivityLogLevels]).optional().default("all"),
  userId: z.string().optional(),
  q: z.string().max(200).optional(),
})

export async function DELETE(request: Request) {
  try {
    const authRes = await requireAdminUser()
    if ("error" in authRes) return authRes.error

    const u = new URL(request.url)
    const q = DeleteQuerySchema.parse({
      scope: u.searchParams.get("scope") ?? undefined,
      type: u.searchParams.get("type") ?? undefined,
      level: u.searchParams.get("level") ?? undefined,
      userId: u.searchParams.get("userId") ?? undefined,
      q: u.searchParams.get("q") ?? undefined,
    })

    await getDb()

    let filter: Record<string, unknown> = {}
    if (q.scope === "filtered") {
      if (q.type !== "all") filter.type = q.type
      if (q.level !== "all") filter.level = q.level
      if (q.userId && mongoose.Types.ObjectId.isValid(q.userId)) {
        filter.userId = new mongoose.Types.ObjectId(q.userId)
      }
      if (q.q?.trim()) {
        const rx = new RegExp(q.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
        filter.$or = [
          { name: rx },
          { message: rx },
          { path: rx },
          { userEmail: rx },
          { "meta.userVisibleMessage": rx },
          { "meta.apiPath": rx },
        ]
      }

      const hasKeyedFilter =
        q.type !== "all" ||
        q.level !== "all" ||
        Boolean(q.userId && mongoose.Types.ObjectId.isValid(q.userId)) ||
        Boolean(q.q?.trim())
      if (!hasKeyedFilter) {
        return NextResponse.json(
          { error: "Choose a log type, level, or search text before clearing filtered logs." },
          { status: 400 }
        )
      }
    }

    const result = await ClientActivityLog.deleteMany(filter)

    return NextResponse.json({ ok: true, deletedCount: result.deletedCount })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: error.flatten() }, { status: 400 })
    }
    console.error("[api/admin/logs DELETE]", error)
    return NextResponse.json({ error: "Failed to clear logs" }, { status: 500 })
  }
}
