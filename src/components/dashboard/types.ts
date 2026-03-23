/** Shape of `GET /api/analytics/overview` → `data` */
export type AnalyticsOverviewData = {
  finance: {
    outstandingCents: number
    overdueCents: number
    revenueMtdCents: number
    expensesMtdCents: number
    netMtdCents: number
    invoiceCount: number
    statusBreakdown: Record<string, number>
  }
  revenueExpenseSeries: Array<{
    month: string
    revenueCents: number
    expensesCents: number
  }>
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
