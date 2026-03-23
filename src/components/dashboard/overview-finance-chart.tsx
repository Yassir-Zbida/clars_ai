"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { formatCents } from "@/lib/money"
import type { AnalyticsOverviewData } from "@/components/dashboard/types"

const chartConfig = {
  revenue: {
    label: "Revenue collected",
    color: "hsl(142 70% 45%)",
  },
  expenses: {
    label: "Expenses",
    color: "hsl(0 72% 51%)",
  },
} satisfies ChartConfig

function monthKeyToLabel(key: string) {
  const [y, m] = key.split("-").map(Number)
  if (!y || !m) return key
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "short", year: "numeric" })
}

export function OverviewFinanceChart({ series }: { series: AnalyticsOverviewData["revenueExpenseSeries"] }) {
  const isMobile = useIsMobile()
  const [range, setRange] = React.useState<"6m" | "3m">("6m")

  React.useEffect(() => {
    if (isMobile) setRange("3m")
  }, [isMobile])

  const chartData = React.useMemo(() => {
    const slice = range === "3m" ? series.slice(-3) : series
    return slice.map((row) => ({
      month: row.month,
      label: monthKeyToLabel(row.month),
      revenue: row.revenueCents / 100,
      expenses: row.expensesCents / 100,
    }))
  }, [series, range])

  const totalRevenueCents = chartData.reduce((s, row) => s + Math.round(row.revenue * 100), 0)
  const totalExpensesCents = chartData.reduce((s, row) => s + Math.round(row.expenses * 100), 0)
  const netCents = totalRevenueCents - totalExpensesCents

  return (
    <Card className="@container/card border border-border/80 bg-card shadow-xs">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Revenue &amp; expenses</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:inline">Cash collected from invoices vs expenses by calendar month</span>
          <span className="@[540px]/card:hidden">By month</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            multiple={false}
            value={[range]}
            onValueChange={(value) => {
              const v = value[0]
              if (v === "6m" || v === "3m") setRange(v)
            }}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-3! @[640px]/card:flex"
          >
            <ToggleGroupItem value="6m">6 months</ToggleGroupItem>
            <ToggleGroupItem value="3m">3 months</ToggleGroupItem>
          </ToggleGroup>
          <Select
            value={range}
            onValueChange={(value) => {
              if (value === "6m" || value === "3m") setRange(value)
            }}
          >
            <SelectTrigger
              className="flex w-36 **:data-[slot=select-value]:block @[640px]/card:hidden"
              size="sm"
              aria-label="Chart range"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="6m" className="rounded-lg">
                6 months
              </SelectItem>
              <SelectItem value="3m" className="rounded-lg">
                3 months
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3 px-2 pt-4 sm:px-6 sm:pt-5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-600 dark:text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Revenue {formatCents(totalRevenueCents)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-red-600 dark:text-red-400">
            <span className="size-1.5 rounded-full bg-red-500" />
            Expenses {formatCents(totalExpensesCents)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-foreground">
            Net {formatCents(netCents)}
          </span>
        </div>
        {chartData.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center text-sm">
            No payment or expense history yet. Record payments and expenses to see this chart.
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-[290px] w-full">
            <AreaChart data={chartData} margin={{ left: 8, right: 8 }}>
              <defs>
                <linearGradient id="fillRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.9} />
                  <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.08} />
                </linearGradient>
                <linearGradient id="fillExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-expenses)" stopOpacity={0.75} />
                  <stop offset="95%" stopColor="var(--color-expenses)" stopOpacity={0.08} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 4" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={16}
              />
              <YAxis
                width={56}
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                tickFormatter={(v) => {
                  const n = Number(v)
                  if (!Number.isFinite(n)) return ""
                  try {
                    return new Intl.NumberFormat(undefined, {
                      style: "currency",
                      currency: "EUR",
                      notation: "compact",
                      maximumFractionDigits: 1,
                    }).format(n)
                  } catch {
                    return `€${Math.round(n)}`
                  }
                }}
              />
              <ChartTooltip
                cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const row = payload[0]?.payload as {
                    label?: string
                    revenue?: number
                    expenses?: number
                  }
                  if (!row?.label) return null
                  return (
                    <div className="grid min-w-40 gap-1.5 rounded-lg border border-border/60 bg-background px-2.5 py-2 text-xs shadow-lg">
                      <p className="font-medium">{row.label}</p>
                      <p className="flex justify-between gap-4 text-muted-foreground">
                        <span className="text-emerald-600 dark:text-emerald-400">Revenue</span>
                        <span className="font-mono text-foreground tabular-nums">
                          {formatCents(Math.round((row.revenue ?? 0) * 100))}
                        </span>
                      </p>
                      <p className="flex justify-between gap-4 text-muted-foreground">
                        <span className="text-red-600 dark:text-red-400">Expenses</span>
                        <span className="font-mono text-foreground tabular-nums">
                          {formatCents(Math.round((row.expenses ?? 0) * 100))}
                        </span>
                      </p>
                    </div>
                  )
                }}
              />
              <Area
                dataKey="revenue"
                type="natural"
                fill="url(#fillRev)"
                stroke="var(--color-revenue)"
                strokeWidth={2}
              />
              <Area
                dataKey="expenses"
                type="natural"
                fill="url(#fillExp)"
                stroke="var(--color-expenses)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
