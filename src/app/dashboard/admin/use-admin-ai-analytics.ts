"use client"

import { useQuery } from "@tanstack/react-query"

export const ADMIN_AI_ANALYTICS_RANGE_OPTIONS = [7, 14, 30, 60, 90, 180, 365] as const
export type AdminAiAnalyticsRangeDays = (typeof ADMIN_AI_ANALYTICS_RANGE_OPTIONS)[number]

export type AdminAiAnalyticsData = {
  meta: { rangeDays: number; compareDays: number }
  generatedAt: string
  aiProviderConfigured: boolean
  crm: { email: number; proposal: number; note: number; total: number }
  api: {
    calls30d: number
    calls7d: number
    uniqueUsers30d: number
    bySurface30d: { chat: number; email: number; reports: number }
    bySurface7d: { chat: number; email: number; reports: number }
    tokens: {
      prompt30d: number
      completion30d: number
      total30d: number
      callsWithTokenUsage30d: number
    }
    latencyMs: { avg: number; p90: number | null }
    liveVsMock30d: { live: number; mock: number }
    chatRequestsWithImages30d: number
  }
  ui: { pageViews30d: number }
  engagement: { apiCallsPerPageVisit30d: number | null }
  models: Array<{ model: string; calls30d: number }>
  peakUtcHourApi30d: { hour: number; calls: number } | null
  topUsers30d: Array<{
    userId: string
    email?: string | null
    name?: string | null
    apiCalls: number
    tokens: number
  }>
  activityByDay: Array<{
    label: string
    apiChat: number
    apiEmail: number
    apiReports: number
    apiTotal: number
    viewsChat: number
    viewsEmail: number
    viewsReports: number
  }>
  recent: Array<{
    id: string
    at: string
    eventType: string
    surface: string
    mock?: boolean
    model?: string
    durationMs?: number
    totalTokens?: number
    userEmail: string
    userName: string
  }>
}

export function useAdminAiAnalytics(rangeDays: AdminAiAnalyticsRangeDays = 30) {
  return useQuery({
    queryKey: ["admin", "ai-analytics", rangeDays],
    queryFn: async () => {
      const params = new URLSearchParams({ days: String(rangeDays) })
      const res = await fetch(`/api/admin/ai-analytics?${params}`, { credentials: "include" })
      if (!res.ok) throw new Error("admin-ai-analytics")
      const json = (await res.json()) as { data: AdminAiAnalyticsData }
      return json.data
    },
  })
}
