"use client"

import Link from "next/link"
import { Loader2, SparklesIcon } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatCents } from "@/lib/money"

import { useAnalyticsOverview } from "../use-analytics-overview"

export default function AnalyticsForecastPage() {
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
    return <p className="text-sm text-muted-foreground">Could not load forecast inputs.</p>
  }

  const { forecast, revenueExpenseSeries, finance } = data
  const last3 = revenueExpenseSeries.slice(-3)
  const avg =
    last3.length > 0 ? last3.reduce((s, x) => s + x.revenueCents, 0) / last3.length : 0

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <SparklesIcon className="size-5 text-violet-400" />
          Forecast
        </h2>
        <p className="text-xs text-muted-foreground">
          Lightweight projection from your recent collected revenue—not a full FP&amp;A model.
        </p>
      </div>

      <Card className="border-violet-500/25 bg-gradient-to-br from-violet-500/10 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Next month (heuristic)</CardTitle>
          <CardDescription>
            Average of the last {forecast.basedOnMonths} month(s) with payment activity: {formatCents(Math.round(avg))}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-4xl font-semibold tracking-tight">{formatCents(forecast.nextMonthRevenueCents)}</p>
          <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
            <li>Based only on payments recorded against invoices.</li>
            <li>Does not include unsigned quotes or overdue risk.</li>
            <li>AI-driven scenarios and seasonality can be layered on later.</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-input">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Current month context</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-2 rounded-lg border border-input bg-muted/20 px-3 py-2">
            <span className="text-muted-foreground">Outstanding AR</span>
            <span className="font-medium">{formatCents(finance.outstandingCents)}</span>
          </div>
          <div className="flex justify-between gap-2 rounded-lg border border-input bg-muted/20 px-3 py-2">
            <span className="text-muted-foreground">Overdue</span>
            <span className="font-medium text-red-400">{formatCents(finance.overdueCents)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/finance" className={cn(buttonVariants({ size: "sm" }), "h-8 text-xs")}>
          Finance overview
        </Link>
        <Link href="/dashboard/invoices" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs")}>
          Invoices
        </Link>
      </div>
    </div>
  )
}
