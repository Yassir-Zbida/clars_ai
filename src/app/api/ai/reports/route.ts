import { NextResponse } from "next/server"
import { z } from "zod"
import { requireUserId, zodErrorResponse } from "@/app/api/clients/_lib"
import { completeChat, isAiProviderConfigured, type ChatMessage } from "@/lib/ai/chat-completion"

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
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error

    const input = BodySchema.parse(await request.json())
    const origin = new URL(request.url).origin
    const cookie = request.headers.get("cookie") ?? ""

    const snapRes = await fetch(`${origin}/api/analytics/overview`, {
      headers: { cookie },
      cache: "no-store",
    })
    const snapshot = snapRes.ok ? ((await snapRes.json()) as { data?: unknown }).data ?? {} : {}

    if (!isAiProviderConfigured()) {
      return NextResponse.json({
        data: {
          content: offlineReport(snapshot),
          mock: true,
          warning: "No AI provider configured. Showing data-only outline.",
        },
      })
    }

    const userBlock = [
      `Audience: ${input.audience}`,
      input.focus ? `Special focus requested: ${input.focus}` : "",
      "Use the following JSON snapshot from the user's CRM (cents are integer currency minor units):",
      JSON.stringify(snapshot, null, 2),
      "",
      "Write a concise markdown report: title, executive summary (3-5 bullets), risks/opportunities, suggested next actions.",
      "Do not fabricate numbers not in the JSON.",
    ]
      .filter(Boolean)
      .join("\n")

    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          "You are a CRM analytics copilot. Output polished markdown only. Be specific to the numbers provided. Use € for euro amounts (divide cents by 100).",
      },
      { role: "user", content: userBlock },
    ]

    const result = await completeChat(messages, { maxTokens: 2000, temperature: 0.45 })

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
    console.error("[api/ai/reports POST]", error)
    return NextResponse.json({ error: "Report generation failed" }, { status: 500 })
  }
}
