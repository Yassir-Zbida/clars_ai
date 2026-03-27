"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type ProjectEvent = {
  id: string
  title: string
  description?: string | null
  date: string
  type: "MEETING" | "DEADLINE" | "MILESTONE" | "CALL" | "OTHER"
  completed: boolean
}

const TYPE_CONFIG: Record<ProjectEvent["type"], { icon: string; bg: string; color: string }> = {
  MEETING:   { icon: "ri-group-line",             bg: "bg-blue-500/10",    color: "text-blue-500" },
  DEADLINE:  { icon: "ri-alarm-warning-line",     bg: "bg-red-500/10",     color: "text-red-500" },
  MILESTONE: { icon: "ri-flag-2-line",            bg: "bg-amber-500/10",   color: "text-amber-500" },
  CALL:      { icon: "ri-phone-line",             bg: "bg-emerald-500/10", color: "text-emerald-500" },
  OTHER:     { icon: "ri-calendar-event-line",    bg: "bg-muted",          color: "text-muted-foreground" },
}

const EVENT_TYPES = ["MEETING", "DEADLINE", "MILESTONE", "CALL", "OTHER"] as const

const EMPTY_FORM = { title: "", description: "", date: "", type: "OTHER" as ProjectEvent["type"], completed: false }

type Props = { projectId: string }

