"use client"

import * as React from "react"
import Link from "next/link"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { InvoiceStatusBadge } from "@/components/finance/status-badges"
import {
  Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart"
import { formatCents } from "@/lib/money"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { AnalyticsError, AnalyticsLoading, SectionCard, SectionHeader } from "./_components/analytics-page-shell"
import { useAnalyticsOverview } from "./use-analytics-overview"

const revenueChartConfig = {
  revenue: { label: "Revenue collected", color: "hsl(142 70% 45%)" },
  expenses: { label: "Expenses", color: "hsl(0 72% 51%)" },
} satisfies ChartConfig

const contactsChartConfig = {
  count: { label: "Contacts", color: "hsl(217 91% 60%)" },
} satisfies ChartConfig

function shortMonth(key: string) {
  const [y, m] = key.split("-").map(Number)
  if (!y || !m) return key
  return new Date(y, m - 1, 1).toLocaleString(undefined, { month: "short", year: "2-digit" })
}

export default function AnalyticsOverviewPage() {
  const { data, isLoading, isError } = useAnalyticsOverview()
  const [range, setRange] = React.useState<"6m" | "3m">("6m")

  if (isLoading) return <SectionCard><AnalyticsLoading message="Loading analytics…" /></SectionCard>
  if (isError || !data) return <SectionCard><AnalyticsError message="Unable to load analytics. Refresh and try again." /></SectionCard>

  const { finance, revenueExpenseSeries, clientsByStatus, projectsByStatus, productivity, forecast } = data

  const series = range === "3m" ? revenueExpenseSeries.slice(-3) : revenueExpenseSeries
  const chartData = series.map((row) => ({
    label: shortMonth(row.month),
    revenue: row.revenueCents / 100,
    expenses: row.expensesCents / 100,
  }))

  const totalRevCents  = series.reduce((s, r) => s + r.revenueCents, 0)
  const totalExpCents  = series.reduce((s, r) => s + r.expensesCents, 0)
  const netCents       = totalRevCents - totalExpCents

  const contactChartData = Object.entries(clientsByStatus)
    .map(([status, count]) => ({ status: status.replace(/_/g, " "), count }))
    .sort((a, b) => b.count - a.count)

  return (
    <div className="flex flex-col gap-4">

      {/* KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Outstanding AR"   value={formatCents(finance.outstandingCents)}  hint="Open invoice balance"       icon="ri-file-text-line"          iconBg="bg-blue-500/10"    iconColor="text-blue-500" />
        <KpiCard title="Revenue (MTD)"    value={formatCents(finance.revenueMtdCents)}   hint="Cash collected"             icon="ri-money-dollar-circle-line" iconBg="bg-emerald-500/10" iconColor="text-emerald-500" tone="success" />
        <KpiCard title="Net (MTD)"        value={formatCents(finance.netMtdCents)}        hint="Revenue minus expenses"     icon="ri-line-chart-line"          iconBg={finance.netMtdCents >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"} iconColor={finance.netMtdCents >= 0 ? "text-emerald-500" : "text-red-500"} tone={finance.netMtdCents >= 0 ? "success" : "danger"} />
        <KpiCard title="Contacts"         value={String(productivity.totalClients)}       hint={`${productivity.pipelineContacts} in pipeline`} icon="ri-group-line"           iconBg="bg-blue-500/10"    iconColor="text-blue-500" />
      </div>

      {/* Revenue vs Expenses — area chart matching overview style */}
      <Card className="border border-input bg-card shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10">
              <i className="ri-bar-chart-2-line text-sm text-emerald-600 dark:text-emerald-400" />
            </span>
            <div>
              <CardTitle className="text-base">Revenue &amp; expenses</CardTitle>
              <CardDescription className="text-xs">Cash collected on invoices vs recorded expenses</CardDescription>
            </div>
          </div>
          <CardAction>
            <div className="flex gap-1.5">
              {(["6m", "3m"] as const).map((v) => (
                <button key={v} type="button" onClick={() => setRange(v)}
                  className={cn("rounded-lg border px-3 py-1 text-xs font-medium transition",
                    range === v
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-input bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}>
                  {v === "6m" ? "6 months" : "3 months"}
                </button>
              ))}
            </div>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-3 px-2 pt-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-600 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Revenue {formatCents(totalRevCents)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-red-600 dark:text-red-400">
              <span className="size-1.5 rounded-full bg-red-500" />
              Expenses {formatCents(totalExpCents)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-foreground">
              Net {formatCents(netCents)}
            </span>
          </div>
          <ChartContainer config={revenueChartConfig} className="aspect-auto h-[260px] w-full">
            <AreaChart data={chartData} margin={{ left: 8, right: 8 }}>
              <defs>
                <linearGradient id="fillRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--color-revenue)"  stopOpacity={0.9} />
                  <stop offset="95%" stopColor="var(--color-revenue)"  stopOpacity={0.08} />
                </linearGradient>
                <linearGradient id="fillExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--color-expenses)" stopOpacity={0.75} />
                  <stop offset="95%" stopColor="var(--color-expenses)" stopOpacity={0.08} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 4" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
              <YAxis width={56} tickLine={false} axisLine={false} tickMargin={4}
                tickFormatter={(v) => (typeof v === "number" ? `${Math.round(v)}` : String(v))} />
              <ChartTooltip cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const row = payload[0]?.payload as { label?: string; revenue?: number; expenses?: number }
                  if (!row?.label) return null
                  return (
                    <div className="grid min-w-40 gap-1.5 rounded-lg border border-border/60 bg-background px-2.5 py-2 text-xs shadow-lg">
                      <p className="font-medium">{row.label}</p>
                      <p className="flex justify-between gap-4 text-muted-foreground">
                        <span className="text-emerald-600 dark:text-emerald-400">Revenue</span>
                        <span className="font-mono text-foreground tabular-nums">{formatCents(Math.round((row.revenue ?? 0) * 100))}</span>
                      </p>
                      <p className="flex justify-between gap-4 text-muted-foreground">
                        <span className="text-red-600 dark:text-red-400">Expenses</span>
                        <span className="font-mono text-foreground tabular-nums">{formatCents(Math.round((row.expenses ?? 0) * 100))}</span>
                      </p>
                    </div>
                  )
                }} />
              <Area dataKey="revenue" type="natural" fill="url(#fillRev)" stroke="var(--color-revenue)" strokeWidth={2} />
              <Area dataKey="expenses" type="natural" fill="url(#fillExp)" stroke="var(--color-expenses)" strokeWidth={2} />
            </AreaChart>
          </ChartContainer>
          <div className="flex justify-end">
            <Link href="/dashboard/analytics/revenue" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 text-xs")}>
              Revenue details →
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Contacts by status chart */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border border-input bg-card shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10">
                <i className="ri-group-line text-sm text-blue-600 dark:text-blue-400" />
              </span>
              <div>
                <CardTitle className="text-base">Contacts by status</CardTitle>
                <CardDescription className="text-xs">Sales funnel mix</CardDescription>
              </div>
            </div>
            <CardAction>
              <Link href="/dashboard/analytics/clients" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 text-xs")}>
                Analyse →
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="px-2 pt-2 sm:px-6">
            {contactChartData.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">No contacts yet.</p>
            ) : (
              <ChartContainer config={contactsChartConfig} className="aspect-auto h-[220px] w-full">
                <BarChart data={contactChartData} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="status" width={90} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <ChartTooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div className="rounded-lg border border-border/60 bg-background px-2.5 py-2 text-xs shadow-lg">
                        <p className="font-medium">{payload[0]?.payload?.status}</p>
                        <p className="text-muted-foreground">Count: <span className="font-mono text-foreground">{payload[0]?.value}</span></p>
                      </div>
                    )
                  }} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} maxBarSize={24} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Invoice pipeline + mini stats */}
        <div className="flex flex-col gap-4">
          <SectionCard>
            <SectionHeader icon="ri-bar-chart-grouped-line" iconBg="bg-blue-500/10" iconColor="text-blue-500" title="Invoice pipeline" description={`${finance.invoiceCount} invoices`} />
            <div className="flex flex-wrap gap-2 px-5 py-3">
              {Object.entries(finance.statusBreakdown).map(([k, v]) => (
                <span key={k} className="inline-flex items-center gap-1.5 rounded-full border border-input bg-muted/15 px-2.5 py-1 text-xs">
                  <InvoiceStatusBadge status={k} />
                  <span className="text-muted-foreground">{v}</span>
                </span>
              ))}
              {Object.keys(finance.statusBreakdown).length === 0 && <p className="text-xs text-muted-foreground">No invoices yet.</p>}
            </div>
          </SectionCard>

          <SectionCard>
            <SectionHeader icon="ri-briefcase-line" iconBg="bg-amber-500/10" iconColor="text-amber-600" title="Projects & activity" description="Last 30 days" action={
              <Link href="/dashboard/analytics/productivity" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 text-xs")}>Details →</Link>
            } />
            <div className="divide-y divide-input px-5 py-1">
              <div className="flex items-center justify-between py-2 text-sm">
                <span className="text-muted-foreground">Logged interactions</span>
                <span className="font-semibold">{productivity.interactionsLast30Days}</span>
              </div>
              {Object.entries(projectsByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-muted-foreground">{status.replace(/_/g, " ")}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
              {Object.keys(projectsByStatus).length === 0 && <p className="py-2 text-xs text-muted-foreground">No projects yet.</p>}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Forecast teaser */}
      <SectionCard className="border-violet-500/30 bg-violet-500/5">
        <SectionHeader
          icon="ri-magic-line" iconBg="bg-violet-500/15" iconColor="text-violet-600 dark:text-violet-400"
          title="Simple forecast" description={`Avg of last ${forecast.basedOnMonths || 0} months with payments`}
          action={<Link href="/dashboard/analytics/forecast" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs")}>Forecast workspace →</Link>}
        />
        <div className="px-5 py-4">
          <p className="text-2xl font-semibold tracking-tight">{formatCents(forecast.nextMonthRevenueCents)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Projected next-month revenue · heuristic from invoice payments.</p>
        </div>
      </SectionCard>
    </div>
  )
}

function KpiCard({ title, value, hint, icon, iconBg, iconColor, tone = "default" }: {
  title: string; value: string; hint: string
  icon: string; iconBg: string; iconColor: string
  tone?: "default" | "success" | "danger"
}) {
  return (
    <div className={cn("rounded-2xl border bg-card p-4 shadow-sm",
      tone === "danger"  ? "border-red-500/20 bg-red-500/5" :
      tone === "success" ? "border-emerald-500/20 bg-emerald-500/5" :
      "border-input"
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", iconBg)}>
          <i className={cn(icon, iconColor, "text-lg")} />
        </span>
      </div>
    </div>
  )
}
