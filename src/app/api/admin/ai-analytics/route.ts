import mongoose from "mongoose"
import { NextResponse } from "next/server"

import { requireAdminUser } from "@/app/api/admin/_lib"
import { isAiProviderConfigured } from "@/lib/ai/chat-completion"
import { getDb } from "@/server/db"
import { AiUsageEvent } from "@/server/models/ai-usage-event"
import { Interaction } from "@/server/models/interaction"
import { User } from "@/server/models/user"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ALLOWED_RANGE_DAYS = new Set([7, 14, 30, 60, 90, 180, 365])

function parseRangeDays(searchParams: URLSearchParams): number {
  const raw = Number(searchParams.get("days"))
  if (!Number.isFinite(raw) || !ALLOWED_RANGE_DAYS.has(raw)) return 30
  return raw
}

/** Shorter window for inline comparisons (e.g. “⋯ · Nd …”). */
function compareDaysFor(rangeDays: number): number {
  if (rangeDays >= 14) return 7
  return Math.max(1, Math.floor(rangeDays / 2))
}

function interactionSince(since: Date) {
  return { $or: [{ date: { $gte: since } }, { createdAt: { $gte: since } }] }
}

function lastNDaysUtc(n: number) {
  const now = new Date()
  const out: Array<{ key: string; start: Date; end: Date; label: string }> = []
  for (let i = n - 1; i >= 0; i--) {
    const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i))
    const start = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), 0, 0, 0, 0))
    const end = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), 23, 59, 59, 999))
    const key = `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, "0")}-${String(base.getUTCDate()).padStart(2, "0")}`
    const label = `${String(base.getUTCMonth() + 1).padStart(2, "0")}/${String(base.getUTCDate()).padStart(2, "0")}`
    out.push({ key, start, end, label })
  }
  return out
}

function percentile(sorted: number[], p: number) {
  if (!sorted.length) return null
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))
  return sorted[idx]
}

