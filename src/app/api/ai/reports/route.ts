import { NextResponse } from "next/server"
import { z } from "zod"
import { requireUserId, zodErrorResponse } from "@/app/api/clients/_lib"
import { completeChat, isAiProviderConfigured, type ChatMessage } from "@/lib/ai/chat-completion"
import { buildRagContext } from "@/lib/ai/rag-context"
import { recordAiUsage } from "@/lib/ai/record-usage"
import { auditLog, checkRateLimit, detectInjection, sanitizeOutput, SECURITY_GUARDRAILS } from "@/lib/ai/security"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const BodySchema = z.object({
  focus: z.string().max(3000).optional(),
  audience: z.enum(["executive", "team", "client"]).default("executive"),
})

function offlineReport(snapshot: unknown): string {
  const s = snapshot as {
    finance?: Record<string, number>
    productivity?: { interactionsLast30Days?: number; totalClients?: number }
    clientsByStatus?: Record<string, number>
    projectsByStatus?: Record<string, number>
  }
  const f = s.finance ?? {}
  const fmt = (c: number) => (c / 100).toFixed(2)
  return [
    "## Workspace report (offline)",
    "",
    "_Configure `OPENAI_API_KEY` or `OPENROUTER_API_KEY` for narrative commentary._",
    "",
    "### Finance snapshot",
    `- Outstanding AR: €${fmt(f.outstandingCents ?? 0)}`,
    `- Overdue: €${fmt(f.overdueCents ?? 0)}`,
    `- Revenue (MTD): €${fmt(f.revenueMtdCents ?? 0)}`,
    `- Expenses (MTD): €${fmt(f.expensesMtdCents ?? 0)}`,
    `- Net (MTD): €${fmt(f.netMtdCents ?? 0)}`,
    "",
    "### Activity",
    `- Interactions (30d): ${s.productivity?.interactionsLast30Days ?? 0}`,
    `- Contacts: ${s.productivity?.totalClients ?? 0}`,
    "",
    "### Pipelines",
    `- Contacts by status: ${JSON.stringify(s.clientsByStatus ?? {})}`,
    `- Projects by status: ${JSON.stringify(s.projectsByStatus ?? {})}`,
  ].join("\n")
}

export async function POST(request: Request) {
  const started = Date.now()
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error

    const userId = authRes.userId

    // Rate limit: 5 report generations / user / minute
    const rl = checkRateLimit(userId, 5, 60_000)
    if (!rl.allowed) {
      auditLog(userId, "rate_limit_exceeded")
      return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 })
    }

    const input = BodySchema.parse(await request.json())

    // Scan focus field for injection
    if (input.focus) {
      const injection = detectInjection(input.focus)
      if (injection.flagged) {
        auditLog(userId, "injection_attempt", `${injection.label}: "${injection.snippet}"`)
        return NextResponse.json({ error: "Your message contains content that cannot be processed." }, { status: 400 })
      }
    }

    const origin = new URL(request.url).origin
    const cookie = request.headers.get("cookie") ?? ""

    const snapRes = await fetch(`${origin}/api/analytics/overview`, {
      headers: { cookie },
      cache: "no-store",
    })
    const snapshot = snapRes.ok ? ((await snapRes.json()) as { data?: unknown }).data ?? {} : {}

    if (!isAiProviderConfigured()) {
      void recordAiUsage({
        userId,
        eventType: "api",
        surface: "reports",
        mock: true,
        durationMs: Date.now() - started,
        meta: { audience: input.audience, focusLen: input.focus?.length ?? 0, offline: true },
      })
      return NextResponse.json({
        data: {
          content: offlineReport(snapshot),
          mock: true,
          warning: "No AI provider configured. Showing data-only outline.",
        },
      })
    }

    const [crmContext] = await Promise.all([buildRagContext(userId)])

    // Compact analytics snapshot — only include non-zero finance fields to save tokens
    const snap = snapshot as Record<string, unknown>
    const fin = (snap.finance ?? {}) as Record<string, number>
    const compactSnap = {
      fin: Object.fromEntries(Object.entries(fin).filter(([, v]) => v !== 0)),
      clients: snap.clientsByStatus,
      projects: snap.projectsByStatus,
      forecast: snap.forecast,
    }

    const userBlock = [
      `Audience: ${input.audience}`,
      input.focus ? `Focus: ${input.focus}` : "",
      crmContext,
      `Analytics:${JSON.stringify(compactSnap)}`,
      "Write: title + 3-5 bullet exec summary + risks/opportunities + next actions. Cite real names/numbers. Cents÷100=€.",
    ]
      .filter(Boolean)
      .join("\n")

    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `CRM analytics copilot. Output polished markdown. Be specific — reference real client names, invoice numbers, € amounts from the data provided. Never fabricate figures.\n${SECURITY_GUARDRAILS}`,
      },
      { role: "user", content: userBlock },
    ]

    const result = await completeChat(messages, { maxTokens: 2000, temperature: 0.45 })

    void recordAiUsage({
      userId,
      eventType: "api",
      surface: "reports",
      model: result.model,
      mock: result.mock,
      promptTokens: result.usage?.promptTokens,
      completionTokens: result.usage?.completionTokens,
      totalTokens: result.usage?.totalTokens,
      durationMs: Date.now() - started,
      meta: { audience: input.audience, focusLen: input.focus?.length ?? 0 },
    })

    return NextResponse.json({
      data: {
        content: sanitizeOutput(result.content),
        mock: result.mock,
        model: result.model,
        warning: result.warning,
        usage: result.usage,
      },
    })
  } catch (error) {
    const z = zodErrorResponse(error)
    if (z) return z
    console.error("[api/ai/reports POST]", error)
    return NextResponse.json({ error: "Report generation failed" }, { status: 500 })
  }
}
