"use client"

import Link from "next/link"
import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart"
import { cn } from "@/lib/utils"
import { useAdminDashboard } from "./use-admin-dashboard"

const actionCards = [
  { title: "Manage users", description: "Search users, soft delete, and trigger password reset links.", href: "/dashboard/admin/users", icon: "ri-user-settings-line", iconBg: "bg-blue-500/10", iconColor: "text-blue-600 dark:text-blue-400" },
  { title: "Monitor logs", description: "Client telemetry, filters, and operational incidents in one place.", href: "/dashboard/admin/logs", icon: "ri-bug-line", iconBg: "bg-rose-500/10", iconColor: "text-rose-600 dark:text-rose-400" },
  { title: "Survey center", description: "Review satisfaction signals and feedback trends.", href: "/dashboard/admin/surveys", icon: "ri-survey-line", iconBg: "bg-emerald-500/10", iconColor: "text-emerald-600 dark:text-emerald-400" },
  { title: "AI analytics", description: "Inspect feature adoption, AI request quality, and failures.", href: "/dashboard/admin/ai-analytics", icon: "ri-cpu-line", iconBg: "bg-violet-500/10", iconColor: "text-violet-600 dark:text-violet-400" },
  { title: "System status", description: "Health checks, dependencies, and snapshot history.", href: "/dashboard/admin/status", icon: "ri-pulse-line", iconBg: "bg-cyan-500/10", iconColor: "text-cyan-600 dark:text-cyan-400" },
  { title: "Reports", description: "Scheduled admin exports and manual report runs.", href: "/dashboard/admin/reports", icon: "ri-file-chart-line", iconBg: "bg-amber-500/10", iconColor: "text-amber-700 dark:text-amber-400" },
] as const

const kpiVisuals = [
  { icon: "ri-team-line", iconBg: "bg-blue-500/10", iconColor: "text-blue-600 dark:text-blue-400" },
  { icon: "ri-user-forbid-line", iconBg: "bg-amber-500/10", iconColor: "text-amber-600 dark:text-amber-400" },
  { icon: "ri-bill-line", iconBg: "bg-rose-500/10", iconColor: "text-rose-600 dark:text-rose-400" },
  { icon: "ri-chat-poll-line", iconBg: "bg-emerald-500/10", iconColor: "text-emerald-600 dark:text-emerald-400" },
] as const

const adminChartConfig = {
  signups: { label: "Signups", color: "hsl(217 91% 60%)" },
  surveys: { label: "Surveys", color: "hsl(142 70% 45%)" },
  alerts: { label: "Alerts", color: "hsl(0 72% 51%)" },
} satisfies ChartConfig

