"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import { formatCents } from "@/lib/money"
import { cn } from "@/lib/utils"

import { AnalyticsError, AnalyticsLoading, SectionCard, SectionHeader } from "../_components/analytics-page-shell"
import { useAnalyticsOverview } from "../use-analytics-overview"

const chartConfig = {
  revenue:  { label: "Revenue collected", color: "hsl(142 70% 45%)" },
  expenses: { label: "Expenses",          color: "hsl(0 72% 51%)"   },
} satisfies ChartConfig

function shortMonth(key: string) {
  const [y, m] = key.split("-").map(Number)
  if (!y || !m) return key
  return new Date(y, m - 1, 1).toLocaleString(undefined, { month: "short", year: "numeric" })
}

export default function AnalyticsRevenuePage() {
  const { data, isLoading, isError } = useAnalyticsOverview()
  const [range, setRange] = React.useState<"6m" | "3m">("6m")

  if (isLoading) return <SectionCard><AnalyticsLoading message="Loading revenue…" /></SectionCard>
  if (isError || !data) return <SectionCard><AnalyticsError message="Could not load revenue analytics." /></SectionCard>

  const { finance, revenueExpenseSeries } = data

  const series   = range === "3m" ? revenueExpenseSeries.slice(-3) : revenueExpenseSeries
  const chartData = series.map((row) => ({
    label:    shortMonth(row.month),
    revenue:  row.revenueCents  / 100,
    expenses: row.expensesCents / 100,
  }))

  const totalRevCents  = series.reduce((s, r) => s + r.revenueCents, 0)
  const totalExpCents  = series.reduce((s, r) => s + r.expensesCents, 0)
  const netCents       = totalRevCents - totalExpCents

  return (
    <div className="flex flex-col gap-4">

      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-3">
        <MiniKpi label="MTD collected" value={formatCents(finance.revenueMtdCents)} highlight />
        <MiniKpi label="MTD expenses"  value={formatCents(finance.expensesMtdCents)} />
        <MiniKpi label="MTD net"       value={formatCents(finance.netMtdCents)} highlight={finance.netMtdCents >= 0} danger={finance.netMtdCents < 0} />
      </div>

      {/* Area trend — same pattern as overview-finance-chart */}
      <Card className="border border-input bg-card shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10">
              <i className="ri-bar-chart-2-line text-sm text-emerald-600 dark:text-emerald-400" />
            </span>
            <div>
              <CardTitle className="text-base">Revenue &amp; expenses trend</CardTitle>
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
          {/* Legend pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-600 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500" /> Revenue {formatCents(totalRevCents)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-red-600 dark:text-red-400">
              <span className="size-1.5 rounded-full bg-red-500" /> Expenses {formatCents(totalExpCents)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-foreground">
              Net {formatCents(netCents)}
            </span>
          </div>
          <ChartContainer config={chartConfig} className="aspect-auto h-[290px] w-full">
            <AreaChart data={chartData} margin={{ left: 8, right: 8 }}>
              <defs>
                <linearGradient id="fillRev2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--color-revenue)"  stopOpacity={0.9} />
                  <stop offset="95%" stopColor="var(--color-revenue)"  stopOpacity={0.08} />
                </linearGradient>
                <linearGradient id="fillExp2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--color-expenses)" stopOpacity={0.75} />
                  <stop offset="95%" stopColor="var(--color-expenses)" stopOpacity={0.08} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 4" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
              <YAxis width={56} tickLine={false} axisLine={false} tickMargin={4}
                tickFormatter={(v) => (typeof v === "number" ? `${Math.round(v)}` : String(v))} />
              <Area dataKey="revenue"  type="natural" fill="url(#fillRev2)" stroke="var(--color-revenue)"  strokeWidth={2} />
              <Area dataKey="expenses" type="natural" fill="url(#fillExp2)" stroke="var(--color-expenses)" strokeWidth={2} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Monthly breakdown table */}
      <SectionCard>
        <SectionHeader icon="ri-table-line" title="Monthly breakdown" description="Revenue, expenses, and net by calendar month" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-input bg-muted/30 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                <th className="px-5 py-3">Month</th>
                <th className="px-4 py-3 text-right">Revenue</th>
                <th className="px-4 py-3 text-right">Expenses</th>
                <th className="px-5 py-3 text-right">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-input">
              {revenueExpenseSeries.map((row) => {
                const net = row.revenueCents - row.expensesCents
                return (
                  <tr key={row.month} className="transition hover:bg-muted/40">
                    <td className="px-5 py-3">{shortMonth(row.month)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">{formatCents(row.revenueCents)}</td>
                    <td className="px-4 py-3 text-right">{formatCents(row.expensesCents)}</td>
                    <td className={cn("px-5 py-3 text-right font-medium", net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400")}>
                      {formatCents(net)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}

function MiniKpi({ label, value, highlight, danger }: { label: string; value: string; highlight?: boolean; danger?: boolean }) {
  return (
    <div className={cn("rounded-2xl border bg-card p-4 shadow-sm",
      danger    ? "border-red-500/20 bg-red-500/5" :
      highlight ? "border-emerald-500/20 bg-emerald-500/5" :
      "border-input"
    )}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-xl font-semibold tracking-tight">{value}</p>
    </div>
  )
}
