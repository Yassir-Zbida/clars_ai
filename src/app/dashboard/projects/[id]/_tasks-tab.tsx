"use client"

import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core"
import { cn } from "@/lib/utils"

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */
type TaskStatus   = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE"
type TaskPriority = "LOW" | "MEDIUM" | "HIGH"

type Task = {
  id: string
  title: string
  description?: string | null
  status: TaskStatus
  priority: TaskPriority
  dueDate?: string | null
  order?: number
}

/* ─────────────────────────────────────────────────────────────
   Column definitions
───────────────────────────────────────────────────────────── */
const COLUMNS: {
  id: TaskStatus
  label: string
  icon: string
  accent: string
  headerBg: string
  dot: string
}[] = [
  {
    id: "TODO",
    label: "To Do",
    icon: "ri-circle-line",
    accent: "border-slate-300 dark:border-slate-700",
    headerBg: "bg-slate-50 dark:bg-slate-900/40",
    dot: "bg-slate-400",
  },
  {
    id: "IN_PROGRESS",
    label: "In Progress",
    icon: "ri-loader-2-line",
    accent: "border-amber-300 dark:border-amber-800",
    headerBg: "bg-amber-50 dark:bg-amber-900/20",
    dot: "bg-amber-400",
  },
  {
    id: "IN_REVIEW",
    label: "In Review",
    icon: "ri-eye-line",
    accent: "border-violet-300 dark:border-violet-800",
    headerBg: "bg-violet-50 dark:bg-violet-900/20",
    dot: "bg-violet-400",
  },
  {
    id: "DONE",
    label: "Done",
    icon: "ri-checkbox-circle-line",
    accent: "border-emerald-300 dark:border-emerald-800",
    headerBg: "bg-emerald-50 dark:bg-emerald-900/20",
    dot: "bg-emerald-400",
  },
]

const COLUMN_IDS = new Set(COLUMNS.map((c) => c.id))

const STATUS_BADGE: Record<TaskStatus, string> = {
  TODO:        "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  IN_PROGRESS: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  IN_REVIEW:   "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400",
  DONE:        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-500",
}

const PRIORITY_BADGE: Record<TaskPriority, string> = {
  LOW:    "bg-muted text-muted-foreground",
  MEDIUM: "bg-primary/10 text-primary",
  HIGH:   "bg-red-500/10 text-red-500",
}

