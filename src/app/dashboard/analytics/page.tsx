"use client"

import Link from "next/link"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Loader2 } from "lucide-react"

import { InvoiceStatusBadge } from "@/components/finance/status-badges"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { formatCents } from "@/lib/money"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { useAnalyticsOverview } from "./use-analytics-overview"

const chartConfig = {
  revenue: { label: "Revenue", color: "hsl(142 70% 45%)" },
  expenses: { label: "Expenses", color: "hsl(0 72% 51%)" },
} satisfies ChartConfig

function shortMonth(key: string) {
  const [y, m] = key.split("-").map(Number)
  if (!y || !m) return key
  return new Date(y, m - 1, 1).toLocaleString(undefined, { month: "short", year: "2-digit" })
}

export default function AnalyticsOverviewPage() {
  const { data, isLoading, isError } = useAnalyticsOverview()

  if (isLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" />
        Loading analytics…
      </div>
    )
  }

  if (isError || !data) {
    return (
      <p className="text-sm text-muted-foreground">Unable to load analytics. Refresh and try again.</p>
    )
  }

  const { finance, revenueExpenseSeries, clientsByStatus, projectsByStatus, productivity, forecast } = data

  const chartData = revenueExpenseSeries.map((row) => ({
    ...row,
    label: shortMonth(row.month),
    revenue: row.revenueCents,
    expenses: row.expensesCents,
  }))

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi title="Outstanding AR" value={formatCents(finance.outstandingCents)} hint="Open invoice balance" />
        <Kpi title="Revenue (MTD)" value={formatCents(finance.revenueMtdCents)} hint="Cash collected" tone="success" />
        <Kpi title="Net (MTD)" value={formatCents(finance.netMtdCents)} hint="vs expenses" tone={finance.netMtdCents >= 0 ? "success" : "danger"} />
        <Kpi title="Contacts" value={String(productivity.totalClients)} hint={`${productivity.pipelineContacts} in pipeline`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-input">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Revenue vs expenses</CardTitle>
            <CardDescription>Last 6 months (paid invoices vs recorded expenses)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="aspect-[16/9] max-h-[280px] w-full">
              <BarChart data={chartData} margin={{ left: 4, right: 4, top: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={52}
                  tickFormatter={(v) => (typeof v === "number" ? `${Math.round(v / 100)}` : String(v))}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => (
                        <span className="font-medium">
                          {name === "revenue" ? "Revenue" : "Expenses"}: {formatCents(Number(value))}
                        </span>
                      )}
                    />
                  }
                />
                <Bar name="revenue" dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar name="expenses" dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ChartContainer>
            <div className="mt-2 flex justify-end">
              <Link href="/dashboard/analytics/revenue" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 text-xs")}>
                Revenue details →
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border-input">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Invoice pipeline</CardTitle>
            <CardDescription>{finance.invoiceCount} invoices in workspace</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Object.entries(finance.statusBreakdown).map(([k, v]) => (
              <span
                key={k}
                className="inline-flex items-center gap-1.5 rounded-full border border-input bg-muted/15 px-2 py-1"
              >
                <InvoiceStatusBadge status={k} />
                <span className="text-xs text-muted-foreground">{v}</span>
              </span>
            ))}
            {Object.keys(finance.statusBreakdown).length === 0 ? (
              <p className="text-xs text-muted-foreground">No invoices yet.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-input">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Contacts by status</CardTitle>
            <CardDescription>Sales funnel mix</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(clientsByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{status.replace(/_/g, " ")}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
            {Object.keys(clientsByStatus).length === 0 ? (
              <p className="text-xs text-muted-foreground">No contacts yet.</p>
            ) : null}
            <Link href="/dashboard/analytics/clients" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mt-2 h-7 text-xs")}>
              Contact analytics →
            </Link>
          </CardContent>
        </Card>

        <Card className="border-input">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Projects & activity</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Logged interactions</span>
              <span className="font-semibold">{productivity.interactionsLast30Days}</span>
            </div>
            {Object.entries(projectsByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{status.replace(/_/g, " ")}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
            {Object.keys(projectsByStatus).length === 0 ? (
              <p className="text-xs text-muted-foreground">No projects yet.</p>
            ) : null}
            <Link
              href="/dashboard/analytics/productivity"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 text-xs")}
            >
              Productivity →
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-violet-500/20 bg-violet-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Simple forecast</CardTitle>
          <CardDescription>
            Projected cash from invoices next month (avg. of last {forecast.basedOnMonths || 0} months with payments)
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-2xl font-semibold tracking-tight">{formatCents(forecast.nextMonthRevenueCents)}</p>
          <Link href="/dashboard/analytics/forecast" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs")}>
            Forecast workspace →
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

function Kpi({
  title,
  value,
  hint,
  tone = "default",
}: {
  title: string
  value: string
  hint: string
  tone?: "default" | "success" | "danger"
}) {
  return (
    <Card
      className={
        tone === "danger"
          ? "border-red-500/20 bg-red-500/5"
          : tone === "success"
            ? "border-emerald-500/20 bg-emerald-500/5"
            : "border-input"
      }
    >
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xl font-semibold">{value}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}
