"use client"

import Image from "next/image"
import { FormEvent, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useClientsFiltersStore } from "@/stores/clients-filters-store"
import { cn } from "@/lib/utils"
import { getDicebearUrl } from "@/lib/dicebear"

type ContactListItem = {
  id: string
  fullName?: string
  name?: string
  email?: string
  phone?: string
  company?: string
  jobTitle?: string
  status?: string
  type?: string
  healthLabel?: string
  source?: string
  isFavorite?: boolean
}

const EMPTY_FORM = {
  fullName: "", email: "", company: "", phone: "",
  jobTitle: "", address: "", notes: "", website: "", birthday: "",
  status: "LEAD",
}

const STATUS_OPTIONS  = ["LEAD", "QUALIFIED", "PROPOSAL", "ACTIVE", "INACTIVE"] as const
const TYPE_OPTIONS    = ["INDIVIDUAL", "COMPANY"] as const
const SOURCE_OPTIONS  = ["REFERRAL", "LINKEDIN", "UPWORK", "WEBSITE", "COLD_OUTREACH", "SOCIAL", "OTHER"] as const

type Filters = {
  statuses: string[]
  types: string[]
  healths: string[]
  sources: string[]
  favoritesOnly: boolean
}

const DEFAULT_FILTERS: Filters = { statuses: [], types: [], healths: [], sources: [], favoritesOnly: false }

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]
}

function activeFilterCount(f: Filters) {
  return f.statuses.length + f.types.length + f.healths.length + f.sources.length + (f.favoritesOnly ? 1 : 0)
}

