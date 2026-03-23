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
  count: { label: "Contacts", color: "hsl(217 91% 60%)" },
} satisfies ChartConfig

export default function AnalyticsClientsPage() {
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
    return <p className="text-sm text-muted-foreground">Could not load contact analytics.</p>
  }

  const { clientsByStatus, productivity } = data
  const chartData = Object.entries(clientsByStatus)
    .map(([status, count]) => ({
      status: status.replace(/_/g, " "),
      count,
    }))
    .sort((a, b) => b.count - a.count)

  const leads = clientsByStatus.LEAD ?? 0
  const active = clientsByStatus.ACTIVE ?? 0
  const conversionHint =
    leads + active > 0 ? `${Math.round((active / (leads + active)) * 100)}% active vs leads (rough)` : "Add contacts to see mix"

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Contact analysis</h2>
          <p className="text-xs text-muted-foreground">How records are distributed across lifecycle stages.</p>
        </div>
        <Link href="/dashboard/clients" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 w-fit text-xs")}>
          Manage contacts
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Mini label="Total contacts" value={String(productivity.totalClients)} />
        <Mini label="Pipeline (qualified + proposal + active)" value={String(productivity.pipelineContacts)} />
        <Mini label="Hint" value={conversionHint} small />
      </div>

      <Card className="border-input">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">By status</CardTitle>
          <CardDescription>All non-archived contacts in your workspace</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contacts yet.</p>
          ) : (
            <ChartContainer config={chartConfig} className="aspect-[16/9] max-h-[300px] w-full">
              <BarChart data={chartData} layout="vertical" margin={{ left: 16, right: 16 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="status"
                  width={100}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} maxBarSize={28} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Mini({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <Card className="border-input">
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-normal text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={cn("font-semibold", small ? "text-xs leading-snug text-muted-foreground" : "text-lg")}>{value}</p>
      </CardContent>
    </Card>
  )
}
