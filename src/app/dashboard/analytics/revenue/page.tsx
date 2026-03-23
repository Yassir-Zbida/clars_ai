"use client"

import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts"
import { Loader2 } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCents } from "@/lib/money"

import { useAnalyticsOverview } from "../use-analytics-overview"

const chartConfig = {
  revenue: { label: "Revenue (collected)", color: "hsl(142 70% 45%)" },
  expenses: { label: "Expenses", color: "hsl(0 72% 51%)" },
} satisfies ChartConfig

function shortMonth(key: string) {
  const [y, m] = key.split("-").map(Number)
  if (!y || !m) return key
  return new Date(y, m - 1, 1).toLocaleString(undefined, { month: "short", year: "numeric" })
}

export default function AnalyticsRevenuePage() {
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
    return <p className="text-sm text-muted-foreground">Could not load revenue analytics.</p>
  }

  const { finance, revenueExpenseSeries } = data
  const chartData = revenueExpenseSeries.map((row) => ({
    label: shortMonth(row.month),
    revenue: row.revenueCents,
    expenses: row.expensesCents,
  }))

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Revenue</h2>
        <p className="text-xs text-muted-foreground">Cash collected on invoices vs operational spend by month.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MiniKpi label="MTD collected" value={formatCents(finance.revenueMtdCents)} />
        <MiniKpi label="MTD expenses" value={formatCents(finance.expensesMtdCents)} />
        <MiniKpi label="MTD net" value={formatCents(finance.netMtdCents)} highlight={finance.netMtdCents >= 0} />
      </div>

      <Card className="border-input">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Six-month trend</CardTitle>
          <CardDescription>Based on payment dates linked to your invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="aspect-[16/8] max-h-[320px] w-full">
            <BarChart data={chartData} margin={{ left: 8, right: 8, top: 12 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis
                width={56}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => (typeof v === "number" ? `${Math.round(v / 100)}` : String(v))}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
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
              <Bar name="revenue" dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar name="expenses" dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="border-input">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Monthly breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-input">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenueExpenseSeries.map((row) => {
                  const net = row.revenueCents - row.expensesCents
                  return (
                    <TableRow key={row.month}>
                      <TableCell className="text-sm">{shortMonth(row.month)}</TableCell>
                      <TableCell className="text-right text-sm text-emerald-400">
                        {formatCents(row.revenueCents)}
                      </TableCell>
                      <TableCell className="text-right text-sm">{formatCents(row.expensesCents)}</TableCell>
                      <TableCell className={`text-right text-sm font-medium ${net >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {formatCents(net)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function MiniKpi({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-emerald-500/25 bg-emerald-500/5" : "border-input"}>
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-normal text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-lg font-semibold">{value}</p>
      </CardContent>
    </Card>
  )
}
