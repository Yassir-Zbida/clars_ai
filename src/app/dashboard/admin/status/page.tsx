"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type StatusPayload = {
  overall: "healthy" | "warning" | "degraded"
  checkedAt: string
  checks: Array<{
    key: string
    label: string
    status: "pass" | "warn" | "fail"
    message: string
    ms?: number
  }>
  history: Array<{
    id: string
    checkedAt: string
    overall: "healthy" | "warning" | "degraded"
    passCount: number
    warnCount: number
    failCount: number
    checks: Array<{
      key: string
      label: string
      status: "pass" | "warn" | "fail"
      message: string
      ms?: number
    }>
  }>
}

const overallStyle: Record<StatusPayload["overall"], string> = {
  healthy: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  degraded: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
}

const checkStyle: Record<"pass" | "warn" | "fail", string> = {
  pass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  warn: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  fail: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
}

export default function AdminStatusPage() {
  const [historyDetail, setHistoryDetail] = React.useState<StatusPayload["history"][number] | null>(null)

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["admin", "status"],
    queryFn: async () => {
      const res = await fetch("/api/admin/status", { credentials: "include", cache: "no-store" })
      if (!res.ok) throw new Error("status")
      const json = (await res.json()) as { data: StatusPayload }
      const d = json.data
      return { ...d, history: d.history ?? [] }
    },
    refetchInterval: 30_000,
  })

  return (
    <div className="flex flex-col gap-4">
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="border border-input bg-card shadow-sm lg:col-span-2">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">System status</CardTitle>
            <CardDescription className="text-xs">Live checks for backend + admin features.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {data && <Badge className={overallStyle[data.overall]}>{data.overall}</Badge>}
            <Button size="sm" variant="outline" className="h-8 text-xs" disabled={isFetching} onClick={() => refetch()}>
              {isFetching ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && (
            <div className="rounded-lg border border-input bg-muted/20 p-3 text-xs text-muted-foreground">
              Running checks…
            </div>
          )}
          {isError && !isLoading && (
            <div className="rounded-lg border border-input bg-muted/20 p-3 text-xs text-destructive">
              Failed to load status checks.
            </div>
          )}
          {data?.checks?.map((c) => (
            <div key={c.key} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-input bg-muted/20 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium">{c.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{c.message}</p>
              </div>
              <div className="flex items-center gap-2">
                {typeof c.ms === "number" && <Badge variant="outline">{c.ms}ms</Badge>}
                <Badge className={checkStyle[c.status]}>{c.status}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border border-input bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
          <CardDescription className="text-xs">How to interpret results.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-muted-foreground">
          <p>
            <strong className="text-foreground">pass</strong>: the check ran successfully.
          </p>
          <p>
            <strong className="text-foreground">warn</strong>: feature works but a provider is not configured (common in dev).
          </p>
          <p>
            <strong className="text-foreground">fail</strong>: backend dependency or query failed — admin features may break.
          </p>
          {data?.checkedAt && <p className="pt-2">Last checked: {new Date(data.checkedAt).toLocaleString()}</p>}
          <p className="pt-2 border-t border-input">
            <strong className="text-foreground">History</strong>: snapshots save when results change or at most every 3 minutes while this page
            is open. Rows auto-expire after 90 days.
          </p>
        </CardContent>
      </Card>
    </div>

      <Card className="border border-input bg-card shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Check history</CardTitle>
            <CardDescription className="text-xs">Past system status snapshots (newest first).</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="rounded-lg border border-input bg-muted/20 p-3 text-xs text-muted-foreground">Loading history…</div>
          )}
          {isError && !isLoading && (
            <div className="rounded-lg border border-input bg-muted/20 p-3 text-xs text-destructive">Could not load history.</div>
          )}
          {!isLoading && !isError && (data?.history?.length ?? 0) === 0 && (
            <div className="rounded-lg border border-dashed border-input bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
              No snapshots yet. Leave this page open or refresh — records appear when status changes or every ~3 minutes.
            </div>
          )}
          {data && data.history.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Checked</TableHead>
                  <TableHead>Overall</TableHead>
                  <TableHead className="text-right tabular-nums">Pass</TableHead>
                  <TableHead className="text-right tabular-nums">Warn</TableHead>
                  <TableHead className="text-right tabular-nums">Fail</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.history.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(row.checkedAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={overallStyle[row.overall]}>{row.overall}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{row.passCount}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{row.warnCount}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{row.failCount}</TableCell>
                    <TableCell className="text-right">
                      <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setHistoryDetail(row)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(historyDetail)} onOpenChange={(o) => !o && setHistoryDetail(null)}>
        <DialogContent className="max-h-[min(90vh,36rem)] w-[min(96vw,40rem)] overflow-y-auto">
          {historyDetail ? (
            <>
              <DialogHeader>
                <DialogTitle>Snapshot detail</DialogTitle>
                <DialogDescription className="text-xs">
                  {new Date(historyDetail.checkedAt).toLocaleString()} ·{" "}
                  <span className="capitalize">{historyDetail.overall}</span>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                {historyDetail.checks.map((c) => (
                  <div
                    key={`${historyDetail.id}-${c.key}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-input bg-muted/20 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{c.label}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{c.message}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {typeof c.ms === "number" && <Badge variant="outline">{c.ms}ms</Badge>}
                      <Badge className={checkStyle[c.status]}>{c.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

