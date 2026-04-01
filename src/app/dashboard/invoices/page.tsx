"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

import { DocumentTypeBadge, InvoiceStatusBadge } from "@/components/finance/status-badges"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCents, parseMajorToCents } from "@/lib/money"
import { getDicebearUrl } from "@/lib/dicebear"
import { useCurrency } from "@/contexts/currency-context"

type InvoiceRow = {
  id: string; number: string; documentType: string; title?: string | null
  status: string; amountCents: number; currency: string
  dueDate: string; issuedAt: string; clientId: string
  clientName?: string | null; projectId?: string | null
}

type ProjectOption = { id: string; name?: string | null }

const STATUS_OPTIONS = ["all", "DRAFT", "SENT", "VIEWED", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"] as const

const INV_STATUS_STYLE: Record<string, string> = {
  DRAFT:          "bg-muted text-muted-foreground",
  SENT:           "bg-blue-500/10 text-blue-600",
  VIEWED:         "bg-violet-500/10 text-violet-600",
  PARTIALLY_PAID: "bg-amber-500/10 text-amber-600",
  PAID:           "bg-emerald-500/10 text-emerald-600",
  OVERDUE:        "bg-red-500/10 text-red-500",
  CANCELLED:      "bg-muted text-muted-foreground line-through",
}

function defaultDueDate() {
  const d = new Date()
  d.setDate(d.getDate() + 14)
  return d.toISOString().slice(0, 10)
}

// ─── Searchable single-contact picker ─────────────────────────────────────────

type ContactOption = { id: string; fullName?: string; name?: string; email?: string }

function ContactPickerSingle({
  options,
  value,
  onChange,
  placeholder = "Search contacts…",
}: {
  options: ContactOption[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
}) {
  const [search, setSearch] = useState("")
  const [open, setOpen]     = useState(false)

  const selected = options.find((c) => c.id === value)
  const displayName = (c: ContactOption) => c.fullName || c.name || c.email || c.id

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return options.filter((c) => {
      if (!q) return true
      return displayName(c).toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q)
    })
  }, [options, search])

  return (
    <div className="relative">
      {selected ? (
        /* selected state */
        <div className="mt-1 flex items-center gap-2.5 rounded-xl border border-input bg-background px-3 py-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full overflow-hidden">
            <img src={getDicebearUrl(displayName(selected))} alt={displayName(selected)} className="size-full object-cover" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-none">{displayName(selected)}</p>
            {selected.email && <p className="mt-0.5 truncate text-xs text-muted-foreground">{selected.email}</p>}
          </div>
          <button type="button" onClick={() => { onChange(""); setSearch("") }}
            className="shrink-0 rounded-md p-0.5 text-muted-foreground transition hover:text-foreground">
            <i className="ri-close-line text-sm" />
          </button>
        </div>
      ) : (
        /* search input */
        <div className="relative mt-1">
          <i className="ri-search-line pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={placeholder}
            className="flex h-9 w-full rounded-xl border border-input bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          />
        </div>
      )}

      {/* dropdown */}
      {!selected && open && (
        <div className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-input bg-popover shadow-lg">
          {filtered.length === 0 ? (
            <p className="p-3 text-center text-xs text-muted-foreground">
              {search.trim() ? "No contacts match your search." : "No contacts found."}
            </p>
          ) : (
            filtered.slice(0, 40).map((c) => (
              <button key={c.id} type="button"
                onMouseDown={(e) => { e.preventDefault(); onChange(c.id); setSearch(""); setOpen(false) }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-muted">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full overflow-hidden">
                  <img src={getDicebearUrl(displayName(c))} alt={displayName(c)} className="size-full object-cover" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{displayName(c)}</p>
                  {c.email && <p className="truncate text-xs text-muted-foreground">{c.email}</p>}
                </div>
                <i className="ri-add-circle-line ml-auto shrink-0 text-muted-foreground" />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function InvoicesPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const queryClient  = useQueryClient()
  const { currency: accountCurrency } = useCurrency()

  const urlType = searchParams.get("type")?.toLowerCase()
  const docType = urlType === "quote" ? "QUOTE" : "INVOICE"
  const heading = docType === "QUOTE" ? "Quotes" : "Invoices"

  const [search,       setSearch]       = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [createOpen,   setCreateOpen]   = useState(false)
  const [form, setForm] = useState({
    clientId: "", projectId: "", title: "", amountMajor: "",
    dueDate: defaultDueDate(), status: "DRAFT", notes: "", currency: accountCurrency,
  })

  type LineItemDraft = { description: string; qty: string; unitPrice: string }
  const emptyLine = (): LineItemDraft => ({ description: "", qty: "1", unitPrice: "" })
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([])

  const lineTotal = lineItems.reduce((sum, r) => {
    const qty   = parseFloat(r.qty)   || 0
    const price = parseMajorToCents(r.unitPrice) ?? 0
    return sum + Math.round(qty * price)
  }, 0)
  const hasLines = lineItems.length > 0

  function updateLine(idx: number, patch: Partial<LineItemDraft>) {
    setLineItems((prev) => prev.map((r, i) => i === idx ? { ...r, ...patch } : r))
  }
  function removeLine(idx: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== idx))
  }

  useEffect(() => {
    const s = searchParams.get("status")?.toUpperCase()
    if (s && (STATUS_OPTIONS as readonly string[]).includes(s)) setStatusFilter(s)
  }, [searchParams])

  const { data: contactsData } = useQuery({
    queryKey: ["clients", "picker"],
    queryFn: async () => {
      const p = new URLSearchParams({ page: "1", limit: "200", sortBy: "fullName", sortDir: "asc" })
      const res = await fetch(`/api/clients?${p}`, { credentials: "include" })
      if (!res.ok) throw new Error()
      return ((await res.json()) as { data: ContactOption[] }).data
    },
  })

  const { data: projectsData } = useQuery({
    queryKey: ["projects", "picker"],
    queryFn: async () => {
      const res = await fetch("/api/projects?limit=100&sortBy=name&sortDir=asc", { credentials: "include" })
      if (!res.ok) throw new Error()
      return ((await res.json()) as { data: ProjectOption[] }).data
    },
  })

  const contacts = contactsData ?? []
  const projects = projectsData ?? []

  const { data, isLoading, isError } = useQuery({
    queryKey: ["invoices", "list", search, statusFilter, docType],
    queryFn: async () => {
      const p = new URLSearchParams({ page: "1", limit: "50", sortBy: "issuedAt", sortDir: "desc", documentType: docType })
      if (search.trim()) p.set("search", search.trim())
      if (statusFilter !== "all") p.set("status", statusFilter)
      const res = await fetch(`/api/invoices?${p}`, { credentials: "include" })
      if (!res.ok) throw new Error()
      return (await res.json()) as { data: InvoiceRow[]; total: number }
    },
  })

  const rows = useMemo(() => data?.data ?? [], [data])

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.clientId) throw new Error("validation")
      const body: Record<string, unknown> = {
        clientId: form.clientId, documentType: docType,
        dueDate: new Date(form.dueDate).toISOString(),
        status: form.status, currency: form.currency,
      }
      if (hasLines) {
        const items = lineItems
          .filter((r) => r.description.trim() && (parseMajorToCents(r.unitPrice) ?? 0) > 0)
          .map((r) => ({
            description: r.description.trim(),
            quantity: parseFloat(r.qty) || 1,
            unitAmountCents: parseMajorToCents(r.unitPrice) ?? 0,
          }))
        if (!items.length) throw new Error("Add at least one valid line item")
        body.lineItems  = items
        body.amountCents = items.reduce((s, r) => s + Math.round(r.quantity * r.unitAmountCents), 0)
      } else {
        const cents = parseMajorToCents(form.amountMajor)
        if (!cents) throw new Error("validation")
        body.amountCents = cents
      }
      if (form.projectId) body.projectId = form.projectId
      if (form.title.trim()) body.title = form.title.trim()
      if (form.notes.trim()) body.notes = form.notes.trim()
      const res = await fetch("/api/invoices", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string; detail?: string; issues?: unknown }
        throw new Error(j.detail || j.error || "create failed")
      }
      return (await res.json()) as { data: { id: string } }
    },
    onSuccess: async (json) => {
      await queryClient.invalidateQueries({ queryKey: ["invoices"] })
      await queryClient.invalidateQueries({ queryKey: ["finance"] })
      setCreateOpen(false)
      setForm({ clientId: "", projectId: "", title: "", amountMajor: "", dueDate: defaultDueDate(), status: "DRAFT", notes: "", currency: accountCurrency })
      setLineItems([])
      toast.success(`${docType === "QUOTE" ? "Quote" : "Invoice"} created`)
      router.push(`/dashboard/invoices/${json.data.id}`)
    },
    onError: (e) => toast.error((e as Error).message || "Failed to create document"),
  })

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-4 pt-0 lg:px-6">
      <div className="rounded-2xl border border-input bg-card shadow-sm">

        {/* header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-input px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-blue-500/10">
              <i className="ri-file-text-line text-lg text-blue-500" />
            </span>
            <div>
              <h2 className="text-base font-semibold leading-none">{heading}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {data?.total ?? 0} documents
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* search */}
            <div className="relative w-full sm:w-56">
              <i className="ri-search-line pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search number, title…" className="h-9 pl-8 text-xs" />
            </div>

            {/* status filter */}
            <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
              <SelectTrigger className="h-9 w-[150px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s === "all" ? "All statuses" : s.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* type toggle */}
            <div className="flex h-9 items-center gap-0.5 rounded-lg border border-input px-1">
              <a href="/dashboard/invoices"
                className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition",
                  docType === "INVOICE" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                )}>
                Invoices
              </a>
              <a href="/dashboard/invoices?type=quote"
                className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition",
                  docType === "QUOTE" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                )}>
                Quotes
              </a>
            </div>

            {/* create */}
            <button type="button" onClick={() => setCreateOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition hover:bg-primary/90">
              <i className="ri-add-line text-sm" />
              New {docType === "QUOTE" ? "quote" : "invoice"}
            </button>
          </div>
        </div>

        {/* body */}
        {isLoading ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <i className="ri-loader-4-line animate-spin text-xl text-primary" />
            </span>
            <p className="text-sm text-muted-foreground">Loading…</p>
          </div>
        ) : isError ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            <i className="ri-error-warning-line mr-2 text-destructive" /> Unable to load documents.
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <span className="flex size-10 items-center justify-center rounded-xl bg-muted">
              <i className="ri-file-text-line text-xl text-muted-foreground" />
            </span>
            <p className="text-sm text-muted-foreground">No documents match this view.</p>
            <button type="button" onClick={() => setCreateOpen(true)}
              className="text-xs text-primary underline underline-offset-4 hover:no-underline">
              Create your first {docType === "QUOTE" ? "quote" : "invoice"}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-input bg-muted/30 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  <th className="px-5 py-3">Document</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="hidden px-4 py-3 md:table-cell">Due</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-input">
                {rows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                          <i className="ri-file-text-line text-sm text-blue-500" />
                        </span>
                        <div>
                          <p className="font-medium">{row.number}</p>
                          {row.title && <p className="text-xs text-muted-foreground">{row.title}</p>}
                          <DocumentTypeBadge type={row.documentType} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{row.clientName || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium", INV_STATUS_STYLE[row.status] ?? "bg-muted text-muted-foreground")}>
                        {row.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                      {row.dueDate ? new Date(row.dueDate).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatCents(row.amountCents, row.currency)}</td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => router.push(`/dashboard/invoices/${row.id}`)}
                        className="inline-flex items-center gap-1 rounded-lg border border-input px-2.5 py-1 text-xs font-medium transition hover:bg-muted">
                        Open <i className="ri-arrow-right-line text-xs opacity-60" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* create dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) setLineItems([]) }}>
        <DialogContent className="w-[min(95vw,38rem)] rounded-2xl p-0" showCloseButton={false}>
          <form onSubmit={(e: FormEvent) => { e.preventDefault(); createMutation.mutate() }}
            className="flex max-h-[90vh] flex-col">

            {/* scrollable body */}
            <div className="overflow-y-auto p-6 space-y-4">
              <DialogHeader>
                <DialogTitle>New {docType === "QUOTE" ? "quote" : "invoice"}</DialogTitle>
                <DialogDescription>Fill in the details below. Add line items for an itemised document.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-3">
                {/* contact */}
                <div>
                  <Label>Contact</Label>
                  <ContactPickerSingle options={contacts} value={form.clientId}
                    onChange={(id) => setForm((f) => ({ ...f, clientId: id }))} />
                </div>

                {/* project */}
                <div>
                  <Label>Project (optional)</Label>
                  <Select value={form.projectId || "__none__"}
                    onValueChange={(v) => v && setForm((f) => ({ ...f, projectId: v === "__none__" ? "" : v }))}>
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue placeholder="None">
                        {form.projectId
                          ? (() => { const p = projects.find((x) => x.id === form.projectId); return p ? (p.name || form.projectId) : form.projectId })()
                          : "None"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name || p.id}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* amount + due date — hidden when using line items */}
                {!hasLines && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Amount ({form.currency})</Label>
                      <Input className="mt-1" inputMode="decimal" placeholder="0.00"
                        value={form.amountMajor} onChange={(e) => setForm((f) => ({ ...f, amountMajor: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Due date</Label>
                      <Input type="date" className="mt-1" value={form.dueDate}
                        onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
                    </div>
                  </div>
                )}

                {hasLines && (
                  <div>
                    <Label>Due date</Label>
                    <Input type="date" className="mt-1" value={form.dueDate}
                      onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
                  </div>
                )}

                {/* ── line items ── */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label>Line items {hasLines && <span className="ml-1 text-muted-foreground font-normal">({lineItems.length})</span>}</Label>
                    {!hasLines && (
                      <button type="button" onClick={() => setLineItems([emptyLine()])}
                        className="text-xs text-primary hover:underline underline-offset-4">
                        + Add line items
                      </button>
                    )}
                  </div>

                  {hasLines && (
                    <div className="rounded-xl border border-input overflow-hidden">
                      {/* header */}
                      <div className="grid grid-cols-[1fr_56px_96px_28px] gap-1 bg-muted/40 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <span>Description</span>
                        <span className="text-center">Qty</span>
                        <span className="text-right">Unit price</span>
                        <span />
                      </div>

                      {/* rows */}
                      <div className="divide-y divide-input">
                        {lineItems.map((row, idx) => (
                          <div key={idx} className="grid grid-cols-[1fr_56px_96px_28px] gap-1 items-center px-2 py-1.5">
                            <input
                              value={row.description}
                              onChange={(e) => updateLine(idx, { description: e.target.value })}
                              placeholder="Description"
                              className="w-full rounded-md border-0 bg-transparent px-1.5 py-1 text-sm outline-none ring-0 focus:ring-1 focus:ring-primary/30 focus:rounded"
                            />
                            <input
                              value={row.qty}
                              onChange={(e) => updateLine(idx, { qty: e.target.value })}
                              inputMode="decimal"
                              className="w-full rounded-md border-0 bg-transparent px-1.5 py-1 text-center text-sm outline-none focus:ring-1 focus:ring-primary/30 focus:rounded"
                            />
                            <input
                              value={row.unitPrice}
                              onChange={(e) => updateLine(idx, { unitPrice: e.target.value })}
                              placeholder="0.00"
                              inputMode="decimal"
                              className="w-full rounded-md border-0 bg-transparent px-1.5 py-1 text-right text-sm outline-none focus:ring-1 focus:ring-primary/30 focus:rounded"
                            />
                            <button type="button" onClick={() => removeLine(idx)}
                              className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-500 transition">
                              <i className="ri-close-line text-sm" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* footer: add row + total */}
                      <div className="flex items-center justify-between border-t border-input bg-muted/20 px-3 py-2">
                        <button type="button" onClick={() => setLineItems((p) => [...p, emptyLine()])}
                          className="flex items-center gap-1 text-xs text-primary hover:underline underline-offset-4">
                          <i className="ri-add-line" /> Add row
                        </button>
                        <div className="text-xs font-semibold text-foreground">
                          Total: {formatCents(lineTotal, form.currency)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* status */}
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => v && setForm((f) => ({ ...f, status: v }))}>
                    <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["DRAFT","SENT","VIEWED"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* title */}
                <div>
                  <Label>Title (optional)</Label>
                  <Input className="mt-1" value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                </div>

                {/* notes */}
                <div>
                  <Label>Notes</Label>
                  <textarea className="mt-1 flex min-h-[60px] w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>

              {createMutation.isError && (
                <p className="text-xs text-destructive">{(createMutation.error as Error)?.message || "Could not create document."}</p>
              )}
            </div>

            {/* sticky footer */}
            <DialogFooter className="border-t border-input px-6 py-4">
              <Button type="button" variant="ghost" onClick={() => { setCreateOpen(false); setLineItems([]) }}>Cancel</Button>
              <Button type="submit" disabled={
                createMutation.isPending || !form.clientId ||
                (hasLines ? lineTotal === 0 : !parseMajorToCents(form.amountMajor))
              }>
                {createMutation.isPending ? <><i className="ri-loader-4-line animate-spin" /> Creating…</> : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