function ChipGroup<T extends string>({
  label, options, selected, onToggle,
}: { label: string; options: readonly T[]; selected: T[]; onToggle: (v: T) => void }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            className={cn(
              "rounded-lg border px-2.5 py-1 text-xs font-medium transition",
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

export default function ClientsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { query, setQuery } = useClientsFiltersStore()
  const [createOpen, setCreateOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [draftFilters, setDraftFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)
  const [formValues, setFormValues] = useState(EMPTY_FORM)

  // reset page when query/filters change
  const queryKey = useMemo(() => ["clients", "list", query, filters, page, pageSize], [query, filters, page, pageSize])

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
        sortBy: "createdAt",
        sortDir: "desc",
      })
      if (query.trim()) params.set("search", query.trim())
      filters.statuses.forEach((s) => params.append("status", s))
      filters.types.forEach((t) => params.append("type", t))
      filters.healths.forEach((h) => params.append("healthLabel", h))
      filters.sources.forEach((s) => params.append("source", s))
      if (filters.favoritesOnly) params.set("isFavorite", "true")

      const res = await fetch(`/api/clients?${params.toString()}`, { credentials: "include" })
      if (!res.ok) throw new Error("Failed to fetch clients")
      return (await res.json()) as {
        data: ContactListItem[]; total: number; page: number; limit: number; hasMore: boolean
      }
    },
  })

  const rows = data?.data ?? []
  const totalCount = data?.total ?? 0
  const totalPages = Math.ceil(totalCount / pageSize)
  const activeCount = activeFilterCount(filters)

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/clients", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formValues.fullName,
          email: formValues.email || undefined,
          company: formValues.company || undefined,
          phone: formValues.phone || undefined,
          jobTitle: formValues.jobTitle || undefined,
          address: formValues.address || undefined,
          website: formValues.website || undefined,
          notes: formValues.notes || undefined,
          birthday: formValues.birthday || undefined,
          status: formValues.status,
        }),
      })
      if (!res.ok) throw new Error("Failed to create contact")
      return (await res.json()) as { data: { id: string } }
    },
    onSuccess: async ({ data: created }) => {
      await queryClient.invalidateQueries({ queryKey: ["clients", "list"] })
      setCreateOpen(false)
      setFormValues(EMPTY_FORM)
      toast.success(`Contact "${formValues.fullName}" created`)
      router.push(`/dashboard/clients/${created.id}`)
    },
    onError: () => toast.error("Failed to create contact."),
  })

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!formValues.fullName.trim()) return
    createMutation.mutate()
  }

  const field = (id: keyof typeof EMPTY_FORM) => ({
    id,
    value: formValues[id],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setFormValues((p) => ({ ...p, [id]: e.target.value })),
  })

  function applyFilters() {
    setFilters(draftFilters)
    setPage(1)
    setFilterOpen(false)
    const count = activeFilterCount(draftFilters)
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

      {/* ── Main card ── */}
      <div className="rounded-2xl border border-input bg-card shadow-sm">

        {/* header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-input px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-blue-500/10">
              <i className="ri-group-line text-lg text-blue-500" />
            </span>
            <div>
              <h2 className="text-base font-semibold leading-none">Contacts &amp; companies</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{totalCount} record{totalCount !== 1 ? "s" : ""}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* search */}
            <div className="relative w-full sm:w-56">
              <i className="ri-search-line pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1) }}
                placeholder="Search…"
                className="h-8 pl-8 text-xs"
              />
            </div>

            {/* filter button */}
            <Popover open={filterOpen} onOpenChange={(o) => { setFilterOpen(o); if (o) setDraftFilters(filters) }}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "relative inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition",
                    activeCount > 0
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-input bg-card text-foreground hover:bg-muted"
                  )}
                >
                  <i className="ri-filter-3-line text-sm" />
                  Filters
                  {activeCount > 0 && (
                    <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {activeCount}
                    </span>
                  )}
                </button>
              </PopoverTrigger>

              <PopoverContent align="end" className="w-80 rounded-2xl border border-input p-4 shadow-lg">
                <div className="space-y-4">
                  <p className="text-sm font-semibold">Filter contacts</p>

                  <ChipGroup
                    label="Status"
                    options={STATUS_OPTIONS}
                    selected={draftFilters.statuses as typeof STATUS_OPTIONS[number][]}
                    onToggle={(v) => setDraftFilters((f) => ({ ...f, statuses: toggle(f.statuses, v) }))}
                  />
                  <ChipGroup
                    label="Type"
                    options={TYPE_OPTIONS}
                    selected={draftFilters.types as typeof TYPE_OPTIONS[number][]}
                    onToggle={(v) => setDraftFilters((f) => ({ ...f, types: toggle(f.types, v) }))}
                  />
                  <ChipGroup
                    label="Source"
                    options={SOURCE_OPTIONS}
                    selected={draftFilters.sources as typeof SOURCE_OPTIONS[number][]}
                    onToggle={(v) => setDraftFilters((f) => ({ ...f, sources: toggle(f.sources, v) }))}
                  />

                  {/* favorites */}
                  <button
                    type="button"
                    onClick={() => setDraftFilters((f) => ({ ...f, favoritesOnly: !f.favoritesOnly }))}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-medium transition",
                      draftFilters.favoritesOnly
                        ? "border-amber-400/40 bg-amber-400/10 text-amber-600 dark:text-amber-400"
                        : "border-input bg-muted/40 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <i className={cn("text-sm", draftFilters.favoritesOnly ? "ri-star-fill" : "ri-star-line")} />
                    Favorites only
                  </button>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={applyFilters}
                      className="flex-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* add contact */}
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              <i className="ri-user-add-line text-sm" />
              Add contact
            </button>
          </div>
        </div>

        {/* active filter chips */}
        {activeCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-input px-5 py-2">
            <span className="text-[11px] text-muted-foreground">Active:</span>
            {filters.statuses.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 rounded-full border border-input bg-muted px-2 py-0.5 text-[11px] font-medium">
                {s}
                <button onClick={() => { setFilters((f) => ({ ...f, statuses: f.statuses.filter((x) => x !== s) })); setPage(1); toast(`"${s}" filter removed`, { icon: <i className="ri-close-circle-line text-base" /> }) }}><i className="ri-close-line text-xs" /></button>
              </span>
            ))}
            {filters.types.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full border border-input bg-muted px-2 py-0.5 text-[11px] font-medium">
                {t}
                <button onClick={() => { setFilters((f) => ({ ...f, types: f.types.filter((x) => x !== t) })); setPage(1); toast(`"${t}" filter removed`, { icon: <i className="ri-close-circle-line text-base" /> }) }}><i className="ri-close-line text-xs" /></button>
              </span>
            ))}
            {filters.healths.map((h) => (
              <span key={h} className="inline-flex items-center gap-1 rounded-full border border-input bg-muted px-2 py-0.5 text-[11px] font-medium">
                {h.replace("_", " ")}
                <button onClick={() => { setFilters((f) => ({ ...f, healths: f.healths.filter((x) => x !== h) })); setPage(1); toast(`"${h.replace("_", " ")}" filter removed`, { icon: <i className="ri-close-circle-line text-base" /> }) }}><i className="ri-close-line text-xs" /></button>
              </span>
            ))}
            {filters.sources.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 rounded-full border border-input bg-muted px-2 py-0.5 text-[11px] font-medium">
                {s.replace("_", " ")}
                <button onClick={() => { setFilters((f) => ({ ...f, sources: f.sources.filter((x) => x !== s) })); setPage(1); toast(`"${s.replace("_", " ")}" filter removed`, { icon: <i className="ri-close-circle-line text-base" /> }) }}><i className="ri-close-line text-xs" /></button>
              </span>
            ))}
            {filters.favoritesOnly && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-600">
                <i className="ri-star-fill text-xs" /> Favorites
                <button onClick={() => { setFilters((f) => ({ ...f, favoritesOnly: false })); setPage(1); toast("Favorites filter removed", { icon: <i className="ri-close-circle-line text-base" /> }) }}><i className="ri-close-line text-xs" /></button>
              </span>
            )}
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
            <p className="text-sm text-muted-foreground">Loading contacts…</p>
          </div>
        ) : isError ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-center">
            <i className="ri-error-warning-line text-2xl text-destructive" />
            <p className="text-sm text-muted-foreground">Unable to load contacts. Please refresh.</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <span className="flex size-10 items-center justify-center rounded-xl bg-muted">
              <i className="ri-group-line text-xl text-muted-foreground" />
            </span>
            <p className="text-sm font-medium text-muted-foreground">No contacts found</p>
            <p className="text-xs text-muted-foreground/70">Try adjusting your filters or search.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-input bg-muted/30 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="hidden px-4 py-3 md:table-cell">Email</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Phone</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-input">
                {rows.map((c) => (
                  <tr key={c.id} className="group transition hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full">
                          <Image
                            src={getDicebearUrl(c.fullName || c.name || c.email || c.id)}
                            alt={c.fullName || c.name || ""}
                            fill
                            className="object-cover"
                            sizes="32px"
                          />
                        </span>
                        <div>
                          <p className="font-medium text-foreground leading-none">
                            {c.fullName || c.name || "Unnamed"}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{c.jobTitle || "No title"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{c.company || "—"}</td>
                    <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                      {c.email ? (
                        <a href={`mailto:${c.email}`} className="hover:text-primary hover:underline underline-offset-4 transition">
                          {c.email}
                        </a>
                      ) : "—"}
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-muted-foreground lg:table-cell">
                      {c.phone ? (
                        <a href={`tel:${c.phone}`} className="hover:text-primary transition">
                          {c.phone}
                        </a>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => router.push(`/dashboard/clients/${c.id}`)}
                        className="inline-flex items-center gap-1 rounded-lg border border-input px-2.5 py-1 text-xs font-medium transition hover:bg-muted"
                      >
                        View <i className="ri-arrow-right-line text-xs opacity-60" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ── */}
        {(totalPages > 1 || rows.length > 0) && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-input px-5 py-3">
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                {totalCount > 0
                  ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalCount)} of ${totalCount}`
                  : "0 contacts"}
              </p>
              <span className="text-xs text-muted-foreground/40">·</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Show</span>
                {[10, 15, 25, 50].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => { setPageSize(n); setPage(1) }}
                    className={cn(
                      "flex size-7 items-center justify-center rounded-lg border text-xs font-medium transition",
                      pageSize === n
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-input hover:bg-muted text-muted-foreground"
                    )}
                  >
                    {n}
                  </button>
                ))}
                <span className="text-xs text-muted-foreground">per page</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="flex size-7 items-center justify-center rounded-lg border border-input text-xs transition hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
              >
                <i className="ri-arrow-left-s-line" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push("…")
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) =>
                  p === "…" ? (
                    <span key={`dots-${i}`} className="flex size-7 items-center justify-center text-xs text-muted-foreground">…</span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p as number)}
                      className={cn(
                        "flex size-7 items-center justify-center rounded-lg border text-xs font-medium transition",
                        page === p
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-input hover:bg-muted text-foreground"
                      )}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="flex size-7 items-center justify-center rounded-lg border border-input text-xs transition hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
              >
                <i className="ri-arrow-right-s-line" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Create dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="w-[min(95vw,58rem)] rounded-2xl p-0" showCloseButton={false}>
          <form onSubmit={handleSubmit} className="space-y-4 p-6">
            <DialogHeader>
              <DialogTitle>Add a Contact</DialogTitle>
              <DialogDescription>Fill in the contact details below.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input required {...field("fullName")} />
              </div>
              <div><Label htmlFor="email">Email</Label><Input type="email" {...field("email")} /></div>
              <div><Label htmlFor="phone">Phone</Label><Input {...field("phone")} /></div>
              <div><Label htmlFor="company">Company name</Label><Input {...field("company")} /></div>
              <div><Label htmlFor="jobTitle">Job title</Label><Input {...field("jobTitle")} /></div>
              <div className="md:col-span-2">
                <Label>Status</Label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s} type="button"
                      onClick={() => setFormValues((p) => ({ ...p, status: s }))}
                      className={cn(
                        "rounded-lg border px-3 py-1 text-xs font-medium transition",
                        formValues.status === s
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-input bg-muted/40 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div><Label htmlFor="address">Address</Label><Input {...field("address")} /></div>
              <div><Label htmlFor="website">Website</Label><Input {...field("website")} /></div>
              <div><Label htmlFor="birthday">Birthday</Label><Input type="date" {...field("birthday")} /></div>
              <div><Label htmlFor="notes">Background info</Label><Input {...field("notes")} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || !formValues.fullName.trim()}>
                {createMutation.isPending ? <><i className="ri-loader-4-line animate-spin" /> Creating…</> : "Create contact"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
