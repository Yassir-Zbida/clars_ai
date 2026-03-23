import { NextResponse } from "next/server"
import { z } from "zod"
import { requireUserId, zodErrorResponse } from "@/app/api/clients/_lib"
import { completeChat, isAiProviderConfigured, type ChatMessage } from "@/lib/ai/chat-completion"

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

    const input = BodySchema.parse(await request.json())

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
      "Write a business email (subject line on first line as: Subject: ...).",
      `Purpose / intent: ${input.purpose}`,
      `Tone: ${input.tone}`,
      input.contactName ? `Recipient name: ${input.contactName}` : "",
      input.company ? `Company: ${input.company}` : "",
      input.extraContext ? `Extra context: ${input.extraContext}` : "",
    ]
      .filter(Boolean)
      .join("\n")

    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          "You write clear CRM/business emails. Output subject line first line exactly as 'Subject: ...'. Then blank line, then body. No placeholder brackets unless unavoidable.",
      },
      { role: "user", content: userPrompt },
    ]

    const result = await completeChat(messages, { maxTokens: 900, temperature: 0.55 })

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
    console.error("[api/ai/email POST]", error)
    return NextResponse.json({ error: "Email generation failed" }, { status: 500 })
  }
}
