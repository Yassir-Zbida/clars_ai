"use client"

import { useQuery } from "@tanstack/react-query"

type AdminDashboardData = {
  generatedAt: string
  overview: {
    totalUsers: number
    activeUsers: number
    softDeletedUsers: number
    newUsers30d: number
    newUsers7d: number
    surveyCompleted: number
    surveySkipped: number
    responseRate: number
    overdueInvoices: number
    releaseQuality: {
      authHealth: number
      surveyHealth: number
      runtimeHealth: number
    }
  }
  logs: {
    incidents: Array<{
      key: string
      service: string
      level: "critical" | "warning" | "info"
      message: string
      count: number
    }>
  }
  series: {
    signupsByDay: Array<{ label: string; count: number }>
    surveysByDay: Array<{ label: string; count: number }>
    alertsByDay: Array<{ label: string; count: number }>
  }
  surveys: {
    responseRate: number
    totalCompleted: number
    skipped: number
    heard: Array<{ key: string; count: number }>
    comments: string[]
  }
  aiAnalytics: {
    aiProviderConfigured: boolean
    activeEditors30d: number
    interactions30d: number
    interactions7d: number
    proposal30d: number
    email30d: number
    note30d: number
  }
}

export function useAdminDashboard() {
  return useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/admin/dashboard", { credentials: "include" })
      if (!res.ok) throw new Error("admin-dashboard")
      const json = (await res.json()) as { data: AdminDashboardData }
      return json.data
    },
  })
}
