"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAdminDashboard } from "../use-admin-dashboard"

type SurveyRow = {
  id: string
  name: string
  email: string
  submittedAt: string | null
  userCreatedAt: string | null
  skipped: boolean
  answers: Record<string, unknown>
}

function labelValue(v: unknown) {
  if (v == null) return "—"
  if (typeof v === "boolean") return v ? "Yes" : "No"
  if (typeof v === "number") return String(v)
  if (typeof v === "string") return v
  return JSON.stringify(v, null, 2)
}

function prettyKey(key: string) {
  return key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").replace(/\s+/g, " ").trim()
}

export default function AdminSurveysPage() {
  const { data, isLoading, isError } = useAdminDashboard()
  const [query, setQuery] = React.useState("")
  const [selected, setSelected] = React.useState<SurveyRow | null>(null)

  const { data: submissions, isLoading: subsLoading, isError: subsError, refetch } = useQuery({
    queryKey: ["admin", "surveys", query],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (query.trim()) params.set("search", query.trim())
      params.set("page", "1")
      params.set("limit", "50")
      params.set("includeSkipped", "true")
      const res = await fetch(`/api/admin/surveys?${params.toString()}`, { credentials: "include", cache: "no-store" })
      if (!res.ok) throw new Error("surveys")
      const json = (await res.json()) as { data: SurveyRow[] }
      return json.data
    },
  })

  if (isLoading) return <div className="rounded-xl border border-input bg-card p-6 text-sm text-muted-foreground">Loading survey analytics…</div>
  if (isError || !data) return <div className="rounded-xl border border-input bg-card p-6 text-sm text-destructive">Unable to load survey analytics.</div>

  const channels = [
    { label: "Onboarding survey", responseRate: data.surveys.responseRate, sentiment: `${data.surveys.totalCompleted} submissions` },
    { label: "Skipped responses", responseRate: data.surveys.totalCompleted > 0 ? Math.round((data.surveys.skipped / data.surveys.totalCompleted) * 100) : 0, sentiment: `${data.surveys.skipped} skipped` },
  ]

  const topFeedback = data.surveys.comments

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border border-input bg-card shadow-sm lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Survey performance</CardTitle>
          <CardDescription className="text-xs">Monitor engagement and user satisfaction across touchpoints.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {channels.map((channel) => (
            <div key={channel.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span>{channel.label}</span>
                <span className="text-xs text-muted-foreground">{channel.sentiment}</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-blue-500" style={{ width: `${channel.responseRate}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">{channel.responseRate}% response rate</p>
            </div>
          ))}
        </CardContent>
        </Card>

        <Card className="border border-input bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Top feedback</CardTitle>
          <CardDescription className="text-xs">Most frequent comments from users this week.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {topFeedback.length === 0 && (
            <div className="rounded-lg border border-input bg-muted/20 p-2.5 text-xs text-muted-foreground">
              No feedback comments captured yet.
            </div>
          )}
          {topFeedback.map((item) => (
            <div key={item} className="rounded-lg border border-input bg-muted/20 p-2.5 text-xs text-muted-foreground">
              {item}
            </div>
          ))}
        </CardContent>
        </Card>
      </div>

      <Card className="border border-input bg-card shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">All survey submissions</CardTitle>
            <CardDescription className="text-xs">Review full answers per user (including skipped).</CardDescription>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="relative w-full sm:w-80">
              <i className="ri-search-line pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search email or name" className="h-8 pl-8 text-xs" />
            </div>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => refetch()}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subsLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    Loading submissions…
                  </TableCell>
                </TableRow>
              )}
              {subsError && !subsLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-destructive">
                    Failed to load survey submissions.
                  </TableCell>
                </TableRow>
              )}
              {!subsLoading && !subsError && (submissions ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    No submissions found.
                  </TableCell>
                </TableRow>
              )}
              {(submissions ?? []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium leading-none">{row.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{row.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.submittedAt ? new Date(row.submittedAt).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell>
                    {row.skipped ? (
                      <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400">Skipped</Badge>
                    ) : (
                      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">Completed</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelected(row)}>
                      View full report
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="w-[min(95vw,52rem)] max-h-[82vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Survey submission</DialogTitle>
            <DialogDescription>
              {selected?.email ?? ""} {selected?.submittedAt ? `· submitted ${new Date(selected.submittedAt).toLocaleString()}` : ""}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="grid gap-2 rounded-xl border border-input bg-muted/20 p-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-muted-foreground">User</span>
                  <span className="font-medium">{selected.name}</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium">{selected.email}</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-muted-foreground">User created</span>
                  <span className="font-medium">{selected.userCreatedAt ? new Date(selected.userCreatedAt).toLocaleString() : "—"}</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-muted-foreground">Submission</span>
                  <span className="font-medium">{selected.skipped ? "Skipped" : "Completed"}</span>
                </div>
              </div>

              <div className="rounded-xl border border-input bg-card p-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Answers</p>
                <div className="mt-3 space-y-2">
                  {Object.keys(selected.answers ?? {}).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No answer payload stored.</p>
                  ) : (
                    Object.entries(selected.answers).map(([k, v]) => (
                      <div key={k} className="flex flex-col gap-1 rounded-lg border border-input bg-muted/20 p-2.5">
                        <p className="text-xs font-medium">{prettyKey(k)}</p>
                        <pre className="whitespace-pre-wrap break-words text-xs text-muted-foreground">{labelValue(v)}</pre>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
