"use client"

import { FormEvent, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { getDicebearUrl } from "@/lib/dicebear"

type ContactComboboxProps = {
  options: ContactOption[]
  selected: string[]
  onAdd: (id: string) => void
  onRemove: (id: string) => void
  label?: (id: string) => string
}

function ContactCombobox({ options, selected, onAdd, onRemove, label }: ContactComboboxProps) {
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return options.filter((c) => {
      if (selected.includes(c.id)) return false
      if (!q) return true
      return (c.fullName || c.name || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q)
    })
  }, [options, search, selected])

  const getLabel = (id: string) => {
    if (label) return label(id)
    const c = options.find((x) => x.id === id)
    return c?.fullName || c?.name || c?.email || id
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <i className="ri-search-line pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search contacts…"
          className="flex h-9 w-full rounded-xl border border-input bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        />
      </div>

      {open && (
        <div className="max-h-44 overflow-y-auto rounded-xl border border-input bg-popover shadow-md">
          {filtered.length === 0 ? (
            <p className="p-3 text-center text-xs text-muted-foreground">
              {search.trim() ? "No contacts match your search." : "All contacts already added."}
            </p>
          ) : (
            filtered.slice(0, 30).map((c) => (
              <button
                key={c.id} type="button"
                onMouseDown={(e) => { e.preventDefault(); onAdd(c.id); setSearch(""); setOpen(false) }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-muted"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full overflow-hidden">
                  <img src={getDicebearUrl(c.fullName || c.name || c.email || c.id)} alt="" className="size-full object-cover" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.fullName || c.name || c.id}</p>
                  {c.email && <p className="truncate text-[11px] text-muted-foreground">{c.email}</p>}
                </div>
                <i className="ri-add-line ml-auto shrink-0 text-muted-foreground" />
              </button>
            ))
          )}
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((id) => (
            <span key={id} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
              {getLabel(id)}
              <button type="button" onClick={() => onRemove(id)}>
                <i className="ri-close-line text-xs opacity-60" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

type ProjectItem = {
  id: string
  name?: string | null
  description?: string | null
  status?: "DRAFT" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED" | null
  priority?: "LOW" | "MEDIUM" | "HIGH" | null
  progress?: number | null
  startDate?: string | null
  endDate?: string | null
  budgetCents?: number | null
  currency?: string | null
  contacts?: Array<{ id: string; name: string; email?: string | null }>
}

type ContactOption = { id: string; fullName?: string; name?: string; email?: string }

const STATUS_OPTS   = ["DRAFT", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"] as const
const PRIORITY_OPTS = ["LOW", "MEDIUM", "HIGH"] as const
const SORT_OPTS     = [
  { value: "createdAt",  label: "Date created" },
  { value: "updatedAt",  label: "Last updated" },
  { value: "name",       label: "Name" },
  { value: "priority",   label: "Priority" },
  { value: "status",     label: "Status" },
  { value: "progress",   label: "Progress" },
  { value: "budgetCents",label: "Budget" },
]

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

const PAGE_SIZE = 15

type Filters = { statuses: string[]; priorities: string[] }
const DEFAULT_FILTERS: Filters = { statuses: [], priorities: [] }

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]
}

function ChipGroup<T extends string>({
  label, options, selected, onToggle,
}: { label: string; options: readonly T[]; selected: T[]; onToggle: (v: T) => void }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button key={o} type="button" onClick={() => onToggle(o)}
            className={cn("rounded-lg border px-2.5 py-1 text-xs font-medium transition",
              selected.includes(o)
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-input bg-muted/40 text-muted-foreground hover:bg-muted"
            )}
          >
            {o.replace(/_/g, " ")}
          </button>
        ))}
      </div>
    </div>
  )
}

const EMPTY_FORM = {
  name: "", description: "", notes: "",
  status: "ACTIVE" as ProjectItem["status"],
  priority: "MEDIUM" as ProjectItem["priority"],
  progress: "", startDate: "", endDate: "", budget: "", currency: "USD",
  selectedContactIds: [] as string[],
}

