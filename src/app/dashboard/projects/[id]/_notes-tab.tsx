"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type Note = {
  id: string
  title?: string | null
  content: string
  createdAt?: string
  updatedAt?: string
}

type Props = { projectId: string }

function timeAgo(iso?: string) {
  if (!iso) return ""
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export function NotesTab({ projectId }: Props) {
  const queryClient = useQueryClient()
  const [active, setActive] = useState<Note | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title: "", content: "" })

  const { data, isLoading } = useQuery({
    queryKey: ["project-notes", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/notes`, { credentials: "include" })
      if (!res.ok) throw new Error()
      return ((await res.json()) as { data: Note[] }).data
    },
  })
  const notes = data ?? []

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/notes`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title.trim() || undefined, content: form.content.trim() }),
      })
      if (!res.ok) throw new Error()
      return ((await res.json()) as { data: Note }).data
    },
    onSuccess: (note) => {
      queryClient.invalidateQueries({ queryKey: ["project-notes", projectId] })
      setCreating(false)
      setForm({ title: "", content: "" })
      setActive(note)
      toast.success("Note saved")
    },
    onError: () => toast.error("Failed to save note"),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, title, content }: { id: string; title?: string; content: string }) => {
      const res = await fetch(`/api/projects/${projectId}/notes/${id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title?.trim() || undefined, content: content.trim() }),
      })
      if (!res.ok) throw new Error()
      return ((await res.json()) as { data: Note }).data
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["project-notes", projectId] })
      setActive(updated)
      toast.success("Note updated")
    },
    onError: () => toast.error("Failed to update note"),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/projects/${projectId}/notes/${id}`, { method: "DELETE", credentials: "include" })
      if (!res.ok) throw new Error()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-notes", projectId] })
      setActive(null)
      toast("Note deleted", { icon: <i className="ri-delete-bin-line text-base" /> })
    },
    onError: () => toast.error("Failed to delete note"),
  })

  function openNote(n: Note) {
    setCreating(false)
    setActive(n)
    setForm({ title: n.title || "", content: n.content })
  }

  function startNew() {
    setActive(null)
    setCreating(true)
    setForm({ title: "", content: "" })
  }

  return (
    <div className="flex h-full gap-4" style={{ minHeight: 420 }}>
      {/* sidebar */}
      <div className="flex w-56 shrink-0 flex-col gap-2">
        <button type="button" onClick={startNew}
          className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-medium text-primary transition hover:bg-primary/10">
          <i className="ri-sticky-note-add-line text-sm" /> New note
        </button>
        {isLoading ? (
          <div className="flex h-24 items-center justify-center text-muted-foreground">
            <i className="ri-loader-4-line animate-spin text-sm" />
          </div>
        ) : notes.length === 0 && !creating ? (
          <p className="px-1 text-xs text-muted-foreground">No notes yet.</p>
        ) : (
          <div className="flex flex-col gap-1 overflow-y-auto">
            {notes.map((n) => (
              <button key={n.id} type="button" onClick={() => openNote(n)}
                className={cn("w-full rounded-xl border p-2.5 text-left transition",
                  active?.id === n.id ? "border-primary/30 bg-primary/5" : "border-input hover:bg-muted"
                )}>
                <p className="truncate text-xs font-medium">{n.title || "Untitled"}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{n.content}</p>
                <p className="mt-1 text-[10px] text-muted-foreground/60">{timeAgo(n.updatedAt)}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* editor */}
      <div className="flex flex-1 flex-col rounded-2xl border border-input bg-card p-4 shadow-sm">
        {!creating && !active ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <i className="ri-sticky-note-2-line text-4xl text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Select a note or create a new one</p>
          </div>
        ) : (
          <>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Note title (optional)…"
              className="mb-3 border-0 bg-transparent text-base font-semibold outline-none placeholder:text-muted-foreground/50 focus:outline-none"
            />
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              placeholder="Write your note here…"
              className="flex-1 resize-none border-0 bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground/50 focus:outline-none"
              style={{ minHeight: 200 }}
            />
            <div className="mt-3 flex items-center justify-between border-t border-input pt-3">
              {active && (
                <button type="button" onClick={() => deleteMutation.mutate(active.id)}
                  className="inline-flex items-center gap-1 text-xs text-destructive hover:underline underline-offset-4 transition">
                  <i className="ri-delete-bin-line" /> Delete
                </button>
              )}
              <div className={cn("flex gap-2 ml-auto")}>
                {active ? (
                  <button type="button"
                    onClick={() => updateMutation.mutate({ id: active.id, title: form.title, content: form.content })}
                    disabled={!form.content.trim() || updateMutation.isPending}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50">
                    {updateMutation.isPending ? "Saving…" : "Save changes"}
                  </button>
                ) : (
                  <button type="button"
                    onClick={() => createMutation.mutate()}
                    disabled={!form.content.trim() || createMutation.isPending}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50">
                    {createMutation.isPending ? "Saving…" : "Save note"}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
