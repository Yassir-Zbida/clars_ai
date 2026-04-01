import { NextResponse } from "next/server"
import { z } from "zod"

import { requireUserId, zodErrorResponse } from "@/app/api/clients/_lib"
import { recordAiUsage } from "@/lib/ai/record-usage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const BodySchema = z.object({
  surface: z.enum(["chat", "email", "reports"]),
})

export async function POST(request: Request) {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error

    const body = BodySchema.parse(await request.json())
    void recordAiUsage({
      userId: authRes.userId,
      eventType: "page_view",
      surface: body.surface,
      durationMs: 0,
      meta: { source: "web" },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    const z = zodErrorResponse(error)
    if (z) return z
    console.error("[api/ai/page-view POST]", error)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