export default function ProjectsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [query, setQuery]               = useState("")
  const [filters, setFilters]           = useState<Filters>(DEFAULT_FILTERS)
  const [draftFilters, setDraftFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [filterOpen, setFilterOpen]     = useState(false)
  const [sortBy, setSortBy]             = useState("createdAt")
  const [sortDir, setSortDir]           = useState<"asc" | "desc">("desc")
  const [page, setPage]                 = useState(1)
  const [pageSize, setPageSize]         = useState(PAGE_SIZE)
  const [createOpen, setCreateOpen]     = useState(false)
  const [formValues, setFormValues]     = useState(EMPTY_FORM)

  const { data: contactsData } = useQuery({
    queryKey: ["clients", "picker"],
    queryFn: async () => {
      const params = new URLSearchParams({ page: "1", limit: "200", sortBy: "fullName", sortDir: "asc" })
      const res = await fetch(`/api/clients?${params}`, { credentials: "include" })
      if (!res.ok) throw new Error()
      return ((await res.json()) as { data: ContactOption[] }).data
    },
  })
  const contactOptions = contactsData ?? []


  const { data, isLoading, isError } = useQuery({
    queryKey: ["projects", "list", query, filters, sortBy, sortDir, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({ sortBy, sortDir, page: String(page), limit: String(pageSize) })
      if (query.trim()) params.set("search", query.trim())
      filters.statuses.forEach((s) => params.append("status", s))
      filters.priorities.forEach((p) => params.append("priority", p))
      const res = await fetch(`/api/projects?${params}`, { credentials: "include" })
      if (!res.ok) throw new Error()
      return (await res.json()) as { data: ProjectItem[]; total: number }
    },
  })

  const rows       = data?.data ?? []
  const totalCount = data?.total ?? 0
  const totalPages = Math.ceil(totalCount / pageSize)
  const activeCount = filters.statuses.length + filters.priorities.length

  const contactLabel = (cid: string) => {
    const c = contactOptions.find((x) => x.id === cid)
    return c?.fullName || c?.name || c?.email || cid
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const budgetNum = Number(formValues.budget)
      const progressNum = Number(formValues.progress)
      const res = await fetch("/api/projects", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formValues.name,
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
      return (await res.json()) as { data: { id: string } }
    },
    onSuccess: async ({ data: created }) => {
      await queryClient.invalidateQueries({ queryKey: ["projects", "list"] })
      setCreateOpen(false)
      setFormValues(EMPTY_FORM)
      toast.success(`Project "${formValues.name}" created`)
      router.push(`/dashboard/projects/${created.id}`)
    },
    onError: () => toast.error("Failed to create project. Please try again."),
  })

  function applyFilters() {
    setFilters(draftFilters)
    setPage(1)
    setFilterOpen(false)
    const count = draftFilters.statuses.length + draftFilters.priorities.length
    if (count > 0) toast.success(`${count} filter${count > 1 ? "s" : ""} applied`)
  }

  function clearFilters() {
    setDraftFilters(DEFAULT_FILTERS)
    setFilters(DEFAULT_FILTERS)
    setPage(1)
    setFilterOpen(false)
    toast("Filters cleared", { icon: <i className="ri-filter-off-line text-base" /> })
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-2 pt-0 lg:px-6">

      <div className="rounded-2xl border border-input bg-card shadow-sm">

        {/* header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-input px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-blue-500/10">
              <i className="ri-briefcase-line text-lg text-blue-500" />
            </span>
            <div>
              <h2 className="text-base font-semibold leading-none">Projects</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{totalCount} record{totalCount !== 1 ? "s" : ""}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* search */}
            <div className="relative w-full sm:w-52">
              <i className="ri-search-line pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground" />
              <Input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1) }}
                placeholder="Search projects…" className="h-8 pl-8 text-xs" />
            </div>

            {/* filter */}
            <Popover open={filterOpen} onOpenChange={(o) => { setFilterOpen(o); if (o) setDraftFilters(filters) }}>
              <PopoverTrigger asChild>
                <button type="button" className={cn(
                  "relative inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition",
                  activeCount > 0 ? "border-primary/40 bg-primary/10 text-primary" : "border-input bg-card text-foreground hover:bg-muted"
                )}>
                  <i className="ri-filter-3-line text-sm" />
                  Filters
                  {activeCount > 0 && (
                    <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {activeCount}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 space-y-4 rounded-2xl p-4">
                <p className="text-sm font-semibold">Filter projects</p>
                <ChipGroup label="Status" options={STATUS_OPTS}
                  selected={draftFilters.statuses as typeof STATUS_OPTS[number][]}
                  onToggle={(v) => setDraftFilters((f) => ({ ...f, statuses: toggle(f.statuses, v) }))} />
                <ChipGroup label="Priority" options={PRIORITY_OPTS}
                  selected={draftFilters.priorities as typeof PRIORITY_OPTS[number][]}
                  onToggle={(v) => setDraftFilters((f) => ({ ...f, priorities: toggle(f.priorities, v) }))} />
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={applyFilters}
                    className="flex-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90">
                    Apply
                  </button>
                  <button type="button" onClick={clearFilters}
                    className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium transition hover:bg-muted">
                    Clear
                  </button>
                </div>
              </PopoverContent>
            </Popover>

            {/* sort */}
            <Select value={sortBy} onValueChange={(v) => { if (v) { setSortBy(v); setPage(1) } }}>
              <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SORT_OPTS.map((o) => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <button type="button" onClick={() => setSortDir((d) => d === "asc" ? "desc" : "asc")}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-input px-2.5 text-xs font-medium transition hover:bg-muted">
              <i className={sortDir === "asc" ? "ri-sort-asc" : "ri-sort-desc"} />
              {sortDir === "asc" ? "Asc" : "Desc"}
            </button>

            {/* add */}
            <button type="button" onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90">
              <i className="ri-briefcase-2-line text-sm" />
              Add project
            </button>
          </div>
        </div>

        {/* active filter chips */}
        {activeCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-input px-5 py-2">
            <span className="text-[11px] text-muted-foreground">Active:</span>
            {filters.statuses.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 rounded-full border border-input bg-muted px-2 py-0.5 text-[11px] font-medium">
                {s.replace("_", " ")}
                <button onClick={() => { setFilters((f) => ({ ...f, statuses: f.statuses.filter((x) => x !== s) })); setPage(1) }}>
                  <i className="ri-close-line text-xs" />
                </button>
              </span>
            ))}
            {filters.priorities.map((p) => (
              <span key={p} className="inline-flex items-center gap-1 rounded-full border border-input bg-muted px-2 py-0.5 text-[11px] font-medium">
                {p}
                <button onClick={() => { setFilters((f) => ({ ...f, priorities: f.priorities.filter((x) => x !== p) })); setPage(1) }}>
                  <i className="ri-close-line text-xs" />
                </button>
              </span>
            ))}
            <button onClick={clearFilters} className="ml-1 text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground">
              Clear all
            </button>
          </div>
        )}

        {/* body */}
        {isLoading ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <i className="ri-loader-4-line animate-spin text-xl text-primary" />
            </span>
            <p className="text-sm text-muted-foreground">Loading projects…</p>
          </div>
        ) : isError ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-center">
            <i className="ri-error-warning-line text-2xl text-destructive" />
            <p className="text-sm text-muted-foreground">Unable to load projects. Please refresh.</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <span className="flex size-10 items-center justify-center rounded-xl bg-muted">
              <i className="ri-briefcase-line text-xl text-muted-foreground" />
            </span>
            <p className="text-sm font-medium text-muted-foreground">No projects found</p>
            <p className="text-xs text-muted-foreground/70">Adjust your filters or create a new project.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-input bg-muted/30 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="hidden px-4 py-3 md:table-cell">Progress</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Contacts</th>
                  <th className="hidden px-4 py-3 xl:table-cell">Budget</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-input">
                {rows.map((p) => (
                  <tr key={p.id} className="group transition hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                          <i className="ri-briefcase-line text-sm text-blue-500" />
                        </span>
                        <div>
                          <p className="font-medium text-foreground leading-none">{p.name || "Untitled"}</p>
                          <p className="mt-0.5 truncate max-w-[200px] text-xs text-muted-foreground">{p.description || "No description"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS_STYLE[p.status ?? "DRAFT"])}>
                        {(p.status ?? "—").replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", PRIORITY_STYLE[p.priority ?? "MEDIUM"])}>
                        {p.priority ?? "—"}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      {typeof p.progress === "number" ? (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${p.progress}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{p.progress}%</span>
                        </div>
                      ) : "—"}
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      {(p.contacts ?? []).length > 0 ? (
                        <div className="flex items-center -space-x-2">
                          {p.contacts!.slice(0, 4).map((c) => (
                            <span key={c.id} title={c.name} className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-card overflow-hidden">
                              <img
                                src={getDicebearUrl(c.name || c.email || c.id)}
                                alt={c.name}
                                className="size-full object-cover"
                              />
                            </span>
                          ))}
                          {p.contacts!.length > 4 && (
                            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-medium text-muted-foreground">+{p.contacts!.length - 4}</span>
                          )}
                        </div>
                      ) : "—"}
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-muted-foreground xl:table-cell">
                      {typeof p.budgetCents === "number" ? `${p.currency || "USD"} ${(p.budgetCents / 100).toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => router.push(`/dashboard/projects/${p.id}`)}
                        className="inline-flex items-center gap-1 rounded-lg border border-input px-2.5 py-1 text-xs font-medium transition hover:bg-muted">
                        View <i className="ri-arrow-right-line text-xs opacity-60" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* pagination */}
        {(totalPages > 1 || rows.length > 0) && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-input px-5 py-3">
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                {totalCount > 0 ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalCount)} of ${totalCount}` : "0 projects"}
              </p>
              <span className="text-xs text-muted-foreground/40">·</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Show</span>
                {[10, 15, 25, 50].map((n) => (
                  <button key={n} type="button" onClick={() => { setPageSize(n); setPage(1) }}
                    className={cn("flex size-7 items-center justify-center rounded-lg border text-xs font-medium transition",
                      pageSize === n ? "border-primary/40 bg-primary/10 text-primary" : "border-input hover:bg-muted text-muted-foreground"
                    )}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                  className="flex size-7 items-center justify-center rounded-lg border border-input text-xs transition hover:bg-muted disabled:pointer-events-none disabled:opacity-40">
                  <i className="ri-arrow-left-s-line" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push("…")
                    acc.push(p)
                    return acc
                  }, [])
                  .map((p, i) => p === "…" ? (
                    <span key={`d-${i}`} className="flex size-7 items-center justify-center text-xs text-muted-foreground">…</span>
                  ) : (
                    <button key={p} type="button" onClick={() => setPage(p as number)}
                      className={cn("flex size-7 items-center justify-center rounded-lg border text-xs font-medium transition",
                        page === p ? "border-primary/40 bg-primary/10 text-primary" : "border-input hover:bg-muted text-foreground"
                      )}>
                      {p}
                    </button>
                  ))}
                <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                  className="flex size-7 items-center justify-center rounded-lg border border-input text-xs transition hover:bg-muted disabled:pointer-events-none disabled:opacity-40">
                  <i className="ri-arrow-right-s-line" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[min(90vh,44rem)] w-[min(95vw,58rem)] overflow-y-auto rounded-2xl p-0" showCloseButton={false}>
          <form onSubmit={(e: FormEvent<HTMLFormElement>) => { e.preventDefault(); if (!formValues.name.trim()) return; createMutation.mutate() }} className="space-y-4 p-6">
            <DialogHeader>
              <DialogTitle>Add a Project</DialogTitle>
              <DialogDescription>Create a project, assign contacts, and open its details page.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="name">Project name</Label>
                <Input id="name" required value={formValues.name} onChange={(e) => setFormValues((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" value={formValues.description} onChange={(e) => setFormValues((p) => ({ ...p, description: e.target.value }))} />
              </div>
              <div>
                <Label>Status</Label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {STATUS_OPTS.map((s) => (
                    <button key={s} type="button" onClick={() => setFormValues((p) => ({ ...p, status: s }))}
                      className={cn("rounded-lg border px-3 py-1 text-xs font-medium transition",
                        formValues.status === s ? "border-primary/40 bg-primary/10 text-primary" : "border-input bg-muted/40 text-muted-foreground hover:bg-muted"
                      )}>
                      {s.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Priority</Label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {PRIORITY_OPTS.map((s) => (
                    <button key={s} type="button" onClick={() => setFormValues((p) => ({ ...p, priority: s }))}
                      className={cn("rounded-lg border px-3 py-1 text-xs font-medium transition",
                        formValues.priority === s ? "border-primary/40 bg-primary/10 text-primary" : "border-input bg-muted/40 text-muted-foreground hover:bg-muted"
                      )}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="progress">Progress (%)</Label>
                <Input id="progress" type="number" min={0} max={100} value={formValues.progress} onChange={(e) => setFormValues((p) => ({ ...p, progress: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="budget">Budget</Label>
                <Input id="budget" type="number" min="0" step="0.01" value={formValues.budget} onChange={(e) => setFormValues((p) => ({ ...p, budget: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="startDate">Start date</Label>
                <Input id="startDate" type="date" value={formValues.startDate} onChange={(e) => setFormValues((p) => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="endDate">End date</Label>
                <Input id="endDate" type="date" value={formValues.endDate} onChange={(e) => setFormValues((p) => ({ ...p, endDate: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <Label className="mb-1.5 block">Contacts</Label>
                <ContactCombobox
                  options={contactOptions}
                  selected={formValues.selectedContactIds}
                  label={contactLabel}
                  onAdd={(id) => setFormValues((p) => ({ ...p, selectedContactIds: [...p.selectedContactIds, id] }))}
                  onRemove={(id) => setFormValues((p) => ({ ...p, selectedContactIds: p.selectedContactIds.filter((x) => x !== id) }))}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="notes">Internal notes</Label>
                <textarea id="notes" rows={3} value={formValues.notes}
                  onChange={(e) => setFormValues((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Private notes…"
                  className="mt-1.5 flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || !formValues.name.trim()}>
                {createMutation.isPending ? <><i className="ri-loader-4-line animate-spin" /> Creating…</> : "Create project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
