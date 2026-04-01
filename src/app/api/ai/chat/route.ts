import { NextResponse } from "next/server"
import { z } from "zod"
import { requireUserId, zodErrorResponse } from "@/app/api/clients/_lib"
import { completeChat, type ChatMessage } from "@/lib/ai/chat-completion"
import { buildRagContext } from "@/lib/ai/rag-context"
import { recordAiUsage } from "@/lib/ai/record-usage"
import {
  auditLog,
  checkRateLimit,
  sanitizeOutput,
  scanMessages,
  SECURITY_GUARDRAILS,
} from "@/lib/ai/security"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ContentPartSchema = z.union([
  z.object({ type: z.literal("text"), text: z.string().max(16000) }),
  z.object({ type: z.literal("image_url"), image_url: z.object({ url: z.string().max(4_000_000) }) }),
])

const BodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.union([
          z.string().min(1).max(16000),
          z.array(ContentPartSchema).min(1).max(10),
        ]),
      })
    )
    .min(1)
    .max(40),
})

// ≈180 tokens (was ≈420). Kept rules behaviorally equivalent; trimmed filler words,
// merged redundant clauses, compressed action examples to one-liners.
const SYSTEM = `You are Clars Assistant — AI copilot for Clars.ai CRM (contacts, projects, tasks, invoices, payments, expenses).
Reply in the user's language (auto-detect). Be concise, professional, markdown-friendly.
Live CRM data is injected below — cite real names/numbers; never invent account data.

ACTIONS: append ONE raw block at the very end of your reply ONLY when the user explicitly requests a create/navigate. No code fences. Always include a short confirmation sentence before the action block.
<action>{"type":"create_client","data":{"fullName":"Name","company":"?","email":"?"}}</action>
<action>{"type":"create_project","data":{"name":"Name","priority":"HIGH","description":"?"}}</action>
<action>{"type":"create_task","data":{"projectName":"ExactProjectName","title":"Task title","priority":"MEDIUM"}}</action>
<action>{"type":"navigate","data":{"path":"/dashboard/X","label":"Label"}}</action>
Rules: ≤1 action per reply · always write ≥1 sentence of text before the action · ask for missing required fields first · for create_task use the exact project name from CRM data · decline out-of-scope requests politely.`

function chatRequestMeta(messages: z.infer<typeof BodySchema>["messages"]) {
  let hasImages = false
  let userChars = 0
  for (const m of messages) {
    const c = m.content
    if (typeof c === "string") {
      if (m.role === "user") userChars += c.length
    } else {
      for (const p of c) {
        if (p.type === "image_url") hasImages = true
        if (p.type === "text" && m.role === "user") userChars += p.text.length
      }
    }
  }
  return { messageCount: messages.length, hasImages, userChars }
}

export async function POST(request: Request) {
  const started = Date.now()
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error

    const userId = authRes.userId

    // ── Rate limit: 30 requests / user / minute ──
    const rl = checkRateLimit(userId, 30, 60_000)
    if (!rl.allowed) {
      auditLog(userId, "rate_limit_exceeded")
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment and try again." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs ?? 60000) / 1000)) } }
      )
    }

    const body = BodySchema.parse(await request.json())

    // ── Injection scan on all user messages ──
    const injection = scanMessages(body.messages)
    if (injection.flagged) {
      auditLog(userId, "injection_attempt", `${injection.label}: "${injection.snippet}"`)
      return NextResponse.json(
        { error: "Your message contains content that cannot be processed." },
        { status: 400 }
      )
    }

    // ── Build hardened system prompt with live CRM context ──
    const crmContext = await buildRagContext(userId)
    const systemWithContext = `${SYSTEM}\n\n${crmContext}\n\n${SECURITY_GUARDRAILS}`

    const msgs: ChatMessage[] = [{ role: "system", content: systemWithContext }, ...body.messages]

    const result = await completeChat(msgs, { maxTokens: 1400, temperature: 0.65 })

    // ── Sanitise output — strip any leaked system markers ──
    const safeContent = sanitizeOutput(result.content)

    void recordAiUsage({
      userId,
      eventType: "api",
      surface: "chat",
      model: result.model,
      mock: result.mock,
      promptTokens: result.usage?.promptTokens,
      completionTokens: result.usage?.completionTokens,
      totalTokens: result.usage?.totalTokens,
      durationMs: Date.now() - started,
      meta: chatRequestMeta(body.messages),
    })

    return NextResponse.json({
      data: {
        content: safeContent,
        mock: result.mock,
        model: result.model,
        warning: result.warning,
        usage: result.usage,
      },
    })
  } catch (error) {
    const z = zodErrorResponse(error)
    if (z) return z
    console.error("[api/ai/chat POST]", error)
    return NextResponse.json({ error: "Chat failed" }, { status: 500 })
  }
}
