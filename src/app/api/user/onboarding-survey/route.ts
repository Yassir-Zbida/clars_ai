import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { getDb } from "@/server/db"
import { needsOnboardingSurveyForUser } from "@/lib/onboarding-survey"
import { User } from "@/server/models/user"
import mongoose from "mongoose"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SurveyBodySchema = z
  .object({
    skipped: z.boolean().optional(),
    role: z.enum(["FOUNDER", "OPS", "SALES", "MARKETING", "OTHER"]).optional(),
    teamSize: z.enum(["JUST_ME", "2_10", "11_50", "51_PLUS"]).optional(),
    primaryUse: z
      .enum(["CLIENTS_CRM", "INVOICING", "PROJECTS", "ANALYTICS", "OTHER"])
      .optional(),
    howHeard: z.enum(["SEARCH", "REFERRAL", "SOCIAL", "EVENT", "OTHER"]).optional(),
    comments: z.string().max(2000).optional(),
  })
  .refine(
    (d) =>
      d.skipped === true ||
      Boolean(d.role || d.teamSize || d.primaryUse || d.howHeard || (d.comments && d.comments.trim().length > 0)),
    { message: "Answer at least one question or choose Skip for now." }
  )

export async function POST(request: Request) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const raw = await request.text()
    let parsed: unknown = {}
    if (raw.trim()) {
      try {
        parsed = JSON.parse(raw) as unknown
      } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
      }
    }
    const body = SurveyBodySchema.parse(parsed)

    await getDb()
    const oid = new mongoose.Types.ObjectId(userId)
    const existing = await User.findOne({
      _id: oid,
      deletedAt: { $in: [null, undefined] },
    })
      .select("createdAt onboardingSurveyCompletedAt")
      .lean()

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const ex = existing as { createdAt?: Date; onboardingSurveyCompletedAt?: Date }
    if (!needsOnboardingSurveyForUser(ex.createdAt, ex.onboardingSurveyCompletedAt)) {
      return NextResponse.json({ ok: true, data: { alreadyCompleted: true } })
    }

    const surveyPayload = body.skipped
      ? { skipped: true }
      : {
          role: body.role,
          teamSize: body.teamSize,
          primaryUse: body.primaryUse,
          howHeard: body.howHeard,
          comments: body.comments?.trim() || undefined,
        }

    await User.updateOne(
      { _id: oid },
      {
        $set: {
          onboardingSurveyCompletedAt: new Date(),
          onboardingSurvey: surveyPayload,
        },
      }
    )

    return NextResponse.json({ ok: true, data: { saved: true } })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.flatten() },
        { status: 400 }
      )
    }
    console.error("[api/user/onboarding-survey POST]", error)
    return NextResponse.json({ error: "Failed to save survey" }, { status: 500 })
  }
}
