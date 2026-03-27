"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { getDicebearUrl } from "@/lib/dicebear"

import { TasksTab }  from "./_tasks-tab"
import { NotesTab }  from "./_notes-tab"
import { EventsTab } from "./_events-tab"

type ProjectDetails = {
  id: string
  name?: string | null
  description?: string | null
  notes?: string | null
  status?: "DRAFT" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED" | null
  priority?: "LOW" | "MEDIUM" | "HIGH" | null
  progress?: number | null
  startDate?: string | null
  endDate?: string | null
  budgetCents?: number | null
  currency?: string | null
  assignedClientIds?: string[]
  contacts?: Array<{ id: string; name: string; email?: string | null }>
}

type ContactOption = { id: string; fullName?: string; name?: string; email?: string }

const STATUS_STYLE: Record<string, string> = {
  DRAFT:     "bg-muted text-muted-foreground",
  ACTIVE:    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  ON_HOLD:   "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  COMPLETED: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  CANCELLED: "bg-red-500/10 text-red-500",
}

const PRIORITY_STYLE: Record<string, string> = {
  LOW:    "bg-muted text-muted-foreground",
  MEDIUM: "bg-primary/10 text-primary",
  HIGH:   "bg-red-500/10 text-red-500",
}

const TABS = [
  { id: "overview", label: "Overview",  icon: "ri-layout-grid-line" },
  { id: "tasks",    label: "Tasks",     icon: "ri-checkbox-multiple-line" },
  { id: "notes",    label: "Notes",     icon: "ri-sticky-note-line" },
  { id: "events",   label: "Events",    icon: "ri-calendar-event-line" },
] as const
type TabId = typeof TABS[number]["id"]

