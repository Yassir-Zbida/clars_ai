"use client"

import { useQuery } from "@tanstack/react-query"

export type AnalyticsOverview = {
  finance: {
    outstandingCents: number
    overdueCents: number
    revenueMtdCents: number
    expensesMtdCents: number
    netMtdCents: number
    invoiceCount: number
    statusBreakdown: Record<string, number>
  }
  revenueExpenseSeries: Array<{ month: string; revenueCents: number; expensesCents: number }>
  clientsByStatus: Record<string, number>
  projectsByStatus: Record<string, number>
  productivity: {
    interactionsLast30Days: number
    totalClients: number
    pipelineContacts: number
  }
  forecast: {
    nextMonthRevenueCents: number
    basedOnMonths: number
  }
}

export function useAnalyticsOverview() {
  return useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/overview", { credentials: "include" })
      if (!res.ok) throw new Error("analytics")
      const json = (await res.json()) as { data: AnalyticsOverview }
      return json.data
    },
  })
}