export async function GET(request: Request) {
  try {
    const authRes = await requireAdminUser()
    if ("error" in authRes) return authRes.error

    await getDb()
    const { searchParams } = new URL(request.url)
    const rangeDays = parseRangeDays(searchParams)
    const compareDays = compareDaysFor(rangeDays)
    const dayMs = 24 * 60 * 60 * 1000
    const now = new Date()
    const lastPrimary = new Date(now.getTime() - rangeDays * dayMs)
    const lastCompare = new Date(now.getTime() - compareDays * dayMs)
    const days = lastNDaysUtc(rangeDays)
    const rangeStart = days[0].start

    const apiMatch30 = { createdAt: { $gte: lastPrimary }, eventType: "api" as const }
    const apiMatch7 = { createdAt: { $gte: lastCompare }, eventType: "api" as const }
    const viewMatch30 = { createdAt: { $gte: lastPrimary }, eventType: "page_view" as const }
    const interactionFilter = interactionSince(lastPrimary)

    const [
      grouped,
      apiCount30,
      apiCount7,
      viewCount30,
      uniqueApiUsers30,
      surface30,
      surface7,
      tokenAgg,
      mockAgg,
      modelAgg,
      peakHour,
      topUsersAgg,
      recentRaw,
      chatWithImages30,
      crmEmail,
      crmProposal,
      crmNote,
      crmTotal,
      avgLat,
      durationSample,
    ] = await Promise.all([
      AiUsageEvent.aggregate<{
        _id: { day: string; eventType: string; surface: string }
        count: number
      }>([
        { $match: { createdAt: { $gte: rangeStart } } },
        {
          $group: {
            _id: {
              day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } },
              eventType: "$eventType",
              surface: "$surface",
            },
            count: { $sum: 1 },
          },
        },
      ]),
      AiUsageEvent.countDocuments(apiMatch30),
      AiUsageEvent.countDocuments(apiMatch7),
      AiUsageEvent.countDocuments(viewMatch30),
      AiUsageEvent.distinct("userId", apiMatch30).then((x) => x.length),
      AiUsageEvent.aggregate([{ $match: apiMatch30 }, { $group: { _id: "$surface", count: { $sum: 1 } } }]),
      AiUsageEvent.aggregate([{ $match: apiMatch7 }, { $group: { _id: "$surface", count: { $sum: 1 } } }]),
      AiUsageEvent.aggregate([
        { $match: { ...apiMatch30, totalTokens: { $gt: 0 } } },
        {
          $group: {
            _id: null,
            prompt: { $sum: { $ifNull: ["$promptTokens", 0] } },
            completion: { $sum: { $ifNull: ["$completionTokens", 0] } },
            total: { $sum: { $ifNull: ["$totalTokens", 0] } },
            n: { $sum: 1 },
          },
        },
      ]),
      AiUsageEvent.aggregate([{ $match: apiMatch30 }, { $group: { _id: "$mock", count: { $sum: 1 } } }]),
      AiUsageEvent.aggregate([
        { $match: { ...apiMatch30, model: { $exists: true, $nin: [null, ""] } } },
        { $group: { _id: "$model", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
      AiUsageEvent.aggregate<{ _id: number; count: number }>([
        { $match: apiMatch30 },
        { $group: { _id: { $hour: { date: "$createdAt", timezone: "UTC" } }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ]),
      AiUsageEvent.aggregate([
        { $match: apiMatch30 },
        {
          $group: {
            _id: "$userId",
            apiCalls: { $sum: 1 },
            tokens: { $sum: { $ifNull: ["$totalTokens", 0] } },
          },
        },
        { $sort: { apiCalls: -1 } },
        { $limit: 12 },
        {
          $lookup: {
            from: User.collection.collectionName,
            localField: "_id",
            foreignField: "_id",
            as: "u",
          },
        },
        { $unwind: { path: "$u", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            userId: { $toString: "$_id" },
            email: "$u.email",
            name: "$u.name",
            apiCalls: 1,
            tokens: 1,
          },
        },
      ]),
      AiUsageEvent.find({ createdAt: { $gte: lastPrimary } })
        .sort({ createdAt: -1 })
        .limit(200)
        .lean(),
      AiUsageEvent.countDocuments({
        ...apiMatch30,
        surface: "chat",
        "meta.hasImages": true,
      }),
      Interaction.countDocuments({ type: "EMAIL", ...interactionFilter }),
      Interaction.countDocuments({ type: "PROPOSAL", ...interactionFilter }),
      Interaction.countDocuments({ type: "NOTE", ...interactionFilter }),
      Interaction.countDocuments(interactionFilter),
      AiUsageEvent.aggregate([
        { $match: { ...apiMatch30, durationMs: { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: "$durationMs" } } },
      ]),
      AiUsageEvent.find({ ...apiMatch30, durationMs: { $gt: 0 } })
        .select("durationMs")
        .sort({ durationMs: 1 })
        .limit(2000)
        .lean(),
    ])

    type Surface = "chat" | "email" | "reports"
    const surfaces: Surface[] = ["chat", "email", "reports"]

    const pickSurface = (rows: { _id: string | null; count: number }[], s: Surface) => {
      const hit = rows.find((r) => r._id === s)
      return hit?.count ?? 0
    }

    const totalsBySurface30 = {
      chat: pickSurface(surface30, "chat"),
      email: pickSurface(surface30, "email"),
      reports: pickSurface(surface30, "reports"),
    }
    const totalsBySurface7 = {
      chat: pickSurface(surface7, "chat"),
      email: pickSurface(surface7, "email"),
      reports: pickSurface(surface7, "reports"),
    }

    const byDayKey = (key: string) => {
      const api = { chat: 0, email: 0, reports: 0, total: 0 }
      const views = { chat: 0, email: 0, reports: 0, total: 0 }
      for (const g of grouped) {
        if (g._id.day !== key) continue
        const s = g._id.surface as Surface
        if (!surfaces.includes(s)) continue
        if (g._id.eventType === "api") {
          api[s] += g.count
          api.total += g.count
        }
        if (g._id.eventType === "page_view") {
          views[s] += g.count
          views.total += g.count
        }
      }
      return { api, views }
    }

    const activityByDay = days.map((d) => {
      const { api, views } = byDayKey(d.key)
      return {
        label: d.label,
        apiChat: api.chat,
        apiEmail: api.email,
        apiReports: api.reports,
        apiTotal: api.total,
        viewsChat: views.chat,
        viewsEmail: views.email,
        viewsReports: views.reports,
      }
    })

    const tokenRow = tokenAgg[0] as { prompt: number; completion: number; total: number; n: number } | undefined

    const latRow = avgLat[0] as { avg?: number } | undefined
    const avgLatencyMs = latRow?.avg != null ? Math.round(latRow.avg) : 0
    const durs = durationSample.map((d) => d.durationMs).filter((n): n is number => typeof n === "number")
    const p90LatencyMs = percentile(durs, 0.9)

    let liveCalls = 0
    let mockCalls = 0
    for (const row of mockAgg as { _id: boolean | null; count: number }[]) {
      if (row._id === true) mockCalls += row.count
      else liveCalls += row.count
    }

    const peak = peakHour[0]

    const userMap = new Map<string, { name?: string | null; email?: string | null }>()
    const ids = Array.from(new Set(recentRaw.map((r) => String(r.userId))))
    if (ids.length) {
      const users = await User.find({
        _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) },
      })
        .select("name email")
        .lean()
      for (const u of users) {
        userMap.set(String(u._id), { name: u.name, email: u.email })
      }
    }

    const recent = recentRaw.map((r) => {
      const u = userMap.get(String(r.userId))
      return {
        id: String(r._id),
        at: (r.createdAt as Date).toISOString(),
        eventType: r.eventType as string,
        surface: r.surface as string,
        mock: r.mock,
        model: r.model,
        durationMs: r.durationMs,
        totalTokens: r.totalTokens,
        userEmail: u?.email ?? "—",
        userName: u?.name ?? "—",
      }
    })

    return NextResponse.json({
      data: {
        meta: { rangeDays, compareDays },
        generatedAt: now.toISOString(),
        aiProviderConfigured: isAiProviderConfigured(),
        crm: {
          email: crmEmail,
          proposal: crmProposal,
          note: crmNote,
          total: crmTotal,
        },
        api: {
          calls30d: apiCount30,
          calls7d: apiCount7,
          uniqueUsers30d: uniqueApiUsers30,
          bySurface30d: totalsBySurface30,
          bySurface7d: totalsBySurface7,
          tokens: {
            prompt30d: tokenRow?.prompt ?? 0,
            completion30d: tokenRow?.completion ?? 0,
            total30d: tokenRow?.total ?? 0,
            callsWithTokenUsage30d: tokenRow?.n ?? 0,
          },
          latencyMs: { avg: avgLatencyMs, p90: p90LatencyMs },
          liveVsMock30d: { live: liveCalls, mock: mockCalls },
          chatRequestsWithImages30d: chatWithImages30,
        },
        ui: {
          pageViews30d: viewCount30,
        },
        engagement: {
          apiCallsPerPageVisit30d: viewCount30 > 0 ? apiCount30 / viewCount30 : null,
        },
        models: (modelAgg as { _id: string; count: number }[]).map((m) => ({ model: m._id, calls30d: m.count })),
        peakUtcHourApi30d: peak ? { hour: peak._id, calls: peak.count } : null,
        topUsers30d: topUsersAgg as Array<{
          userId: string
          email?: string | null
          name?: string | null
          apiCalls: number
          tokens: number
        }>,
        activityByDay,
        recent,
      },
    })
  } catch (error) {
    console.error("[api/admin/ai-analytics GET]", error)
    return NextResponse.json({ error: "Failed to load AI analytics" }, { status: 500 })
  }
}
