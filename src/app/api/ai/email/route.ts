import { NextResponse } from "next/server"
import { z } from "zod"
import { requireUserId, zodErrorResponse } from "@/app/api/clients/_lib"
import { completeChat, isAiProviderConfigured, type ChatMessage } from "@/lib/ai/chat-completion"
import { buildRagContext } from "@/lib/ai/rag-context"
import { auditLog, checkRateLimit, detectInjection, sanitizeOutput, SECURITY_GUARDRAILS } from "@/lib/ai/security"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const BodySchema = z.object({
  purpose: z.string().min(3).max(2000),
  tone: z.enum(["professional", "friendly", "short"]).default("professional"),
  contactName: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  extraContext: z.string().max(4000).optional(),
})

function offlineEmail(purpose: string, tone: string, contactName?: string, company?: string): string {
  const greet = contactName ? `Hi ${contactName},` : "Hi,"
  const co = company ? ` (${company})` : ""
  return (
    `**Demo draft** — configure \`OPENAI_API_KEY\` or \`OPENROUTER_API_KEY\` for AI-written copy.\n\n` +
    `---\n\n` +
    `Subject: Follow-up${co ? ` — ${company}` : ""}\n\n` +
    `${greet}\n\n` +
    `I wanted to follow up regarding: ${purpose.slice(0, 200)}${purpose.length > 200 ? "…" : ""}\n\n` +
    `[Add your ask and next steps here — tone: **${tone}**.]\n\n` +
    `Best regards`
  )
}

export async function POST(request: Request) {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error

    const userId = authRes.userId

    // Rate limit: 10 email generations / user / minute
    const rl = checkRateLimit(userId, 10, 60_000)
    if (!rl.allowed) {
      auditLog(userId, "rate_limit_exceeded")
      return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 })
    }

    const input = BodySchema.parse(await request.json())

    // Scan all text fields for injection
    const allText = [input.purpose, input.contactName, input.company, input.extraContext].filter(Boolean).join(" ")
    const injection = detectInjection(allText)
    if (injection.flagged) {
      auditLog(userId, "injection_attempt", `${injection.label}: "${injection.snippet}"`)
      return NextResponse.json({ error: "Your message contains content that cannot be processed." }, { status: 400 })
    }

    if (!isAiProviderConfigured()) {
      return NextResponse.json({
        data: {
          content: offlineEmail(input.purpose, input.tone, input.contactName, input.company),
          mock: true,
          warning: "No AI provider configured. Using an offline template.",
        },
      })
    }

    const userPrompt = [
      `Purpose: ${input.purpose}`,
      `Tone: ${input.tone}`,
      input.contactName ? `Recipient: ${input.contactName}` : "",
      input.company ? `Company: ${input.company}` : "",
      input.extraContext ? `Context: ${input.extraContext}` : "",
    ]
      .filter(Boolean)
      .join("\n")

    const crmContext = await buildRagContext(userId)

    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `Business email writer. Format: first line="Subject: ...", blank line, body. No [placeholder] brackets. Use CRM data to personalize names/amounts/projects.\n${crmContext}\n${SECURITY_GUARDRAILS}`,
      },
      { role: "user", content: userPrompt },
    ]

    const result = await completeChat(messages, { maxTokens: 900, temperature: 0.55 })

    return NextResponse.json({
      data: {
        content: sanitizeOutput(result.content),
        mock: result.mock,
        model: result.model,
        warning: result.warning,
      },
    })
  } catch (error) {
    const z = zodErrorResponse(error)
    if (z) return z
    console.error("[api/ai/email POST]", error)
    return NextResponse.json({ error: "Email generation failed" }, { status: 500 })
  }
}
