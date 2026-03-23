"use client"

import Link from "next/link"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Loader2 } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { useAnalyticsOverview } from "../use-analytics-overview"

const chartConfig = {
  count: { label: "Projects", color: "hsl(38 92% 50%)" },
} satisfies ChartConfig

export default function AnalyticsProductivityPage() {
  const { data, isLoading, isError } = useAnalyticsOverview()

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" />
        Loading…
      </div>
    )
  }

  if (isError || !data) {
    return <p className="text-sm text-muted-foreground">Could not load productivity metrics.</p>
  }

  const { projectsByStatus, productivity } = data
  const chartData = Object.entries(projectsByStatus)
    .map(([status, count]) => ({
      status: status.replace(/_/g, " "),
      count,
    }))
    .sort((a, b) => b.count - a.count)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Productivity</h2>
          <p className="text-xs text-muted-foreground">Delivery workload and recent CRM activity.</p>
        </div>
        <Link href="/dashboard/projects" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 w-fit text-xs")}>
          Open projects
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="border-input md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Interactions (30 days)</CardTitle>
            <CardDescription>Notes, calls, emails, and other events logged on contacts</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">{productivity.interactionsLast30Days}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Increase this by logging touchpoints from each contact&apos;s timeline.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-input">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Projects by status</CardTitle>
          <CardDescription>Active pipeline across your portfolio</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects yet.</p>
          ) : (
            <ChartContainer config={chartConfig} className="aspect-[16/8] max-h-[280px] w-full">
              <BarChart data={chartData} margin={{ left: 4, right: 4, top: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis dataKey="status" tickLine={false} axisLine={false} tickMargin={8} interval={0} angle={-12} textAnchor="end" height={56} />
                <YAxis width={40} tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
