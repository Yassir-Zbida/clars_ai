import { NextResponse } from "next/server"
import { z } from "zod"
import { requireUserId, zodErrorResponse } from "@/app/api/clients/_lib"
import { completeChat, type ChatMessage } from "@/lib/ai/chat-completion"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const BodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(16000),
      })
    )
    .min(1)
    .max(40),
})

const SYSTEM = `You are Clars AI, an assistant inside a CRM + finance SaaS (contacts, projects, invoices, payments, expenses, analytics).
Be concise, actionable, and professional. Use markdown when it helps (bullet lists, **bold**).
If the user asks for something outside the app (legal, medical), decline and suggest appropriate professionals.
Do not invent private data about their account; suggest where in the app they can find or enter information.`

export async function POST(request: Request) {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error

    const body = BodySchema.parse(await request.json())
    const msgs: ChatMessage[] = [{ role: "system", content: SYSTEM }, ...body.messages]

    const result = await completeChat(msgs, { maxTokens: 1400, temperature: 0.65 })

    return NextResponse.json({
      data: {
        content: result.content,
        mock: result.mock,
        model: result.model,
        warning: result.warning,
      },
    })
  } catch (error) {
    const z = zodErrorResponse(error)
    if (z) return z
    console.error("[api/ai/chat POST]", error)
    return NextResponse.json({ error: "Chat failed" }, { status: 500 })
  }
}
