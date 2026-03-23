import mongoose from "mongoose"
import { NextResponse } from "next/server"
import { getDb } from "@/server/db"
import { Client } from "@/server/models/client"
import { requireUserId } from "@/app/api/clients/_lib"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Contacts with a scheduled follow-up (uses `nextFollowUpAt` on Client). */
export async function GET(request: Request) {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error
    await getDb()
    const uid = new mongoose.Types.ObjectId(authRes.userId)
    const { searchParams } = new URL(request.url)
    const windowDays = Math.min(365, Math.max(1, Number(searchParams.get("windowDays")) || 90))
    const until = new Date()
    until.setDate(until.getDate() + windowDays)

    const rows = await Client.find({
      userId: uid,
      deletedAt: { $in: [null, undefined] },
      isArchived: false,
      nextFollowUpAt: { $exists: true, $ne: null, $lte: until },
    })
      .sort({ nextFollowUpAt: 1 })
      .limit(200)
      .select("fullName company email status nextFollowUpAt")
      .lean()

    const now = Date.now()
    const data = rows.map((r) => {
      const c = r as {
        _id: mongoose.Types.ObjectId
        fullName?: string
        company?: string
        email?: string
        status?: string
        nextFollowUpAt?: Date
      }
      const at = c.nextFollowUpAt ? new Date(c.nextFollowUpAt).getTime() : 0
      return {
        id: String(c._id),
        fullName: c.fullName ?? "",
        company: c.company ?? null,
        email: c.email ?? null,
        status: c.status ?? "",
        nextFollowUpAt: c.nextFollowUpAt instanceof Date ? c.nextFollowUpAt.toISOString() : null,
        isOverdue: at > 0 && at < now,
      }
    })

    return NextResponse.json({ data })
  } catch (error) {
    console.error("[api/automation/reminders GET]", error)
    return NextResponse.json({ error: "Failed to load reminders" }, { status: 500 })
  }
}
