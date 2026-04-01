"use client"

import Link from "next/link"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { AnalyticsError, AnalyticsLoading, SectionCard } from "../_components/analytics-page-shell"
import { useAnalyticsOverview } from "../use-analytics-overview"

const chartConfig = {
  count: { label: "Contacts", color: "hsl(217 91% 60%)" },
} satisfies ChartConfig

export default function AnalyticsClientsPage() {
  const { data, isLoading, isError } = useAnalyticsOverview()

  if (isLoading) return <SectionCard><AnalyticsLoading message="Loading contact analytics…" /></SectionCard>
  if (isError || !data) return <SectionCard><AnalyticsError message="Could not load contact analytics." /></SectionCard>

  const { clientsByStatus, productivity } = data
  const chartData = Object.entries(clientsByStatus)
    .map(([status, count]) => ({ status: status.replace(/_/g, " "), count }))
    .sort((a, b) => b.count - a.count)

  const leads  = clientsByStatus.LEAD   ?? 0
  const active = clientsByStatus.ACTIVE ?? 0
  const conversionHint = leads + active > 0
    ? `${Math.round((active / (leads + active)) * 100)}% active vs leads`
    : "Add contacts to see mix"

  return (
    <div className="flex flex-col gap-4">

      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-3">
        <MiniKpi label="Total contacts"  value={String(productivity.totalClients)} />
        <MiniKpi label="In pipeline"     value={String(productivity.pipelineContacts)} highlight />
        <MiniKpi label="Active vs leads" value={conversionHint} small />
      </div>

      {/* By-status chart */}
      <Card className="border border-input bg-card shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10">
              <i className="ri-group-line text-sm text-blue-600 dark:text-blue-400" />
            </span>
            <div>
              <CardTitle className="text-base">Contacts by status</CardTitle>
              <CardDescription className="text-xs">All non-archived contacts in your workspace</CardDescription>
            </div>
          </div>
          <CardAction>
            <Link href="/dashboard/clients" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 text-xs")}>
              Manage →
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-2 sm:px-6">
          {/* Legend pills */}
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-blue-600 dark:text-blue-400">
              <span className="size-1.5 rounded-full bg-blue-500" />
              Total {productivity.totalClients}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-foreground">
              Pipeline {productivity.pipelineContacts}
            </span>
          </div>
          {chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <span className="flex size-10 items-center justify-center rounded-xl bg-muted">
                <i className="ri-group-line text-xl text-muted-foreground" />
              </span>
              <p className="text-sm font-medium text-muted-foreground">No contacts yet</p>
              <p className="text-xs text-muted-foreground/80">Add contacts to see distribution here.</p>
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
              <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="status" width={95} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} maxBarSize={24} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function MiniKpi({ label, value, highlight, small }: { label: string; value: string; highlight?: boolean; small?: boolean }) {
  return (
    <div className={cn("rounded-2xl border bg-card p-4 shadow-sm",
      highlight ? "border-emerald-500/20 bg-emerald-500/5" : "border-input"
    )}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-1.5 font-semibold tracking-tight", small ? "text-sm text-muted-foreground" : "text-xl")}>{value}</p>
    </div>
  )
}
