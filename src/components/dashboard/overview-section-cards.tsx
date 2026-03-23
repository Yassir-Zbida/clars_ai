"use client"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatCents } from "@/lib/money"
import { ActivityIcon, AlertCircleIcon, BanknoteIcon, TrendingDownIcon, TrendingUpIcon, UsersIcon } from "lucide-react"
import type { AnalyticsOverviewData } from "@/components/dashboard/types"

function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null
  return Math.round(((current - previous) / previous) * 1000) / 10
}

function openProjectCount(projectsByStatus: Record<string, number>) {
  const keys = ["ACTIVE", "ON_HOLD", "DRAFT"] as const
  return keys.reduce((s, k) => s + (projectsByStatus[k] ?? 0), 0)
}

export function OverviewSectionCards({ data }: { data: AnalyticsOverviewData }) {
  const { finance, productivity, revenueExpenseSeries, projectsByStatus } = data
  const series = revenueExpenseSeries
  const lastMonth = series.length >= 2 ? series[series.length - 1] : null
  const prevMonth = series.length >= 2 ? series[series.length - 2] : null
  const revMom =
    lastMonth && prevMonth ? pctChange(lastMonth.revenueCents, prevMonth.revenueCents) : null

  const unpaidInvoices =
    Object.entries(finance.statusBreakdown).reduce((s, [st, n]) => {
      if (st === "PAID" || st === "CANCELLED" || st === "DRAFT") return s
      return s + n
    }, 0)

  const openProjects = openProjectCount(projectsByStatus)

  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card border border-border/80 bg-card shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md">
        <CardHeader className="pb-2">
          <CardDescription className="text-[11px] uppercase tracking-wide">Collected revenue (MTD)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatCents(finance.revenueMtdCents)}
          </CardTitle>
          <CardAction>
            {revMom !== null ? (
              <Badge variant="outline" className="gap-0.5 tabular-nums">
                {revMom >= 0 ? (
                  <TrendingUpIcon className="size-3.5 text-emerald-500" />
                ) : (
                  <TrendingDownIcon className="size-3.5 text-amber-500" />
                )}
                {revMom >= 0 ? "+" : ""}
                {revMom}%
              </Badge>
            ) : (
              <Badge variant="outline">This month</Badge>
            )}
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 border-border/70 bg-muted/35 text-sm">
          <div className="text-muted-foreground">
            Net after expenses:{" "}
            <span className="font-medium text-foreground">{formatCents(finance.netMtdCents)}</span>
          </div>
          <div className="text-xs text-muted-foreground">From recorded payments on invoices</div>
        </CardFooter>
      </Card>

      <Card className="@container/card border border-border/80 bg-card shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md">
        <CardHeader className="pb-2">
          <CardDescription className="text-[11px] uppercase tracking-wide">Contacts</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {productivity.totalClients}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="gap-1">
              <UsersIcon className="size-3.5" />
              CRM
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 border-border/70 bg-muted/35 text-sm">
          <div className="line-clamp-2 font-medium">
            {productivity.pipelineContacts} in active pipeline
            <span className="text-muted-foreground font-normal"> · LEAD → CUSTOMER</span>
          </div>
          <div className="text-xs text-muted-foreground">Open projects: {openProjects}</div>
        </CardFooter>
      </Card>

      <Card className="@container/card border border-border/80 bg-card shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md">
        <CardHeader className="pb-2">
          <CardDescription className="text-[11px] uppercase tracking-wide">Outstanding on invoices</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatCents(finance.outstandingCents)}
          </CardTitle>
          <CardAction>
            {finance.overdueCents > 0 ? (
              <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400">
                <AlertCircleIcon className="size-3.5" />
                Overdue {formatCents(finance.overdueCents)}
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <BanknoteIcon className="size-3.5" />
                {unpaidInvoices} open
              </Badge>
            )}
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 border-border/70 bg-muted/35 text-sm">
          <div className="text-muted-foreground">
            {finance.invoiceCount} total invoices · {unpaidInvoices} not fully paid
          </div>
          <div className="text-xs text-muted-foreground">Follow up from Invoices or Smart Insights</div>
        </CardFooter>
      </Card>

      <Card className="@container/card border border-border/80 bg-card shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md">
        <CardHeader className="pb-2">
          <CardDescription className="text-[11px] uppercase tracking-wide">Activity (30 days)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {productivity.interactionsLast30Days}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="gap-1">
              <ActivityIcon className="size-3.5" />
              Logged
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 border-border/70 bg-muted/35 text-sm">
          <div className="font-medium">Interactions & touchpoints</div>
          <div className="text-xs text-muted-foreground">Keep logging calls, emails, and meetings on contacts</div>
        </CardFooter>
      </Card>
    </div>
  )
}