export function EventsTab({ projectId }: Props) {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing]   = useState<ProjectEvent | null>(null)
  const [form, setForm]         = useState<typeof EMPTY_FORM>(EMPTY_FORM)

  const { data, isLoading } = useQuery({
    queryKey: ["project-events", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/events`, { credentials: "include" })
      if (!res.ok) throw new Error()
      return ((await res.json()) as { data: ProjectEvent[] }).data
    },
  })
  const events = data ?? []

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/events`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title, description: form.description || undefined, date: form.date, type: form.type, completed: form.completed }),
      })
      if (!res.ok) throw new Error()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-events", projectId] })
      setFormOpen(false)
      setForm(EMPTY_FORM)
      toast.success("Event added")
    },
    onError: () => toast.error("Failed to add event"),
  })

  const updateMutation = useMutation({
    mutationFn: async (patch: Partial<ProjectEvent> & { id: string }) => {
      const { id, ...rest } = patch
      const res = await fetch(`/api/projects/${projectId}/events/${id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rest),
      })
      if (!res.ok) throw new Error()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-events", projectId] })
      setFormOpen(false)
      setEditing(null)
      setForm(EMPTY_FORM)
      toast.success("Event updated")
    },
    onError: () => toast.error("Failed to update event"),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/projects/${projectId}/events/${id}`, { method: "DELETE", credentials: "include" })
      if (!res.ok) throw new Error()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-events", projectId] })
      toast("Event deleted", { icon: <i className="ri-delete-bin-line text-base" /> })
    },
    onError: () => toast.error("Failed to delete event"),
  })

  function openEdit(ev: ProjectEvent) {
    setEditing(ev)
    setForm({ title: ev.title, description: ev.description || "", date: ev.date.slice(0, 10), type: ev.type, completed: ev.completed })
    setFormOpen(true)
  }

  function handleSubmit() {
    if (!form.title.trim() || !form.date) return
    if (editing) {
      updateMutation.mutate({ id: editing.id, title: form.title, description: form.description || undefined, date: form.date, type: form.type, completed: form.completed })
    } else {
      createMutation.mutate()
    }
  }

  const upcoming = events.filter((e) => !e.completed && new Date(e.date) >= new Date())
  const past     = events.filter((e) =>  e.completed || new Date(e.date) <  new Date())

  return (
    <div className="space-y-4">
      {/* toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10">
            <i className="ri-calendar-event-line text-sm text-primary" />
          </span>
          <div>
            <p className="text-sm font-semibold">Events &amp; Milestones</p>
            <p className="text-[11px] text-muted-foreground">{events.length} event{events.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <button type="button" onClick={() => { setEditing(null); setForm(EMPTY_FORM); setFormOpen(true) }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90">
          <i className="ri-calendar-add-line" /> Add event
        </button>
      </div>

      {/* inline form */}
      {formOpen && (
        <div className="rounded-2xl border border-input bg-card p-4 shadow-sm space-y-3">
          <p className="text-sm font-semibold">{editing ? "Edit event" : "New event"}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Event title…" autoFocus
              className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30" />
            <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30" />
          </div>
          <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Description (optional)…" rows={2}
            className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30" />
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <p className="mb-1 text-[11px] uppercase tracking-widest font-semibold text-muted-foreground">Type</p>
              <div className="flex flex-wrap gap-1">
                {EVENT_TYPES.map((t) => (
                  <button key={t} type="button" onClick={() => setForm((f) => ({ ...f, type: t }))}
                    className={cn("rounded-lg border px-2.5 py-1 text-[11px] font-medium transition",
                      form.type === t ? "border-primary/40 bg-primary/10 text-primary" : "border-input bg-muted/40 text-muted-foreground hover:bg-muted"
                    )}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.completed} onChange={(e) => setForm((f) => ({ ...f, completed: e.target.checked }))}
                className="rounded border-input" />
              <span className="text-xs font-medium">Mark as completed</span>
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted transition">Cancel</button>
            <button type="button" onClick={handleSubmit} disabled={!form.title.trim() || !form.date || createMutation.isPending || updateMutation.isPending}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition">
              {editing ? "Save changes" : "Add event"}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex h-32 items-center justify-center gap-2 text-muted-foreground">
          <i className="ri-loader-4-line animate-spin" /> Loading events…
        </div>
      ) : events.length === 0 && !formOpen ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-input py-16 text-center">
          <i className="ri-calendar-2-line text-3xl text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No events yet</p>
          <p className="text-xs text-muted-foreground/60">Add meetings, deadlines, and milestones.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Upcoming</p>
              <div className="space-y-2">
                {upcoming.map((ev) => <EventRow key={ev.id} ev={ev} onEdit={openEdit} onDelete={(id) => deleteMutation.mutate(id)} onToggle={(id, c) => updateMutation.mutate({ id, completed: c })} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Past / Completed</p>
              <div className="space-y-2">
                {past.map((ev) => <EventRow key={ev.id} ev={ev} onEdit={openEdit} onDelete={(id) => deleteMutation.mutate(id)} onToggle={(id, c) => updateMutation.mutate({ id, completed: c })} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EventRow({ ev, onEdit, onDelete, onToggle }: {
  ev: ProjectEvent
  onEdit: (e: ProjectEvent) => void
  onDelete: (id: string) => void
  onToggle: (id: string, completed: boolean) => void
}) {
  const cfg = TYPE_CONFIG[ev.type]
  const isPast = new Date(ev.date) < new Date()

  return (
    <div className={cn("group flex items-start gap-3 rounded-xl border border-input bg-card p-3 transition hover:border-primary/20", ev.completed && "opacity-60")}>
      <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg", cfg.bg)}>
        <i className={cn(cfg.icon, cfg.color, "text-sm")} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn("text-sm font-medium", ev.completed && "line-through")}>{ev.title}</p>
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", cfg.bg, cfg.color)}>{ev.type}</span>
          {ev.completed && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">Done</span>}
          {!ev.completed && isPast && <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-500">Overdue</span>}
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          <i className="ri-calendar-line mr-1" />
          {new Date(ev.date).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
        </p>
        {ev.description && <p className="mt-1 text-xs text-muted-foreground">{ev.description}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition">
        <button type="button" onClick={() => onToggle(ev.id, !ev.completed)} title={ev.completed ? "Mark incomplete" : "Mark complete"}
          className={cn("flex size-7 items-center justify-center rounded-lg border transition",
            ev.completed ? "border-input hover:bg-muted" : "border-emerald-500/30 bg-emerald-500/5 text-emerald-500 hover:bg-emerald-500/10"
          )}>
          <i className={ev.completed ? "ri-refresh-line text-xs" : "ri-check-line text-xs"} />
        </button>
        <button type="button" onClick={() => onEdit(ev)}
          className="flex size-7 items-center justify-center rounded-lg border border-input transition hover:bg-muted">
          <i className="ri-pencil-line text-xs" />
        </button>
        <button type="button" onClick={() => onDelete(ev.id)}
          className="flex size-7 items-center justify-center rounded-lg border border-destructive/30 text-destructive transition hover:bg-destructive/10">
          <i className="ri-delete-bin-line text-xs" />
        </button>
      </div>
    </div>
  )
}
