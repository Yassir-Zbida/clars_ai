"use client"

import * as React from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

import { useAdminDashboard } from "../use-admin-dashboard"
import { useAdminLogs, type ClientActivityLogLevel, type ClientActivityLogType } from "../use-admin-logs"

const levelStyle: Record<string, string> = {
  critical: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  info: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
}

const logLevelBadge: Record<ClientActivityLogLevel, string> = {
  error: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  warn: "bg-amber-500/15 text-amber-800 dark:text-amber-400",
  info: "bg-sky-500/10 text-sky-800 dark:text-sky-400",
  debug: "bg-muted text-muted-foreground",
}

const logTypeBadge: Record<ClientActivityLogType, string> = {
  navigation: "bg-violet-500/10 text-violet-800 dark:text-violet-300",
  action: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-400",
  error: "bg-rose-500/10 text-rose-800 dark:text-rose-400",
  api: "bg-orange-500/10 text-orange-800 dark:text-orange-400",
  info: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
}

const PAGE_SIZE = 75

export default function AdminLogsPage() {
  const queryClient = useQueryClient()
  const { data: dash, isLoading: dashLoading, isError: dashError } = useAdminDashboard()

  const [type, setType] = React.useState<"all" | ClientActivityLogType>("all")
  const [level, setLevel] = React.useState<"all" | ClientActivityLogLevel>("all")
  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [userIdFilter, setUserIdFilter] = React.useState("")
  const [debouncedUserId, setDebouncedUserId] = React.useState("")
  const [page, setPage] = React.useState(0)
  const [clearMode, setClearMode] = React.useState<"filtered" | "all" | null>(null)

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 320)
    return () => clearTimeout(t)
  }, [search])

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedUserId(userIdFilter.trim()), 320)
    return () => clearTimeout(t)
  }, [userIdFilter])

  React.useEffect(() => setPage(0), [type, level, debouncedSearch, debouncedUserId])

  const { data: logData, isLoading: logsLoading, isError: logsError, refetch, isFetching } = useAdminLogs({
    type,
    level,
    q: debouncedSearch,
    userId: debouncedUserId,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  })

  const clearMutation = useMutation({
    mutationFn: async (input: {
      scope: "all" | "filtered"
      type: typeof type
      level: typeof level
      q: string
      userId: string
    }) => {
      const p = new URLSearchParams()
      p.set("scope", input.scope)
      if (input.scope === "filtered") {
        if (input.type !== "all") p.set("type", input.type)
        if (input.level !== "all") p.set("level", input.level)
        if (input.q.trim()) p.set("q", input.q.trim())
        if (input.userId.trim()) p.set("userId", input.userId.trim())
      }
      const res = await fetch(`/api/admin/logs?${p.toString()}`, { method: "DELETE", credentials: "include" })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error ?? "Failed to clear logs")
      }
      return (await res.json()) as { deletedCount?: number }
    },
    onSuccess: async (json, vars) => {
      const scope = vars.scope
      await queryClient.invalidateQueries({ queryKey: ["admin", "client-logs"] })
      await queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] })
      setClearMode(null)
      toast.success(
        scope === "all"
          ? `Removed ${json.deletedCount?.toLocaleString() ?? ""} log entries.`
          : `Removed ${json.deletedCount?.toLocaleString() ?? ""} matching log entries.`
      )
    },
  })

  const incidents = dash?.logs.incidents ?? []
  const total = logData?.total ?? 0
  const items = logData?.items ?? []
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-lg font-semibold tracking-tight">Logs monitor</h1>
      </div>

      <Card className="border border-input bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Operational incidents</CardTitle>
          <CardDescription className="text-xs">Aggregates derived from live product data (billing, auth, tasks).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {dashLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {dashError && <p className="text-sm text-destructive">Unable to load incident metrics.</p>}
          {!dashLoading &&
            !dashError &&
            incidents.map((incident) => (
              <div key={incident.message} className="rounded-xl border border-input bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{incident.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {incident.service} · live aggregate
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={cn(levelStyle[incident.level] ?? levelStyle.info)}>{incident.level}</Badge>
                    <Badge variant="outline">{incident.count} events</Badge>
                  </div>
                </div>
              </div>
            ))}
        </CardContent>
      </Card>

      <Card className="border border-input bg-card shadow-sm">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="text-base">Live client logs</CardTitle>
            <CardDescription className="text-xs">
              {total.toLocaleString()} entr{total === 1 ? "y" : "ies"} from all users
              {logsLoading || isFetching ? " · loading…" : ""}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="grid gap-1.5">
              <Label className="text-[10px] uppercase text-muted-foreground">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger className="h-8 w-[160px] text-xs">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="navigation">Navigation</SelectItem>
                  <SelectItem value="action">Action</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-[10px] uppercase text-muted-foreground">Level</Label>
              <Select value={level} onValueChange={(v) => setLevel(v as typeof level)}>
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warn">Warn</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid min-w-[10rem] flex-1 gap-1.5 sm:min-w-[180px]">
              <Label className="text-[10px] uppercase text-muted-foreground">Search</Label>
              <Input
                className="h-8 text-xs"
                placeholder="Name, path, message, email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="grid min-w-[10rem] gap-1.5 sm:max-w-[200px]">
              <Label className="text-[10px] uppercase text-muted-foreground">User id</Label>
              <Input
                className="h-8 font-mono text-[11px]"
                placeholder="Mongo ObjectId"
                value={userIdFilter}
                onChange={(e) => setUserIdFilter(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 text-xs"
                onClick={() => void refetch()}
              >
                Refresh
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setClearMode("filtered")}>
                Clear filtered
              </Button>
              <Button type="button" variant="destructive" size="sm" className="h-8 text-xs" onClick={() => setClearMode("all")}>
                Clear all logs
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {logsError && <p className="text-sm text-destructive">Unable to load client logs.</p>}
          {!logsError && (
            <div className="overflow-x-auto rounded-lg border border-input">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs">Time</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Level</TableHead>
                    <TableHead className="text-xs">Name / message</TableHead>
                    <TableHead className="text-xs">User-visible msg</TableHead>
                    <TableHead className="text-xs">User</TableHead>
                    <TableHead className="text-xs">Path</TableHead>
                    <TableHead className="text-xs">Meta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsLoading && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-xs text-muted-foreground">
                        Loading…
                      </TableCell>
                    </TableRow>
                  )}
                  {!logsLoading &&
                    items.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="max-w-[8rem] whitespace-normal break-words text-[11px] text-muted-foreground">
                          {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge className={cn("font-normal", logTypeBadge[row.type])}>{row.type}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge className={cn("font-normal", logLevelBadge[row.level])}>{row.level}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[14rem] text-xs">
                          <span className="font-medium text-foreground">{row.name}</span>
                          {row.message ? (
                            <span className="mt-0.5 block truncate text-muted-foreground" title={row.message}>
                              {row.message}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="max-w-[12rem] text-[11px] text-amber-900 dark:text-amber-200" title={userVisibleFromMeta(row.meta) ?? ""}>
                          {userVisibleFromMeta(row.meta) ?? "—"}
                        </TableCell>
                        <TableCell className="max-w-[10rem] truncate text-[11px]" title={row.userEmail ?? row.userId}>
                          {row.userEmail ?? row.userId.slice(-6)}
                        </TableCell>
                        <TableCell className="max-w-[10rem] truncate text-[11px] text-muted-foreground" title={row.path ?? ""}>
                          {row.path ?? "—"}
                        </TableCell>
                        <TableCell className="max-w-[12rem] font-mono text-[10px] text-muted-foreground">
                          <pre className="max-h-16 overflow-auto whitespace-pre-wrap break-all">
                            {row.meta != null ? safeMeta(row.meta) : "—"}
                          </pre>
                        </TableCell>
                      </TableRow>
                    ))}
                  {!logsLoading && items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-xs text-muted-foreground">
                        No log entries for this filter.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {!logsError && total > 0 && (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-input pt-4 sm:flex-row">
              <p className="text-xs text-muted-foreground">
                Page {page + 1} of {totalPages} · {PAGE_SIZE} per page
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={page <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={clearMode != null} onOpenChange={(o) => !o && setClearMode(null)}>
        <DialogContent className="w-[min(96vw,24rem)]">
          <DialogHeader>
            <DialogTitle>{clearMode === "all" ? "Clear all client logs?" : "Clear filtered logs?"}</DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              {clearMode === "all"
                ? "Deletes every stored client telemetry event. Operational incident cards above are not affected."
                : `Deletes client log entries matching the current type, level, user id, and search filters.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" size="sm" onClick={() => setClearMode(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={clearMutation.isPending}
              onClick={() => {
                if (!clearMode) return
                clearMutation.mutate(
                  { scope: clearMode, type, level, q: debouncedSearch, userId: debouncedUserId },
                  {
                    onError: (e) => toast.error(e instanceof Error ? e.message : "Clear failed"),
                  }
                )
              }}
            >
              {clearMutation.isPending ? "Clearing…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function safeMeta(meta: unknown) {
  try {
    const s = JSON.stringify(meta, null, 0)
    return s.length > 320 ? `${s.slice(0, 320)}…` : s
  } catch {
    return String(meta).slice(0, 200)
  }
}

function userVisibleFromMeta(meta: unknown): string | null {
  if (!meta || typeof meta !== "object") return null
  const m = meta as Record<string, unknown>
  if (typeof m.userVisibleMessage === "string" && m.userVisibleMessage.trim()) return m.userVisibleMessage.trim()
  return null
}
