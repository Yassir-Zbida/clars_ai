"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import type { AdminReportDto } from "@/lib/admin-report-serialize"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const statusClass: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  draft: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
}

export default function AdminReportsPage() {
  const queryClient = useQueryClient()
  const [name, setName] = useState("")
  const [schedule, setSchedule] = useState("Manual (run on demand)")
  const [notes, setNotes] = useState("")

  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<AdminReportDto | null>(null)
  const [editName, setEditName] = useState("")
  const [editSchedule, setEditSchedule] = useState("")
  const [editNotes, setEditNotes] = useState("")

  const [deleteTarget, setDeleteTarget] = useState<AdminReportDto | null>(null)

  const [detailTarget, setDetailTarget] = useState<AdminReportDto | null>(null)

  const { data: reports = [], isLoading, isError } = useQuery({
    queryKey: ["admin", "reports"],
    queryFn: async () => {
      const res = await fetch("/api/admin/reports", { credentials: "include" })
      if (!res.ok) throw new Error("reports")
      const json = (await res.json()) as { data: AdminReportDto[] }
      return json.data
    },
  })

  const openEdit = (row: AdminReportDto) => {
    setEditing(row)
    setEditName(row.name)
    setEditSchedule(row.schedule)
    setEditNotes(row.destination)
    setEditOpen(true)
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/reports", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          schedule: schedule.trim(),
          destination: notes.trim(),
          status: "draft",
        }),
      })
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string; detail?: string; issues?: unknown }
        const msg = [json.error, json.detail].filter(Boolean).join(": ") || "Failed to create report"
        throw new Error(msg)
      }
    },
    onSuccess: async () => {
      setName("")
      setNotes("")
      setSchedule("Manual (run on demand)")
      await queryClient.invalidateQueries({ queryKey: ["admin", "reports"] })
      toast.success("Report created")
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to create report"),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Record<string, unknown> }) => {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(json.error ?? "Failed to update report")
      }
    },
    onSuccess: async () => {
      setEditOpen(false)
      setEditing(null)
      await queryClient.invalidateQueries({ queryKey: ["admin", "reports"] })
      toast.success("Report updated")
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update report"),
  })

  const saveEdit = () => {
    if (!editing) return
    updateMutation.mutate({
      id: editing.id,
      body: {
        name: editName.trim(),
        schedule: editSchedule.trim(),
        destination: editNotes.trim(),
      },
    })
  }

  const deleteMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const res = await fetch(`/api/admin/reports/${id}`, { method: "DELETE", credentials: "include" })
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(json.error ?? "Failed to delete report")
      }
    },
    onSuccess: async () => {
      setDeleteTarget(null)
      await queryClient.invalidateQueries({ queryKey: ["admin", "reports"] })
      toast.success("Report deleted")
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete report"),
  })

  const runMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const res = await fetch(`/api/admin/reports/${id}/run`, { method: "POST", credentials: "include" })
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(json.error ?? "Failed to run report")
      }
      return (await res.json()) as { data?: { summary?: string } }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "reports"] })
      toast.success("Report generated — open “View report” to read the snapshot.")
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to run report"),
  })

  const hasReports = useMemo(() => reports.length > 0, [reports])

  const detailRow = useMemo(() => {
    if (!detailTarget) return null
    return reports.find((r) => r.id === detailTarget.id) ?? detailTarget
  }, [detailTarget, reports])

  const hasDetail = (row: AdminReportDto) => Boolean(row.lastRunDetail?.trim())

  return (
    <div className="flex flex-1 flex-col">
      <Card className="border border-input bg-card shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Admin reports</CardTitle>
            <CardDescription className="text-xs">
              Save named snapshots of admin metrics. Click <strong className="font-medium text-foreground">Generate</strong> to refresh
              data, then <strong className="font-medium text-foreground">View report</strong> to read it here — nothing is emailed.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 rounded-xl border border-input bg-muted/20 p-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <div className="grid gap-1.5">
              <Label className="text-[10px] uppercase text-muted-foreground">Name</Label>
              <Input placeholder="Weekly ops digest" value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-[10px] uppercase text-muted-foreground">Schedule label</Label>
              <Input
                placeholder="e.g. Weekly Monday 08:00 UTC"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-[10px] uppercase text-muted-foreground">Notes (optional)</Label>
              <Input
                placeholder="Internal label, team, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="flex items-end">
              <Button
                size="sm"
                className="h-8 w-full text-xs lg:w-auto"
                disabled={createMutation.isPending || !name.trim() || !schedule.trim()}
                onClick={() => createMutation.mutate()}
              >
                <i className="ri-add-line mr-1.5 text-sm" />
                Create
              </Button>
            </div>
          </div>

          {isLoading && <div className="rounded-lg border border-input bg-muted/20 p-3 text-xs text-muted-foreground">Loading reports…</div>}
          {isError && !isLoading && <div className="rounded-lg border border-input bg-muted/20 p-3 text-xs text-destructive">Unable to load reports.</div>}
          {!isLoading && !isError && !hasReports && (
            <div className="rounded-lg border border-input bg-muted/20 p-3 text-xs text-muted-foreground">No reports yet. Create one above.</div>
          )}

          {reports.map((item) => (
            <div key={item.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-input bg-muted/20 px-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{item.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {item.schedule}
                  {item.destination ? ` · ${item.destination}` : ""}
                </p>
                {item.createdByEmail && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground/80">Created by {item.createdByEmail}</p>
                )}
                <p className="mt-1 text-xs text-foreground/90">{item.lastRunSummary ?? "Not generated yet — use Generate."}</p>
                {item.lastRunAt && (
                  <p className="mt-1 text-[11px] text-muted-foreground">Last generated: {new Date(item.lastRunAt).toLocaleString()}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge className={statusClass[item.status]}>{item.status}</Badge>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(item)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={updateMutation.isPending}
                  onClick={() =>
                    updateMutation.mutate({
                      id: item.id,
                      body: { status: item.status === "active" ? "draft" : "active" },
                    })
                  }
                >
                  {item.status === "active" ? "Draft" : "Activate"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 text-xs"
                  disabled={!hasDetail(item)}
                  onClick={() => setDetailTarget(item)}
                >
                  View report
                </Button>
                <Button size="sm" variant="default" className="h-7 text-xs" disabled={runMutation.isPending} onClick={() => runMutation.mutate({ id: item.id })}>
                  Generate
                </Button>
                <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => setDeleteTarget(item)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={(o) => !o && (setEditOpen(false), setEditing(null))}>
        <DialogContent className="w-[min(96vw,24rem)]">
          <DialogHeader>
            <DialogTitle>Edit report</DialogTitle>
            <DialogDescription className="text-xs">Update name, schedule label, or optional notes.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label className="text-xs">Name</Label>
              <Input className="h-8 text-xs" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Schedule label</Label>
              <Input className="h-8 text-xs" value={editSchedule} onChange={(e) => setEditSchedule(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Notes (optional)</Label>
              <Input className="h-8 text-xs" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={updateMutation.isPending || !editName.trim() || !editSchedule.trim()} onClick={saveEdit}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="w-[min(96vw,24rem)]">
          <DialogHeader>
            <DialogTitle>Delete report?</DialogTitle>
            <DialogDescription className="text-xs">
              Remove <strong className="text-foreground">{deleteTarget?.name}</strong> and its history. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate({ id: deleteTarget.id })}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(detailTarget)} onOpenChange={(o) => !o && setDetailTarget(null)}>
        <DialogContent className="max-h-[min(90vh,36rem)] w-[min(96vw,40rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report snapshot</DialogTitle>
            <DialogDescription className="text-xs">
              {detailRow?.name}
              {detailRow?.lastRunAt ? ` · ${new Date(detailRow.lastRunAt).toLocaleString()}` : ""}
            </DialogDescription>
          </DialogHeader>
          <pre className="mt-2 max-h-[min(60vh,28rem)] overflow-auto rounded-lg border border-input bg-muted/30 p-3 text-[11px] whitespace-pre-wrap text-muted-foreground">
            {detailRow?.lastRunDetail?.trim()
              ? detailRow.lastRunDetail
              : "No snapshot yet — click Generate or Regenerate below."}
          </pre>
          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => detailTarget && runMutation.mutate({ id: detailTarget.id })}
              disabled={runMutation.isPending}
            >
              Regenerate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
