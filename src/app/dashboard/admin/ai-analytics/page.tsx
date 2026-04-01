"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts"

import {
  AnalyticsError,
  AnalyticsLoading,
  KpiCard,
  SectionCard,
  SectionHeader,
} from "@/app/dashboard/analytics/_components/analytics-page-shell"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

import {
  ADMIN_AI_ANALYTICS_RANGE_OPTIONS,
  type AdminAiAnalyticsRangeDays,
  useAdminAiAnalytics,
} from "../use-admin-ai-analytics"

const chartConfig = {
  apiChat: { label: "Chat API", color: "hsl(217 91% 60%)" },
  apiEmail: { label: "Email AI", color: "hsl(142 70% 42%)" },
  apiReports: { label: "Reports AI", color: "hsl(280 65% 52%)" },
  viewsChat: { label: "Chat views", color: "hsl(217 40% 70%)" },
  viewsEmail: { label: "Email views", color: "hsl(142 35% 55%)" },
  viewsReports: { label: "Report views", color: "hsl(280 35% 65%)" },
} satisfies ChartConfig

const surfaceRows = {
  chat: { icon: "ri-chat-ai-line", label: "Assistant chat" },
  email: { icon: "ri-mail-send-line", label: "Email writer" },
  reports: { icon: "ri-file-chart-line", label: "AI reports" },
} as const

function surfaceLabel(s: string) {
  if (s === "chat") return "Assistant chat"
  if (s === "email") return "Email writer"
  if (s === "reports") return "AI reports"
  return s
}

function eventLabel(t: string) {
  return t === "page_view" ? "Page view" : "API completion"
}

function rangeOptionLabel(d: number) {
  if (d === 180) return "Last 180 days"
  if (d === 365) return "Last 365 days"
  return `Last ${d} days`
}

function formatLogWhen(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  const diffMs = Date.now() - d.getTime()
  const diffM = Math.floor(diffMs / 60_000)
  if (diffM < 1) return "Just now"
  if (diffM < 60) return `${diffM}m ago`
  const diffH = Math.floor(diffM / 60)
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `${diffD}d ago`
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
}

