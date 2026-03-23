"use client"

import { useQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"

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
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 px-4 text-sm text-muted-foreground">
        <Loader2 className="size-8 animate-spin text-primary" />
        Loading your workspace…
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="mx-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-8 text-center lg:mx-6">
        <p className="text-sm font-medium text-destructive">Could not load dashboard data.</p>
        <p className="mt-1 text-xs text-muted-foreground">Check your connection and try again.</p>
        <button
          type="button"
          className="mt-4 text-xs font-medium text-primary underline"
          onClick={() => void refetch()}
        >
          Retry
        </button>
      </div>
    )
  }

  return <DashboardOverviewContent data={data} />
}
