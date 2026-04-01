"use client"

import Link from "next/link"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { AnalyticsError, AnalyticsLoading, SectionCard, SectionHeader } from "../_components/analytics-page-shell"
import { useAnalyticsOverview } from "../use-analytics-overview"

const chartConfig = {
  count: { label: "Projects", color: "hsl(38 92% 50%)" },
} satisfies ChartConfig

export default function AnalyticsProductivityPage() {
  const { data, isLoading, isError } = useAnalyticsOverview()

  if (isLoading) return <SectionCard><AnalyticsLoading message="Loading productivity…" /></SectionCard>
  if (isError || !data) return <SectionCard><AnalyticsError message="Could not load productivity metrics." /></SectionCard>

  const { projectsByStatus, productivity } = data
  const chartData = Object.entries(projectsByStatus)
    .map(([status, count]) => ({ status: status.replace(/_/g, " "), count }))
    .sort((a, b) => b.count - a.count)

  return (
    <div className="flex flex-col gap-4">

      {/* Interactions highlight */}
      <SectionCard>
        <SectionHeader
          icon="ri-pulse-line" iconBg="bg-amber-500/10" iconColor="text-amber-600"
          title="Interactions (30 days)"
          description="Notes, calls, emails, and other events logged on contacts"
        />
        <div className="px-5 py-4">
          <p className="text-3xl font-semibold tracking-tight">{productivity.interactionsLast30Days}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Log touchpoints from each contact&apos;s timeline to grow this number.
          </p>
        </div>
      </SectionCard>

      {/* Projects by status chart */}
      <Card className="border border-input bg-card shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10">
              <i className="ri-briefcase-line text-sm text-amber-600 dark:text-amber-400" />
            </span>
            <div>
              <CardTitle className="text-base">Projects by status</CardTitle>
              <CardDescription className="text-xs">Active pipeline across your portfolio</CardDescription>
            </div>
          </div>
          <CardAction>
            <Link href="/dashboard/projects" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 text-xs")}>
              Open projects →
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-2 sm:px-6">
          {/* Legend pill */}
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-600 dark:text-amber-400">
              <span className="size-1.5 rounded-full bg-amber-500" />
              {chartData.reduce((s, r) => s + r.count, 0)} total projects
            </span>
          </div>
          {chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <span className="flex size-10 items-center justify-center rounded-xl bg-muted">
                <i className="ri-briefcase-line text-xl text-muted-foreground" />
              </span>
              <p className="text-sm font-medium text-muted-foreground">No projects yet</p>
              <p className="text-xs text-muted-foreground/80">Create a project to see status distribution here.</p>
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
              <BarChart data={chartData} margin={{ left: 4, right: 4, top: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis dataKey="status" tickLine={false} axisLine={false} tickMargin={8} interval={0} angle={-12} textAnchor="end" height={52} />
                <YAxis width={40} tickLine={false} axisLine={false} allowDecimals={false} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
