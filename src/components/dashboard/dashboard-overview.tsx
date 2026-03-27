"use client"

import { useQuery } from "@tanstack/react-query"

import type { AnalyticsOverviewData } from "@/components/dashboard/types"
import { DashboardOverviewContent } from "@/components/dashboard/dashboard-overview-content"

export function DashboardOverview() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard", "analytics", "overview"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/overview", { credentials: "include" })
      if (!res.ok) throw new Error("overview")
      const json = (await res.json()) as { data: AnalyticsOverviewData }
      return json.data
    },
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 px-4">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10">
          <i className="ri-loader-4-line animate-spin text-2xl text-primary" />
        </span>
        <p className="text-sm text-muted-foreground">Loading your workspace…</p>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="mx-4 flex flex-col items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center lg:mx-6">
        <span className="flex size-10 items-center justify-center rounded-xl bg-destructive/10">
          <i className="ri-error-warning-line text-xl text-destructive" />
        </span>
        <div>
          <p className="text-sm font-medium text-destructive">Could not load dashboard data.</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Check your connection and try again.</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
          onClick={() => void refetch()}
        >
          <i className="ri-refresh-line text-sm" />
          Retry
        </button>
      </div>
    )
  }

  return <DashboardOverviewContent data={data} />
}
