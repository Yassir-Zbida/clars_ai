"use client"

import { useQuery } from "@tanstack/react-query"

export type ClientActivityLogType = "navigation" | "action" | "error" | "api" | "info"
export type ClientActivityLogLevel = "debug" | "info" | "warn" | "error"

export type AdminClientLogRow = {
  id: string
  userId: string
  userEmail: string | null
  sessionId: string | null
  type: ClientActivityLogType
  level: ClientActivityLogLevel
  name: string
  message: string | null
  path: string | null
  meta: unknown
  userAgent: string | null
  clientTs: string | null
  createdAt: string | null
}

export type AdminLogsQuery = {
  type: "all" | ClientActivityLogType
  level: "all" | ClientActivityLogLevel
  q: string
  userId: string
  limit: number
  offset: number
}

export function buildAdminLogsQueryString(q: AdminLogsQuery) {
  const p = new URLSearchParams()
  if (q.type !== "all") p.set("type", q.type)
  if (q.level !== "all") p.set("level", q.level)
  if (q.q.trim()) p.set("q", q.q.trim())
  if (q.userId.trim()) p.set("userId", q.userId.trim())
  p.set("limit", String(q.limit))
  p.set("offset", String(q.offset))
  return p.toString()
}

export function useAdminLogs(query: AdminLogsQuery) {
  const qs = buildAdminLogsQueryString(query)
  return useQuery({
    queryKey: ["admin", "client-logs", qs],
    queryFn: async () => {
      const res = await fetch(`/api/admin/logs?${qs}`, { credentials: "include" })
      if (!res.ok) throw new Error("admin-logs")
      const json = (await res.json()) as {
        data: { total: number; items: AdminClientLogRow[]; limit: number; offset: number }
      }
      return json.data
    },
  })
}
