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
const SYSTEM = `You are Clars Assistant — AI copilot for Clars.ai (CRM, finance, analytics, admin).
Reply in the user's language (auto-detect). Use the SAME language as the user's most recent message unless they ask you to switch.
Be concise, professional, markdown-friendly. Live CRM data is injected below — cite real names/numbers; never invent account data.

ACTIONS: append ONE raw <action>{json}</action> block at the very end ONLY when the user explicitly asks you to create/edit/delete/archive/cancel/record/run/navigate. No code fences.
Before an action, always write 1–2 confirmation sentences describing exactly what will change. For destructive actions (delete/cancel/archive/clear/permanent delete), explicitly warn that it cannot be undone.

Supported action types (pick the minimum required fields, ask if missing):
- CRM:
  - create_client { fullName, company?, email? }
  - edit_client { clientName, patch }
  - archive_client { clientName }
  - edit_contact { clientName, contactName, patch }
  - delete_contact { clientName, contactName }
  - create_project { name, description?, priority? }
  - edit_project { projectName, patch }
  - delete_project { projectName }
  - create_task { projectName, title, priority? }
  - edit_task { projectName, taskTitle, patch }
  - delete_task { projectName, taskTitle }
- Finance:
  - create_invoice { clientName, documentType?, dueDate, currency?, taxRatePercent?, title?, notes?, lineItems?, amountCents?, projectName? }
  - edit_invoice { invoiceNumberOrId, patch }
  - delete_invoice { invoiceNumberOrId }
  - record_invoice_payment { invoiceNumberOrId, amountCents, method?, reference?, paidAt? }
  - create_expense { vendor?, category?, status?, amountCents, currency?, incurredAt?, notes?, receiptUrl?, clientName?, projectName? }
  - edit_expense { expenseId, patch }
  - delete_expense { expenseId }
- Analytics:
  - get_analytics_overview { }   (read-only; summarise results)
- Admin (only if user is an admin; otherwise refuse):
  - admin_get_dashboard { }
  - admin_run_status_checks { }
  - admin_clear_logs { scope, filters? }
  - admin_user_update { userEmailOrId, patch }
  - admin_user_delete_permanently { userEmailOrId }
  - admin_report_create { name, prompt, enabled? }
  - admin_report_update { reportId, patch }
  - admin_report_delete { reportId }
  - admin_report_run { reportId }
- Navigation:
  - navigate { path, label }

Rules: ≤1 action per reply · always write ≥1 sentence before the action · if identifiers are missing, ask a brief question instead of emitting an action · if multiple records could match, ask the user to clarify (do not guess) · for task/contact/invoice/expense include enough identifiers to uniquely resolve · decline out-of-scope requests politely.`

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
