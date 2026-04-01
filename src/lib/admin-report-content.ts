import type { AdminDashboardData } from "@/server/admin-dashboard-data"

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function buildAdminReportPayload(
  dashboard: AdminDashboardData,
  reportName: string
): { summary: string; detail: string; html: string } {
  const o = dashboard.overview
  const ai = dashboard.aiAnalytics
  const inc = dashboard.logs.incidents
  const alertSum = inc.reduce((s, i) => s + (i.count ?? 0), 0)

  const lines: string[] = [
    `Clars admin report — ${reportName}`,
    `Snapshot time (UTC): ${dashboard.generatedAt}`,
    "",
    "— Overview —",
    `Total users: ${o.totalUsers} · Active: ${o.activeUsers} · Soft-deleted: ${o.softDeletedUsers}`,
    `New users (30d / 7d): ${o.newUsers30d} / ${o.newUsers7d}`,
    `Survey completed / skipped: ${o.surveyCompleted} / ${o.surveySkipped} · Response rate: ${o.responseRate}%`,
    `Overdue invoices: ${o.overdueInvoices} (recent 7d slice: ${o.overdueInvoices7d})`,
    `Health scores — Auth: ${o.releaseQuality.authHealth} · Survey: ${o.releaseQuality.surveyHealth} · Runtime: ${o.releaseQuality.runtimeHealth}`,
    "",
    "— Operational incidents —",
    ...inc.map((i) => `${i.service} [${i.level}]: ${i.message} — ${i.count}`),
    `Total incident counts: ${alertSum}`,
    "",
    "— Survey signals —",
    `Heard about us (top): ${dashboard.surveys.heard.map((h) => `${h.key} (${h.count})`).join(", ") || "—"}`,
    `Recent comments: ${dashboard.surveys.comments.length ? dashboard.surveys.comments.join(" | ") : "—"}`,
    "",
    "— AI & activity (30d) —",
    `AI provider configured: ${ai.aiProviderConfigured ? "yes" : "no"}`,
    `Interactions: ${ai.interactions30d} (7d: ${ai.interactions7d}) · Proposals: ${ai.proposal30d} · Email: ${ai.email30d} · Notes: ${ai.note30d}`,
    `Active editors (30d): ${ai.activeEditors30d}`,
    "",
    "— Last 14d signups (label: count) —",
    dashboard.series.signupsByDay.map((x) => `${x.label}: ${x.count}`).join(" · "),
  ]

  const detail = lines.join("\n").slice(0, 14000)
  const summary = [
    `Users ${o.totalUsers}/${o.activeUsers}`,
    `Overdue inv ${o.overdueInvoices}`,
    `Survey ${o.responseRate}%`,
    `Alerts ${alertSum}`,
  ].join(" · ")

  const html = `
  <div style="font-family:system-ui,Segoe UI,sans-serif;font-size:14px;line-height:1.45;color:#111">
    <h2 style="margin:0 0 12px">Clars admin report — ${escapeHtml(reportName)}</h2>
    <p style="margin:0 0 16px;color:#555;font-size:12px">UTC ${escapeHtml(dashboard.generatedAt)}</p>
    <pre style="white-space:pre-wrap;background:#f6f7f9;padding:12px;border-radius:8px;font-size:12px">${escapeHtml(detail)}</pre>
  </div>
`.trim()

  return { summary, detail, html }
}