/* ── inline contact combobox ── */
function ContactCombobox({ options, selected, onAdd, onRemove }: {
  options: ContactOption[]; selected: string[]
  onAdd: (id: string) => void; onRemove: (id: string) => void
}) {
  const [search, setSearch] = useState("")
  const [open, setOpen]     = useState(false)

  const getLabel = (id: string) => {
    const c = options.find((x) => x.id === id)
    return c?.fullName || c?.name || c?.email || id
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return options.filter((c) => {
      if (selected.includes(c.id)) return false
      if (!q) return true
      return (c.fullName || c.name || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q)
    })
  }, [options, search, selected])

  return (
    <div className="space-y-2">
      <div className="relative">
        <i className="ri-search-line pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground" />
        <input value={search} onChange={(e) => { setSearch(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)}
          placeholder="Search contacts…"
          className="flex h-9 w-full rounded-xl border border-input bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30" />
      </div>
      {open && (
        <div className="max-h-44 overflow-y-auto rounded-xl border border-input bg-popover shadow-md">
          {filtered.length === 0
            ? <p className="p-3 text-center text-xs text-muted-foreground">{search.trim() ? "No contacts match." : "All contacts already added."}</p>
            : filtered.slice(0, 30).map((c) => (
              <button key={c.id} type="button"
                onMouseDown={(e) => { e.preventDefault(); onAdd(c.id); setSearch(""); setOpen(false) }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-muted">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                  {(c.fullName || c.name || "?").slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.fullName || c.name || c.id}</p>
                  {c.email && <p className="truncate text-[11px] text-muted-foreground">{c.email}</p>}
                </div>
                <i className="ri-add-line ml-auto shrink-0 text-muted-foreground" />
              </button>
            ))
          }
        </div>
      )}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((id) => (
            <span key={id} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
              {getLabel(id)}
              <button type="button" onClick={() => onRemove(id)}><i className="ri-close-line text-xs opacity-60" /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ProjectViewPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [tab, setTab]           = useState<TabId>("overview")
  const [editOpen, setEditOpen] = useState(false)
  const [contactsOpen, setContactsOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [formValues, setFormValues] = useState({
    name: "", description: "", notes: "",
    status: "ACTIVE" as ProjectDetails["status"],
    priority: "MEDIUM" as ProjectDetails["priority"],
    progress: "", startDate: "", endDate: "", budget: "", currency: "USD",
    selectedContactIds: [] as string[],
  })

  const { data, isLoading, isError } = useQuery({
    queryKey: ["projects", "detail", id],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${id}`, { credentials: "include" })
      if (!res.ok) throw new Error()
      return (await res.json()) as { data: ProjectDetails }
    },
    enabled: Boolean(id),
  })

  const { data: contactsData } = useQuery({
    queryKey: ["clients", "picker"],
    queryFn: async () => {
      const p = new URLSearchParams({ page: "1", limit: "200", sortBy: "fullName", sortDir: "asc" })
      const res = await fetch(`/api/clients?${p}`, { credentials: "include" })
      if (!res.ok) throw new Error()
      return ((await res.json()) as { data: ContactOption[] }).data
    },
  })
  const contactOptions = contactsData ?? []

  const project = data?.data

  useEffect(() => {
    if (!project) return
    const ids = project.assignedClientIds?.length ? project.assignedClientIds : (project.contacts?.map((c) => c.id) ?? [])
    setFormValues({
      name: project.name || "",
      description: project.description || "",
      notes: project.notes || "",
      status: project.status || "ACTIVE",
      priority: project.priority || "MEDIUM",
      progress: typeof project.progress === "number" ? String(project.progress) : "",
      startDate: project.startDate ? new Date(project.startDate).toISOString().split("T")[0] : "",
      endDate: project.endDate ? new Date(project.endDate).toISOString().split("T")[0] : "",
      budget: typeof project.budgetCents === "number" ? (project.budgetCents / 100).toString() : "",
      currency: project.currency || "USD",
      selectedContactIds: ids,
    })
  }, [project])

  const editMutation = useMutation({
    mutationFn: async () => {
      const budgetNum = Number(formValues.budget)
      const progressNum = Number(formValues.progress)
      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formValues.name.trim(),
          description: formValues.description || undefined,
          notes: formValues.notes || undefined,
          status: formValues.status,
          priority: formValues.priority,
          progress: Number.isFinite(progressNum) && progressNum >= 0 && progressNum <= 100 ? Math.round(progressNum) : undefined,
          startDate: formValues.startDate || undefined,
          endDate: formValues.endDate || undefined,
          budgetCents: Number.isFinite(budgetNum) && budgetNum > 0 ? Math.round(budgetNum * 100) : undefined,
          currency: formValues.currency || "USD",
          assignedClientIds: formValues.selectedContactIds,
        }),
      })
      if (!res.ok) throw new Error()
      return res.json()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projects", "detail", id] })
      await queryClient.invalidateQueries({ queryKey: ["projects", "list"] })
      setEditOpen(false)
      toast.success("Project updated successfully")
    },
    onError: () => toast.error("Failed to update project."),
  })

  const contactsOnlyMutation = useMutation({
    mutationFn: async (assignedClientIds: string[]) => {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedClientIds }),
      })
      if (!res.ok) throw new Error()
      return res.json()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projects", "detail", id] })
      setContactsOpen(false)
      toast.success("Contacts updated")
    },
    onError: () => toast.error("Failed to update contacts."),
  })

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      if (!project) throw new Error()
      const res = await fetch("/api/projects", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${project.name || "Project"} (copy)`,
          description: project.description || undefined,
          notes: project.notes || undefined,
          status: project.status || "ACTIVE",
          priority: project.priority || "MEDIUM",
          progress: typeof project.progress === "number" ? project.progress : undefined,
          startDate: project.startDate?.slice(0, 10),
          endDate: project.endDate?.slice(0, 10),
          budgetCents: typeof project.budgetCents === "number" && project.budgetCents > 0 ? project.budgetCents : undefined,
          currency: project.currency || "USD",
          assignedClientIds: project.assignedClientIds?.length ? project.assignedClientIds : (project.contacts?.map((c) => c.id) ?? []),
        }),
      })
      if (!res.ok) throw new Error()
      return (await res.json()) as { data: { id: string } }
    },
    onSuccess: async ({ data: created }) => {
      await queryClient.invalidateQueries({ queryKey: ["projects", "list"] })
      toast.success("Project duplicated")
      router.push(`/dashboard/projects/${created.id}`)
    },
    onError: () => toast.error("Failed to duplicate project."),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE", credentials: "include" })
      if (!res.ok) throw new Error()
      return res.json()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projects", "list"] })
      toast.success("Project deleted")
      router.push("/dashboard/projects")
    },
    onError: () => toast.error("Failed to delete project."),
  })

  const daysUntilEnd = project?.endDate != null
    ? Math.ceil((new Date(project.endDate).getTime() - Date.now()) / 86400000)
    : null

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-4 pt-0 lg:px-6">

      {/* ── top action bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={() => router.push("/dashboard/projects")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium transition hover:bg-muted">
          <i className="ri-arrow-left-line text-sm" /> Back to projects
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={!project} onClick={() => setContactsOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium transition hover:bg-muted disabled:opacity-50">
            <i className="ri-user-line text-sm" /> Assign contacts
          </button>
          <button type="button" disabled={!project || duplicateMutation.isPending} onClick={() => duplicateMutation.mutate()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium transition hover:bg-muted disabled:opacity-50">
            <i className="ri-file-copy-line text-sm" /> Duplicate
          </button>
          <button type="button" disabled={!project} onClick={() => setEditOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium transition hover:bg-muted disabled:opacity-50">
            <i className="ri-pencil-line text-sm" /> Edit
          </button>
          <button type="button" disabled={!project} onClick={() => setDeleteOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs font-medium text-destructive transition hover:bg-destructive/10 disabled:opacity-50">
            <i className="ri-delete-bin-line text-sm" /> Delete
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <i className="ri-loader-4-line animate-spin text-xl text-primary" />
          </span>
          <p className="text-sm text-muted-foreground">Loading project…</p>
        </div>
      ) : isError || !project ? (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          <i className="ri-error-warning-line mr-2 text-destructive" /> Unable to load this project.
        </div>
      ) : (
        <>
          {/* ── project header card ── */}
          <div className="rounded-2xl border border-input bg-card shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10">
                  <i className="ri-briefcase-line text-xl text-blue-500" />
                </span>
                <div>
                  <h2 className="text-base font-semibold">{project.name || "Untitled project"}</h2>
                  {project.description && <p className="mt-0.5 text-xs text-muted-foreground">{project.description}</p>}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {project.status && <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLE[project.status])}>{project.status.replace("_", " ")}</span>}
                {project.priority && <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", PRIORITY_STYLE[project.priority])}>{project.priority}</span>}
              </div>
            </div>
            {typeof project.progress === "number" && (
              <div className="px-5 pb-4">
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span className="font-medium text-foreground">{project.progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${project.progress}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* ── tab nav ── */}
          <div className="flex items-center gap-1 rounded-2xl border border-input bg-card p-1 shadow-sm">
            {TABS.map((t) => (
              <button key={t.id} type="button" onClick={() => setTab(t.id)}
                className={cn("inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition sm:flex-none sm:px-4",
                  tab === t.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"
                )}>
                <i className={cn(t.icon, "text-sm")} />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>

          {/* ── tab content ── */}
          {tab === "overview" && (
            <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
              <div className="rounded-2xl border border-input bg-card shadow-sm">
                <div className="grid gap-4 p-5 md:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Start date</p>
                    <p className="mt-0.5 text-sm">{project.startDate ? new Date(project.startDate).toLocaleDateString() : "—"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">End date</p>
                    <p className="mt-0.5 text-sm">{project.endDate ? new Date(project.endDate).toLocaleDateString() : "—"}</p>
                  </div>
                  {daysUntilEnd != null && !Number.isNaN(daysUntilEnd) && (
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Timeline</p>
                      <p className={cn("mt-0.5 text-sm font-medium",
                        daysUntilEnd < 0 ? "text-red-500" : daysUntilEnd <= 7 ? "text-amber-500" : "text-foreground"
                      )}>
                        {daysUntilEnd >= 0 ? `${daysUntilEnd} days remaining` : `${Math.abs(daysUntilEnd)} days overdue`}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Budget</p>
                    <p className="mt-0.5 text-sm">
                      {typeof project.budgetCents === "number"
                        ? `${project.currency || "USD"} ${(project.budgetCents / 100).toFixed(2)}`
                        : "—"}
                    </p>
                  </div>
                  {project.description && (
                    <div className="md:col-span-2">
                      <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Description</p>
                      <p className="mt-0.5 text-sm">{project.description}</p>
                    </div>
                  )}
                  {project.notes && (
                    <div className="md:col-span-2">
                      <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Internal notes</p>
                      <p className="mt-0.5 whitespace-pre-wrap text-sm text-muted-foreground">{project.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* contacts sidebar */}
              <div className="rounded-2xl border border-input bg-card shadow-sm">
                <div className="flex items-center justify-between border-b border-input px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10">
                      <i className="ri-group-line text-sm text-blue-500" />
                    </span>
                    <p className="text-sm font-semibold">Contacts</p>
                  </div>
                  <span className="rounded-full border border-input bg-muted px-2 py-0.5 text-[11px] font-medium">{project.contacts?.length ?? 0}</span>
                </div>
                <div className="p-4">
                  {(project.contacts?.length ?? 0) === 0
                    ? <p className="text-xs text-muted-foreground">No contacts assigned yet.</p>
                    : <ul className="space-y-2">
                      {project.contacts!.map((c) => (
                        <li key={c.id} className="flex items-center gap-2">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full overflow-hidden">
                            <img
                              src={getDicebearUrl(c.name || c.email || c.id)}
                              alt={c.name}
                              className="size-full object-cover"
                            />
                          </span>
                          <div className="min-w-0">
                            <Link href={`/dashboard/clients/${c.id}`} className="block truncate text-sm font-medium hover:text-primary hover:underline underline-offset-4 transition">
                              {c.name}
                            </Link>
                            {c.email && <p className="truncate text-[11px] text-muted-foreground">{c.email}</p>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  }
                  <button type="button" onClick={() => setContactsOpen(true)} disabled={!project}
                    className="mt-4 w-full rounded-lg border border-input px-3 py-1.5 text-xs font-medium transition hover:bg-muted disabled:opacity-50">
                    <i className="ri-user-add-line mr-1.5" /> Manage assignments
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === "tasks"  && id && <TasksTab  projectId={id} />}
          {tab === "notes"  && id && <NotesTab  projectId={id} />}
          {tab === "events" && id && <EventsTab projectId={id} />}
        </>
      )}

      {/* ── Edit dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[min(90vh,44rem)] w-[min(95vw,58rem)] overflow-y-auto rounded-2xl p-0" showCloseButton={false}>
          <form onSubmit={(e: FormEvent<HTMLFormElement>) => { e.preventDefault(); if (!formValues.name.trim()) return; editMutation.mutate() }} className="space-y-4 p-6">
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
              <DialogDescription>Update project information and save changes.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="e-name">Project name</Label>
                <Input id="e-name" required value={formValues.name} onChange={(e) => setFormValues((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="e-desc">Description</Label>
                <Input id="e-desc" value={formValues.description} onChange={(e) => setFormValues((p) => ({ ...p, description: e.target.value }))} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formValues.status ?? "ACTIVE"} onValueChange={(v) => setFormValues((p) => ({ ...p, status: v as ProjectDetails["status"] }))}>
                  <SelectTrigger className="mt-1.5 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["DRAFT","ACTIVE","ON_HOLD","COMPLETED","CANCELLED"].map((s) => <SelectItem key={s} value={s}>{s.replace("_"," ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={formValues.priority ?? "MEDIUM"} onValueChange={(v) => setFormValues((p) => ({ ...p, priority: v as ProjectDetails["priority"] }))}>
                  <SelectTrigger className="mt-1.5 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["LOW","MEDIUM","HIGH"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="e-progress">Progress (%)</Label>
                <Input id="e-progress" type="number" min={0} max={100} value={formValues.progress} onChange={(e) => setFormValues((p) => ({ ...p, progress: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="e-budget">Budget</Label>
                <Input id="e-budget" type="number" min="0" step="0.01" value={formValues.budget} onChange={(e) => setFormValues((p) => ({ ...p, budget: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="e-start">Start date</Label>
                <Input id="e-start" type="date" value={formValues.startDate} onChange={(e) => setFormValues((p) => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="e-end">End date</Label>
                <Input id="e-end" type="date" value={formValues.endDate} onChange={(e) => setFormValues((p) => ({ ...p, endDate: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <Label className="mb-1.5 block">Contacts</Label>
                <ContactCombobox
                  options={contactOptions}
                  selected={formValues.selectedContactIds}
                  onAdd={(cid) => setFormValues((p) => ({ ...p, selectedContactIds: [...p.selectedContactIds, cid] }))}
                  onRemove={(cid) => setFormValues((p) => ({ ...p, selectedContactIds: p.selectedContactIds.filter((x) => x !== cid) }))}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="e-notes">Internal notes</Label>
                <textarea id="e-notes" rows={3} value={formValues.notes} onChange={(e) => setFormValues((p) => ({ ...p, notes: e.target.value }))}
                  className="mt-1.5 flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={editMutation.isPending || !formValues.name.trim()}>
                {editMutation.isPending ? <><i className="ri-loader-4-line animate-spin" /> Saving…</> : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Assign contacts dialog ── */}
      <Dialog open={contactsOpen} onOpenChange={setContactsOpen}>
        <DialogContent className="max-h-[min(90vh,32rem)] w-[min(92vw,28rem)] overflow-y-auto rounded-2xl" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Assign contacts</DialogTitle>
            <DialogDescription>Select which contacts are linked to this project.</DialogDescription>
          </DialogHeader>
          <ContactCombobox
            options={contactOptions}
            selected={formValues.selectedContactIds}
            onAdd={(cid) => setFormValues((p) => ({ ...p, selectedContactIds: [...p.selectedContactIds, cid] }))}
            onRemove={(cid) => setFormValues((p) => ({ ...p, selectedContactIds: p.selectedContactIds.filter((x) => x !== cid) }))}
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setContactsOpen(false)}>Cancel</Button>
            <Button type="button" disabled={contactsOnlyMutation.isPending} onClick={() => contactsOnlyMutation.mutate(formValues.selectedContactIds)}>
              {contactsOnlyMutation.isPending ? <><i className="ri-loader-4-line animate-spin" /> Saving…</> : "Save assignments"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete dialog ── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="w-[min(92vw,28rem)] rounded-2xl" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
            <DialogDescription>Are you sure? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button type="button" variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
              {deleteMutation.isPending ? <><i className="ri-loader-4-line animate-spin" /> Deleting…</> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