export default function AdminAiAnalyticsPage() {
  const [rangeDays, setRangeDays] = React.useState<AdminAiAnalyticsRangeDays>(30)
  const { data, isLoading, isError } = useAdminAiAnalytics(rangeDays)
  const [logFilter, setLogFilter] = React.useState<"all" | "api" | "page_view">("all")
  const [logSearch, setLogSearch] = React.useState("")

  const logStats = React.useMemo(() => {
    const rows = data?.recent ?? []
    let api = 0
    let pageView = 0
    for (const r of rows) {
      if (r.eventType === "api") api++
      else if (r.eventType === "page_view") pageView++
    }
    return { api, pageView, total: rows.length }
  }, [data?.recent])

  const filteredRecent = React.useMemo(() => {
    let rows = data?.recent ?? []
    if (logFilter === "api") rows = rows.filter((r) => r.eventType === "api")
    if (logFilter === "page_view") rows = rows.filter((r) => r.eventType === "page_view")
    const q = logSearch.trim().toLowerCase()
    if (q) {
      rows = rows.filter(
        (r) => r.userName.toLowerCase().includes(q) || r.userEmail.toLowerCase().includes(q)
      )
    }
    return rows
  }, [data?.recent, logFilter, logSearch])

  if (isLoading) {
    return (
      <SectionCard>
        <AnalyticsLoading message="Loading AI analytics…" />
      </SectionCard>
    )
  }
  if (isError || !data) {
    return (
      <SectionCard>
        <AnalyticsError message="Unable to load AI analytics. Refresh and try again." />
      </SectionCard>
    )
  }

  const callsPerVisit =
    data.engagement.apiCallsPerPageVisit30d != null ? data.engagement.apiCallsPerPageVisit30d.toFixed(2) : null

  const peakLabel =
    data.peakUtcHourApi30d != null
      ? `${String(data.peakUtcHourApi30d.hour).padStart(2, "0")}:00–${String(data.peakUtcHourApi30d.hour).padStart(2, "0")}:59 UTC`
      : "—"

  const totalTraffic = data.api.liveVsMock30d.live + data.api.liveVsMock30d.mock
  const livePct = totalTraffic > 0 ? Math.round((data.api.liveVsMock30d.live / totalTraffic) * 100) : 0
  const rd = data.meta.rangeDays
  const cd = data.meta.compareDays

  return (
    <div className="flex flex-col gap-4">
      <SectionCard>
        <SectionHeader
          icon="ri-cpu-line"
          iconBg="bg-blue-500/10"
          iconColor="text-blue-500"
          title="AI analytics"
          divider={false}
          description="Telemetry from /api/ai/* routes and assistant page opens. Token totals appear when the provider returns usage (OpenAI, OpenRouter, Gemini)."
          action={
            <div className="flex flex-wrap items-end justify-end gap-3">
              <div className="grid gap-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Time range</Label>
                <Select
                  value={String(rangeDays)}
                  onValueChange={(v) => setRangeDays(Number(v) as AdminAiAnalyticsRangeDays)}
                >
                  <SelectTrigger className="h-8 w-[148px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ADMIN_AI_ANALYTICS_RANGE_OPTIONS.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {rangeOptionLabel(d)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          }
        />
      </SectionCard>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={`AI API calls (${rd}d)`}
          value={data.api.calls30d.toLocaleString()}
          hint={`${data.api.calls7d.toLocaleString()} in the last ${cd} days · ${data.api.uniqueUsers30d} users`}
          icon="ri-pulse-line"
          iconBg="bg-blue-500/10"
          iconColor="text-blue-500"
        />
        <KpiCard
          title={`Tokens (${rd}d, reported)`}
          value={data.api.tokens.total30d.toLocaleString()}
          hint={`${data.api.tokens.callsWithTokenUsage30d.toLocaleString()} with usage · prompt ${data.api.tokens.prompt30d.toLocaleString()} · completion ${data.api.tokens.completion30d.toLocaleString()}`}
          icon="ri-coins-line"
          iconBg="bg-violet-500/10"
          iconColor="text-violet-500"
          footer={
            data.api.tokens.callsWithTokenUsage30d === 0 && data.api.calls30d > 0 ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">Provider did not return usage on these calls yet.</p>
            ) : undefined
          }
        />
        <KpiCard
          title={`Assistant pages (${rd}d)`}
          value={data.ui.pageViews30d.toLocaleString()}
          hint={
            callsPerVisit != null
              ? `${callsPerVisit} API calls per visit on average (all surfaces)`
              : "Recorded when users open Clars Assistant pages on this build."
          }
          icon="ri-layout-grid-line"
          iconBg="bg-cyan-500/10"
          iconColor="text-cyan-600 dark:text-cyan-400"
        />
        <KpiCard
          title={`API latency (${rd}d)`}
          value={data.api.latencyMs.avg > 0 ? `${data.api.latencyMs.avg} ms` : "—"}
          hint={`p90 ${data.api.latencyMs.p90 != null ? `${data.api.latencyMs.p90} ms` : "—"} · peak ${peakLabel}${
            data.peakUtcHourApi30d ? ` (${data.peakUtcHourApi30d.calls} calls)` : ""
          }`}
          icon="ri-timer-flash-line"
          iconBg="bg-amber-500/10"
          iconColor="text-amber-600 dark:text-amber-400"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={`Live completions (${rd}d)`}
          value={data.api.liveVsMock30d.live.toLocaleString()}
          hint={`${data.api.liveVsMock30d.mock.toLocaleString()} mock or offline`}
          icon="ri-cloud-line"
          iconBg="bg-emerald-500/10"
          iconColor="text-emerald-500"
          footer={
            totalTraffic > 0 ? (
              <div className="space-y-1.5">
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${livePct}%` }} />
                </div>
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{livePct}% live model</p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No completions yet in this window.</p>
            )
          }
        />
        <KpiCard
          title={`Chat + vision (${rd}d)`}
          value={data.api.chatRequestsWithImages30d.toLocaleString()}
          hint="Requests that included at least one image"
          icon="ri-image-add-line"
          iconBg="bg-rose-500/10"
          iconColor="text-rose-500"
        />
        <KpiCard
          title={`CRM interactions (${rd}d)`}
          value={data.crm.total.toLocaleString()}
          hint="Logged workspace interactions"
          icon="ri-group-line"
          iconBg="bg-slate-500/10"
          iconColor="text-slate-600 dark:text-slate-400"
        />
        <KpiCard
          title="AI provider"
          value={data.aiProviderConfigured ? "Ready" : "Not set"}
          hint={data.aiProviderConfigured ? "Keys for OpenRouter / OpenAI / Gemini" : "Add keys for live models"}
          icon={data.aiProviderConfigured ? "ri-shield-check-line" : "ri-shield-flash-line"}
          iconBg={data.aiProviderConfigured ? "bg-emerald-500/10" : "bg-red-500/10"}
          iconColor={data.aiProviderConfigured ? "text-emerald-500" : "text-red-500"}
          tone={data.aiProviderConfigured ? "success" : "danger"}
        />
      </div>

      <SectionCard>
        <SectionHeader
          icon="ri-line-chart-line"
          iconBg="bg-blue-500/10"
          iconColor="text-blue-500"
          title={`CRM activity signals (${rd}d)`}
          divider={false}
          description="CRM interaction counts for the selected window — context for demand, not token usage."
        />
        <div className="grid gap-2 border-t border-input px-5 py-4 sm:grid-cols-3">
          <div className="rounded-lg border border-input bg-muted/20 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <i className="ri-mail-send-line text-sm text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Email interactions</p>
            </div>
            <p className="mt-1 text-lg font-semibold tabular-nums">{data.crm.email.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-input bg-muted/20 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <i className="ri-draft-line text-sm text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Proposal interactions</p>
            </div>
            <p className="mt-1 text-lg font-semibold tabular-nums">{data.crm.proposal.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-input bg-muted/20 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <i className="ri-sticky-note-line text-sm text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Notes interactions</p>
            </div>
            <p className="mt-1 text-lg font-semibold tabular-nums">{data.crm.note.toLocaleString()}</p>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard>
          <SectionHeader
            icon="ri-stack-line"
            iconBg="bg-blue-500/10"
            iconColor="text-blue-500"
            title={`API volume by surface (${rd}d)`}
            divider={false}
            description="Traffic to chat, email writer, and AI reports backends."
          />
          <div className="space-y-2 border-t border-input px-5 py-4">
            {(["chat", "email", "reports"] as const).map((s) => {
              const row = surfaceRows[s]
              return (
                <div
                  key={s}
                  className="flex items-center justify-between gap-3 rounded-xl border border-input bg-muted/20 px-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                      <i className={cn(row.icon, "text-sm text-blue-500")} />
                    </span>
                    <span className="truncate text-sm font-medium">{row.label}</span>
                  </div>
                  <div className="shrink-0 text-right text-xs tabular-nums">
                    <span className="font-semibold">{data.api.bySurface30d[s].toLocaleString()}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {cd}d {data.api.bySurface7d[s].toLocaleString()}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </SectionCard>

        <SectionCard>
          <SectionHeader
            icon="ri-database-2-line"
            iconBg="bg-violet-500/10"
            iconColor="text-violet-500"
            title={`Models (${rd}d)`}
            description="Calls that recorded a model id."
          />
          <div className="space-y-2 border-t border-input px-5 py-4">
            {data.models.length === 0 && (
              <div className="rounded-xl border border-dashed border-input bg-muted/20 px-4 py-8 text-center">
                <i className="ri-inbox-line mb-2 text-2xl text-muted-foreground" />
                <p className="text-sm font-medium">No model metadata yet</p>
                <p className="mt-1 text-xs text-muted-foreground">Appears after live provider calls record a model.</p>
              </div>
            )}
            {data.models.map((m) => (
              <div
                key={m.model}
                className="flex items-center justify-between gap-3 rounded-xl border border-input bg-muted/20 px-3 py-2.5"
              >
                <span className="truncate font-mono text-xs">{m.model}</span>
                <Badge variant="outline" className="tabular-nums">
                  {m.calls30d}
                </Badge>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <Card className="border border-input bg-card shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10">
              <i className="ri-bar-chart-2-line text-sm text-emerald-600 dark:text-emerald-400" />
            </span>
            <div>
              <CardTitle className="text-base">{rd}-day assistant activity</CardTitle>
              <CardDescription className="text-xs">
                Daily totals for the selected range. API stacks = /api/ai/* · Lighter stacks = page views via /api/ai/page-view
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-2 sm:px-6">
          <ChartContainer config={chartConfig} className="aspect-auto h-[320px] w-full">
            <BarChart data={data.activityByDay} margin={{ left: 4, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 4" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={12} />
              <YAxis width={36} tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip cursor={{ fill: "hsl(var(--muted) / 0.25)" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="apiChat" stackId="api" fill="var(--color-apiChat)" radius={[0, 0, 0, 0]} maxBarSize={48} />
              <Bar dataKey="apiEmail" stackId="api" fill="var(--color-apiEmail)" radius={[0, 0, 0, 0]} maxBarSize={48} />
              <Bar dataKey="apiReports" stackId="api" fill="var(--color-apiReports)" radius={[4, 4, 0, 0]} maxBarSize={48} />
              <Bar dataKey="viewsChat" stackId="views" fill="var(--color-viewsChat)" radius={[0, 0, 0, 0]} maxBarSize={48} />
              <Bar dataKey="viewsEmail" stackId="views" fill="var(--color-viewsEmail)" radius={[0, 0, 0, 0]} maxBarSize={48} />
              <Bar dataKey="viewsReports" stackId="views" fill="var(--color-viewsReports)" radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <SectionCard>
        <SectionHeader
          icon="ri-time-line"
          iconBg="bg-blue-500/10"
          iconColor="text-blue-500"
          title="Assistant activity log"
          divider={false}
          description={`Most recent telemetry in the selected window (up to ${logStats.total} rows, capped at 200). Timestamps are relative until they are older than a week.`}
        />
        <div className="space-y-4 border-t border-input px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-input bg-muted/30 px-2.5 py-1 text-[11px] font-medium tabular-nums text-muted-foreground">
                <i className="ri-flashlight-line text-xs text-blue-500" />
                API {logStats.api.toLocaleString()}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-input bg-muted/30 px-2.5 py-1 text-[11px] font-medium tabular-nums text-muted-foreground">
                <i className="ri-eye-line text-xs text-emerald-600 dark:text-emerald-400" />
                Page views {logStats.pageView.toLocaleString()}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-input px-2.5 py-1 text-[11px] tabular-nums text-muted-foreground">
                Showing {filteredRecent.length.toLocaleString()}
                {filteredRecent.length !== logStats.total ? ` of ${logStats.total.toLocaleString()}` : ""}
              </span>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <ToggleGroup
                multiple={false}
                value={logFilter ? [logFilter] : []}
                onValueChange={(value) => {
                  const next = value[0]
                  if (next === "all" || next === "api" || next === "page_view") setLogFilter(next)
                }}
                variant="outline"
                size="sm"
                spacing={0}
                className="shrink-0"
              >
                <ToggleGroupItem value="all" className="text-xs">
                  All
                </ToggleGroupItem>
                <ToggleGroupItem value="api" className="text-xs">
                  API only
                </ToggleGroupItem>
                <ToggleGroupItem value="page_view" className="text-xs">
                  Views only
                </ToggleGroupItem>
              </ToggleGroup>
              <Input
                placeholder="Filter by user or email…"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="h-8 w-full text-xs sm:w-[200px]"
                aria-label="Filter activity log by user"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-input bg-muted/10">
            <div className="max-h-[min(70vh,36rem)] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 border-b border-input bg-card/95 shadow-[0_1px_0_hsl(var(--border))] backdrop-blur-sm [&_tr]:border-0">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[7rem] text-[10px] uppercase tracking-wide text-muted-foreground">When</TableHead>
                    <TableHead className="min-w-[8rem] text-[10px] uppercase tracking-wide text-muted-foreground">User</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wide text-muted-foreground">Type</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wide text-muted-foreground">Surface</TableHead>
                    <TableHead className="text-right text-[10px] uppercase tracking-wide text-muted-foreground">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecent.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-16 text-center">
                        <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                          <span className="flex size-12 items-center justify-center rounded-full bg-muted/50">
                            <i className="ri-inbox-2-line text-2xl text-muted-foreground" />
                          </span>
                          <p className="text-sm font-medium">No events match</p>
                          <p className="text-xs text-muted-foreground">
                            {logStats.total === 0
                              ? `Nothing logged in the last ${rd} days yet.`
                              : "Try clearing the filter or search."}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredRecent.map((r, i) => (
                    <TableRow
                      key={r.id}
                      className={cn(
                        "border-b border-input/60 last:border-0",
                        i % 2 === 0 ? "bg-transparent" : "bg-muted/15"
                      )}
                    >
                      <TableCell className="align-top text-xs tabular-nums text-muted-foreground">
                        <time dateTime={r.at} title={new Date(r.at).toLocaleString()}>
                          {formatLogWhen(r.at)}
                        </time>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium leading-snug">{r.userName}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{r.userEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-normal",
                            r.eventType === "api"
                              ? "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                              : "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                          )}
                        >
                          {eventLabel(r.eventType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-top text-xs">{surfaceLabel(r.surface)}</TableCell>
                      <TableCell className="align-top text-right">
                        {r.eventType === "api" && (
                          <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                            {r.mock && (
                              <Badge variant="secondary" className="text-[10px] font-normal text-amber-700 dark:text-amber-400">
                                mock
                              </Badge>
                            )}
                            {r.model && <span className="max-w-[140px] truncate font-mono">{r.model}</span>}
                            {r.totalTokens != null && r.totalTokens > 0 && (
                              <span className="tabular-nums">{r.totalTokens.toLocaleString()} tok</span>
                            )}
                            {r.durationMs != null && r.durationMs > 0 && (
                              <span className="tabular-nums">{r.durationMs.toLocaleString()} ms</span>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </SectionCard>

      <Card className="border border-input bg-card shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10">
              <i className="ri-user-star-line text-sm text-blue-500" />
            </span>
            <div>
              <CardTitle className="text-base">Top API users ({rd}d)</CardTitle>
              <CardDescription className="text-xs">By AI completions across chat, email, and reports.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="text-right">Calls</TableHead>
                <TableHead className="text-right">Tokens (sum)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.topUsers30d.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-xs text-muted-foreground">
                    No API usage in the selected window.
                  </TableCell>
                </TableRow>
              )}
              {data.topUsers30d.map((u) => (
                <TableRow key={u.userId}>
                  <TableCell>
                    <div>
                      <p className="font-medium leading-none">{u.name || "—"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{u.email || u.userId}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{u.apiCalls.toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums">{u.tokens.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
