"use client"

import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatCents } from "@/lib/money"

import { AnalyticsError, AnalyticsLoading, SectionCard, SectionHeader } from "../_components/analytics-page-shell"
import { useAnalyticsOverview } from "../use-analytics-overview"

export default function AnalyticsForecastPage() {
  const { data, isLoading, isError } = useAnalyticsOverview()

  if (isLoading) {
    return (
      <SectionCard>
        <AnalyticsLoading message="Loading forecast…" />
      </SectionCard>
    )
  }

  if (isError || !data) {
    return (
      <SectionCard>
        <AnalyticsError message="Could not load forecast inputs." />
      </SectionCard>
    )
  }

  const { forecast, revenueExpenseSeries, finance } = data
  const last3 = revenueExpenseSeries.slice(-3)
  const avg = last3.length > 0 ? last3.reduce((s, x) => s + x.revenueCents, 0) / last3.length : 0

  return (
    <div className="flex flex-col gap-4">

      {/* Next month projection */}
      <SectionCard className="border-violet-500/30 bg-gradient-to-br from-violet-500/8 to-transparent">
        <SectionHeader
          icon="ri-magic-line"
          iconBg="bg-violet-500/15"
          iconColor="text-violet-600 dark:text-violet-400"
          title="Next month (heuristic)"
          description={`Avg of last ${forecast.basedOnMonths} month(s) with payments · ${formatCents(Math.round(avg))}/mo`}
        />
        <div className="px-5 py-4">
          <p className="text-4xl font-semibold tracking-tight">{formatCents(forecast.nextMonthRevenueCents)}</p>
          <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-muted-foreground">
            <li>Based only on payments recorded against invoices.</li>
            <li>Does not include unsigned quotes or overdue risk.</li>
            <li>Richer scenarios and seasonality can be added later.</li>
          </ul>
        </div>
      </SectionCard>

      {/* Current month context */}
      <SectionCard>
        <SectionHeader
          icon="ri-calendar-line"
          title="Current month context"
          description="Balances that affect cash expectations"
        />
        <div className="grid gap-2 px-5 py-4 sm:grid-cols-2">
          <div className="flex justify-between gap-2 rounded-xl border border-input bg-muted/20 px-3 py-2.5 text-sm">
            <span className="text-muted-foreground">Outstanding AR</span>
            <span className="font-medium">{formatCents(finance.outstandingCents)}</span>
          </div>
          <div className="flex justify-between gap-2 rounded-xl border border-input bg-muted/20 px-3 py-2.5 text-sm">
            <span className="text-muted-foreground">Overdue</span>
            <span className="font-medium text-red-500 dark:text-red-400">{formatCents(finance.overdueCents)}</span>
          </div>
        </div>
      </SectionCard>

      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/finance" className={cn(buttonVariants({ size: "sm" }), "h-8 text-xs")}>
          <i className="ri-wallet-3-line mr-1 text-sm" />
          Finance overview
        </Link>
        <Link href="/dashboard/invoices" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs")}>
          Invoices
        </Link>
      </div>
    </div>
  )
}