export default function AdminOverviewPage() {
  const { data, isLoading, isError } = useAdminDashboard()

  const kpis = data
    ? [
        {
          label: "Total app users",
          value: data.overview.totalUsers.toLocaleString(),
          delta: `+${data.overview.newUsers30d} new in 30d`,
          tone: "text-emerald-600 dark:text-emerald-400",
        },
        {
          label: "Soft-deleted users",
          value: data.overview.softDeletedUsers.toLocaleString(),
          delta: `${data.overview.activeUsers.toLocaleString()} active users`,
          tone: "text-amber-600 dark:text-amber-400",
        },
        {
          label: "Overdue invoices",
          value: data.overview.overdueInvoices.toLocaleString(),
          delta: "Needs collection follow-up",
          tone: "text-rose-600 dark:text-rose-400",
        },
        {
          label: "Survey responses",
          value: data.overview.surveyCompleted.toLocaleString(),
          delta: `${data.overview.responseRate}% completion rate`,
          tone: "text-blue-600 dark:text-blue-400",
        },
      ]
    : []

  if (isLoading) {
    return <div className="rounded-xl border border-input bg-card p-6 text-sm text-muted-foreground">Loading admin data…</div>
  }
  if (isError || !data) {
    return <div className="rounded-xl border border-input bg-card p-6 text-sm text-destructive">Unable to load admin data.</div>
  }

  const chartData = data.series.signupsByDay.map((d, idx) => ({
    label: d.label,
    signups: d.count,
    surveys: data.series.surveysByDay[idx]?.count ?? 0,
    alerts: data.series.alertsByDay[idx]?.count ?? 0,
  }))

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi, idx) => {
          const vis = kpiVisuals[idx] ?? kpiVisuals[0]
          return (
            <Card key={kpi.label} className="border border-input bg-card shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="min-w-0 space-y-1">
                  <CardDescription className="text-xs">{kpi.label}</CardDescription>
                  <CardTitle className="text-2xl tabular-nums">{kpi.value}</CardTitle>
                </div>
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", vis.iconBg)} aria-hidden>
                  <i className={cn(vis.icon, vis.iconColor, "text-lg leading-none")} />
                </span>
              </CardHeader>
              <CardContent className="pt-0">
                <p className={`text-xs font-medium ${kpi.tone}`}>{kpi.delta}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border border-input bg-card shadow-sm lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
                  <i className="ri-bar-chart-2-line text-lg text-blue-600 dark:text-blue-400" aria-hidden />
                </span>
                <div>
                  <CardTitle className="text-base">Admin analytics</CardTitle>
                  <CardDescription className="text-xs">Last 14 days: signups, surveys, and operational alerts.</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="shrink-0">
                <i className="ri-line-chart-line mr-1 text-xs opacity-70" aria-hidden />
                {data.overview.newUsers7d} signups · {data.aiAnalytics.interactions7d} interactions (7d)
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ChartContainer config={adminChartConfig} className="aspect-auto h-[280px] w-full">
              <AreaChart data={chartData} margin={{ left: 8, right: 8 }}>
                <defs>
                  <linearGradient id="fillSignups" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-signups)" stopOpacity={0.65} />
                    <stop offset="95%" stopColor="var(--color-signups)" stopOpacity={0.08} />
                  </linearGradient>
                  <linearGradient id="fillSurveys" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-surveys)" stopOpacity={0.55} />
                    <stop offset="95%" stopColor="var(--color-surveys)" stopOpacity={0.08} />
                  </linearGradient>
                  <linearGradient id="fillAlerts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-alerts)" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="var(--color-alerts)" stopOpacity={0.06} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 4" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
                <YAxis width={36} tickLine={false} axisLine={false} tickMargin={4} allowDecimals={false} />
                <ChartTooltip
                  cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const row = payload[0]?.payload as { label?: string; signups?: number; surveys?: number; alerts?: number }
                    if (!row?.label) return null
                    return (
                      <div className="grid min-w-44 gap-1.5 rounded-lg border border-border/60 bg-background px-2.5 py-2 text-xs shadow-lg">
                        <p className="font-medium">{row.label}</p>
                        <p className="flex justify-between gap-4 text-muted-foreground">
                          <span className="text-blue-600 dark:text-blue-400">Signups</span>
                          <span className="font-mono text-foreground tabular-nums">{row.signups ?? 0}</span>
                        </p>
                        <p className="flex justify-between gap-4 text-muted-foreground">
                          <span className="text-emerald-600 dark:text-emerald-400">Surveys</span>
                          <span className="font-mono text-foreground tabular-nums">{row.surveys ?? 0}</span>
                        </p>
                        <p className="flex justify-between gap-4 text-muted-foreground">
                          <span className="text-red-600 dark:text-red-400">Alerts</span>
                          <span className="font-mono text-foreground tabular-nums">{row.alerts ?? 0}</span>
                        </p>
                      </div>
                    )
                  }}
                />
                <Area dataKey="signups" type="monotone" fill="url(#fillSignups)" stroke="var(--color-signups)" strokeWidth={2} />
                <Area dataKey="surveys" type="monotone" fill="url(#fillSurveys)" stroke="var(--color-surveys)" strokeWidth={2} />
                <Area dataKey="alerts" type="monotone" fill="url(#fillAlerts)" stroke="var(--color-alerts)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>

            <div className="grid gap-3 sm:grid-cols-2">
              {actionCards.map((card) => (
                <Link
                  key={card.title}
                  href={card.href}
                  className="group rounded-xl border border-input bg-muted/20 p-3.5 transition hover:border-primary/40 hover:bg-primary/[0.05]"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl transition group-hover:scale-[1.02]",
                        card.iconBg
                      )}
                    >
                      <i className={cn(card.icon, card.iconColor, "text-lg leading-none")} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold">{card.title}</p>
                        <i className="ri-arrow-right-s-line shrink-0 text-base text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
                      </div>
                      <p className="mt-1 text-xs leading-snug text-muted-foreground">{card.description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-input bg-card shadow-sm">
          <CardHeader>
            <div className="flex items-start gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <i className="ri-shield-check-line text-lg text-primary" aria-hidden />
              </span>
              <div>
                <CardTitle className="text-base">Release quality</CardTitle>
                <CardDescription className="text-xs">Current state of admin-relevant app health.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <StatusRow
              icon="ri-lock-password-line"
              label="Authentication services"
              score={data.overview.releaseQuality.authHealth}
              status={healthLabel(data.overview.releaseQuality.authHealth)}
            />
            <StatusRow
              icon="ri-questionnaire-line"
              label="Survey processing"
              score={data.overview.releaseQuality.surveyHealth}
              status={healthLabel(data.overview.releaseQuality.surveyHealth)}
            />
            <StatusRow
              icon="ri-settings-3-line"
              label="Runtime operations"
              score={data.overview.releaseQuality.runtimeHealth}
              status={healthLabel(data.overview.releaseQuality.runtimeHealth)}
            />
            <div className="flex items-center gap-2 pt-1">
              <Badge variant="outline">
                <i className="ri-time-line mr-1 text-xs opacity-70" aria-hidden />
                Last audit: {new Date(data.generatedAt).toLocaleString()}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function healthLabel(score: number) {
  if (score >= 90) return "Healthy"
  if (score >= 70) return "Stable"
  return "Watch"
}

function StatusRow({ icon, label, score, status }: { icon: string; label: string; score: number; status: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
          <i className={cn(icon, "shrink-0 text-sm text-primary/80")} aria-hidden />
          <span className="truncate">{label}</span>
        </span>
        <span className="shrink-0 font-medium tabular-nums">
          {score}% · {status}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}