/* ─────────────────────────────────────────────────────────────
   Draggable task card
───────────────────────────────────────────────────────────── */
function DraggableCard({ task, onEdit, onDelete, isActivelyDragging }: {
  task: Task
  onEdit: (t: Task) => void
  onDelete: (id: string) => void
  isActivelyDragging: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  const overdue = task.dueDate && task.status !== "DONE" && new Date(task.dueDate) < new Date()

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-xl border border-input bg-card p-3 shadow-sm transition-all select-none",
        isDragging && "opacity-30 shadow-none",
        isActivelyDragging && "cursor-grabbing",
        !isDragging && !isActivelyDragging && "hover:border-primary/40 hover:shadow-md cursor-grab active:cursor-grabbing",
      )}
    >
      {/* drag handle + title */}
      <div className="flex items-start gap-2" {...listeners} {...attributes}>
        <i className="ri-draggable mt-0.5 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground/80 transition-colors" />
        <p className={cn(
          "flex-1 text-sm font-medium leading-snug",
          task.status === "DONE" && "line-through text-muted-foreground",
        )}>
          {task.title}
        </p>
      </div>

      {task.description && (
        <p className="ml-5 mt-1 line-clamp-2 text-[11px] text-muted-foreground">{task.description}</p>
      )}

      <div className="ml-5 mt-2 flex flex-wrap items-center gap-1.5">
        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", PRIORITY_BADGE[task.priority])}>
          {task.priority}
        </span>
        {task.dueDate && (
          <span className={cn("text-[10px]", overdue ? "font-medium text-red-500" : "text-muted-foreground")}>
            <i className={cn("mr-0.5", overdue ? "ri-alarm-warning-line" : "ri-calendar-line")} />
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* action buttons — only visible on hover */}
      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onEdit(task) }}
          className="flex size-6 items-center justify-center rounded-lg border border-input bg-card transition hover:bg-muted"
        >
          <i className="ri-pencil-line text-[10px]" />
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onDelete(task.id) }}
          className="flex size-6 items-center justify-center rounded-lg border border-destructive/30 bg-card text-destructive transition hover:bg-destructive/10"
        >
          <i className="ri-delete-bin-line text-[10px]" />
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Droppable kanban column
───────────────────────────────────────────────────────────── */
function DroppableColumn({ col, tasks, onEdit, onDelete, activeId }: {
  col: typeof COLUMNS[number]
  tasks: Task[]
  onEdit: (t: Task) => void
  onDelete: (id: string) => void
  activeId: string | null
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id })

  return (
    <div className={cn(
      "flex min-w-[240px] flex-1 flex-col rounded-2xl border-2 transition-colors",
      col.accent,
      isOver && "ring-2 ring-primary/40 ring-offset-2 ring-offset-background",
    )}>
      {/* column header */}
      <div className={cn("flex items-center justify-between rounded-t-xl px-3 py-2.5", col.headerBg)}>
        <div className="flex items-center gap-2">
          <span className={cn("size-2 rounded-full", col.dot)} />
          <span className="text-xs font-semibold">{col.label}</span>
        </div>
        <span className="rounded-full bg-background/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {tasks.length}
        </span>
      </div>

      {/* drop zone */}
      <div ref={setNodeRef} className={cn(
        "flex flex-1 flex-col gap-2 rounded-b-2xl p-2.5 transition-colors",
        isOver && "bg-primary/5",
        tasks.length === 0 && "min-h-[100px] items-center justify-center",
      )}>
        {tasks.length === 0 ? (
          <p className={cn(
            "text-[11px] text-muted-foreground/50 transition-opacity",
            isOver && "opacity-0",
          )}>
            Drop here
          </p>
        ) : (
          tasks.map((t) => (
            <DraggableCard
              key={t.id}
              task={t}
              onEdit={onEdit}
              onDelete={onDelete}
              isActivelyDragging={activeId !== null}
            />
          ))
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   TasksTab
───────────────────────────────────────────────────────────── */
type Props = { projectId: string }

const EMPTY_FORM = {
  title: "", description: "",
  status: "TODO" as TaskStatus,
  priority: "MEDIUM" as TaskPriority,
  dueDate: "",
}

const ALL_STATUSES:  TaskStatus[]   = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]
const ALL_PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH"]

export function TasksTab({ projectId }: Props) {
  const queryClient = useQueryClient()
  const [view,       setView]      = useState<"kanban" | "list">("kanban")
  const [formOpen,   setFormOpen]  = useState(false)
  const [editing,    setEditing]   = useState<Task | null>(null)
  const [activeId,   setActiveId]  = useState<string | null>(null)
  const [form,       setForm]      = useState(EMPTY_FORM)
  /* optimistic local copy for instant visual feedback during drag */
  const [localTasks, setLocalTasks] = useState<Task[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  const { data, isLoading } = useQuery({
    queryKey: ["project-tasks", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/tasks`, { credentials: "include" })
      if (!res.ok) throw new Error()
      return ((await res.json()) as { data: Task[] }).data
    },
  })

  /* keep local tasks in sync with server data */
  useEffect(() => {
    if (data) setLocalTasks(data)
  }, [data])

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Task> & { id: string }) => {
      const res = await fetch(`/api/projects/${projectId}/tasks/${id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error()
      return (await res.json()) as { data: Task }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] }),
    onError: () => {
      /* revert optimistic on failure */
      if (data) setLocalTasks(data)
      toast.error("Failed to move task")
    },
  })

  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: payload.title,
          description: payload.description || undefined,
          status: payload.status,
          priority: payload.priority,
          dueDate: payload.dueDate || undefined,
        }),
      })
      if (!res.ok) throw new Error()
      return (await res.json()) as { data: Task }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] })
      setFormOpen(false)
      setForm(EMPTY_FORM)
      toast.success("Task created")
    },
    onError: () => toast.error("Failed to create task"),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/projects/${projectId}/tasks/${id}`, { method: "DELETE", credentials: "include" })
      if (!res.ok) throw new Error()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] })
      toast("Task deleted", { icon: <i className="ri-delete-bin-line text-base" /> })
    },
    onError: () => toast.error("Failed to delete task"),
  })

  function openEdit(t: Task) {
    setEditing(t)
    setForm({
      title: t.title,
      description: t.description || "",
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate ? t.dueDate.slice(0, 10) : "",
    })
    setFormOpen(true)
  }

  function handleSubmit() {
    if (!form.title.trim()) return
    if (editing) {
      updateMutation.mutate({
        id: editing.id,
        title: form.title,
        description: form.description || undefined,
        status: form.status,
        priority: form.priority,
        dueDate: form.dueDate || undefined,
      })
      setEditing(null)
      setFormOpen(false)
      toast.success("Task updated")
    } else {
      createMutation.mutate(form)
    }
  }

  /* ── drag handlers ── */
  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id))
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over) return

    const dragId  = String(active.id)
    const overId  = String(over.id)

    /* resolve the target column */
    let targetStatus: TaskStatus | null = null

    if (COLUMN_IDS.has(overId as TaskStatus)) {
      targetStatus = overId as TaskStatus
    } else {
      const overTask = localTasks.find((t) => t.id === overId)
      if (overTask) targetStatus = overTask.status
    }

    if (!targetStatus) return

    const dragTask = localTasks.find((t) => t.id === dragId)
    if (!dragTask || dragTask.status === targetStatus) return

    /* optimistic update — instant visual change */
    setLocalTasks((prev) =>
      prev.map((t) => t.id === dragId ? { ...t, status: targetStatus! } : t)
    )

    /* persist to server (no success toast so UX stays quiet) */
    updateMutation.mutate({ id: dragId, status: targetStatus })
  }

  const activeTask = localTasks.find((t) => t.id === activeId)
  const tasksByStatus = (s: TaskStatus) => localTasks.filter((t) => t.status === s)

  return (
    <div className="space-y-4">

      {/* ── toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-input p-1">
          {(["kanban", "list"] as const).map((v) => (
            <button key={v} type="button" onClick={() => setView(v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
                view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}>
              <i className={v === "kanban" ? "ri-layout-column-line" : "ri-list-check"} />
              {v === "kanban" ? "Kanban" : "List"}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => { setEditing(null); setForm(EMPTY_FORM); setFormOpen(true) }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          <i className="ri-add-line" /> Add task
        </button>
      </div>

      {/* ── inline form ── */}
      {formOpen && (
        <div className="space-y-3 rounded-2xl border border-input bg-card p-4 shadow-sm">
          <p className="text-sm font-semibold">{editing ? "Edit task" : "New task"}</p>

          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Task title…"
            autoFocus
            className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          />

          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Description (optional)…"
            rows={2}
            className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          />

          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[180px]">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Status</p>
              <div className="flex flex-wrap gap-1">
                {ALL_STATUSES.map((s) => (
                  <button key={s} type="button" onClick={() => setForm((f) => ({ ...f, status: s }))}
                    className={cn(
                      "rounded-lg border px-2.5 py-1 text-[11px] font-medium transition",
                      form.status === s
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-input bg-muted/40 text-muted-foreground hover:bg-muted",
                    )}>
                    {s.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 min-w-[140px]">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Priority</p>
              <div className="flex flex-wrap gap-1">
                {ALL_PRIORITIES.map((p) => (
                  <button key={p} type="button" onClick={() => setForm((f) => ({ ...f, priority: p }))}
                    className={cn(
                      "rounded-lg border px-2.5 py-1 text-[11px] font-medium transition",
                      form.priority === p
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-input bg-muted/40 text-muted-foreground hover:bg-muted",
                    )}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-w-[140px]">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Due date</p>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="h-8 rounded-xl border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => { setFormOpen(false); setEditing(null) }}
              className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium transition hover:bg-muted">
              Cancel
            </button>
            <button type="button" onClick={handleSubmit}
              disabled={!form.title.trim() || createMutation.isPending || updateMutation.isPending}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50">
              {editing ? "Save changes" : "Create task"}
            </button>
          </div>
        </div>
      )}

      {/* ── loading / empty ── */}
      {isLoading ? (
        <div className="flex h-32 items-center justify-center gap-2 text-muted-foreground">
          <i className="ri-loader-4-line animate-spin" /> Loading tasks…
        </div>
      ) : localTasks.length === 0 && !formOpen ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-input py-16 text-center">
          <i className="ri-task-line text-3xl text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No tasks yet</p>
          <p className="text-xs text-muted-foreground/60">Click "Add task" to get started.</p>
        </div>
      ) : view === "kanban" ? (

        /* ── KANBAN ── */
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-3">
            {COLUMNS.map((col) => (
              <DroppableColumn
                key={col.id}
                col={col}
                tasks={tasksByStatus(col.id)}
                onEdit={openEdit}
                onDelete={(id) => deleteMutation.mutate(id)}
                activeId={activeId}
              />
            ))}
          </div>

          {/* floating drag overlay */}
          <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
            {activeTask && (
              <div className="w-[240px] rotate-[2deg] rounded-xl border-2 border-primary/40 bg-card p-3 shadow-2xl">
                <p className="text-sm font-medium">{activeTask.title}</p>
                {activeTask.description && (
                  <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{activeTask.description}</p>
                )}
                <div className="mt-2 flex gap-1.5">
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", PRIORITY_BADGE[activeTask.priority])}>
                    {activeTask.priority}
                  </span>
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>

      ) : (

        /* ── LIST VIEW ── */
        <div className="overflow-hidden rounded-2xl border border-input bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-input bg-muted/30 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                <th className="px-4 py-2.5">Task</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Priority</th>
                <th className="hidden px-4 py-2.5 sm:table-cell">Due</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-input">
              {localTasks.map((t) => (
                <tr key={t.id} className="transition hover:bg-muted/30">
                  <td className="px-4 py-2.5">
                    <p className={cn("font-medium", t.status === "DONE" && "line-through text-muted-foreground")}>
                      {t.title}
                    </p>
                    {t.description && (
                      <p className="max-w-xs truncate text-[11px] text-muted-foreground">{t.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", STATUS_BADGE[t.status])}>
                      {t.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", PRIORITY_BADGE[t.priority])}>
                      {t.priority}
                    </span>
                  </td>
                  <td className="hidden px-4 py-2.5 text-xs text-muted-foreground sm:table-cell">
                    {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(t)}
                        className="flex size-7 items-center justify-center rounded-lg border border-input transition hover:bg-muted">
                        <i className="ri-pencil-line text-xs" />
                      </button>
                      <button onClick={() => deleteMutation.mutate(t.id)}
                        className="flex size-7 items-center justify-center rounded-lg border border-destructive/30 text-destructive transition hover:bg-destructive/10">
                        <i className="ri-delete-bin-line text-xs" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
