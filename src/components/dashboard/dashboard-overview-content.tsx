"use client"

import type { AnalyticsOverviewData } from "@/components/dashboard/types"
import { OverviewFinanceChart } from "@/components/dashboard/overview-finance-chart"
import { OverviewIntro } from "@/components/dashboard/overview-intro"
import { OverviewRecentActivity } from "@/components/dashboard/overview-recent-activity"
import { OverviewSectionCards } from "@/components/dashboard/overview-section-cards"

export function DashboardOverviewContent({ data }: { data: AnalyticsOverviewData }) {
  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="px-4 lg:px-6">
        <OverviewIntro />
      </div>
      <OverviewSectionCards data={data} />
      <div className="px-4 lg:px-6">
        <OverviewFinanceChart series={data.revenueExpenseSeries} />
      </div>
      <OverviewRecentActivity />
    </div>
  )
}
