"use client"

import type { Dispatch, SetStateAction } from "react"
import { FormEvent, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCents, parseMajorToCents } from "@/lib/money"
import { useCurrency } from "@/contexts/currency-context"

type ExpenseRow = {
  id: string; vendor: string | null; category: string; status: string
  amountCents: number; currency: string; incurredAt: string; notes: string | null
  projectId: string | null; clientId: string | null
}

const CATEGORIES = ["SOFTWARE", "TRAVEL", "MEALS", "OFFICE", "MARKETING", "PROFESSIONAL", "OTHER"] as const
const STATUSES   = ["PENDING", "APPROVED", "REJECTED", "PAID"] as const

const EXP_STATUS_STYLE: Record<string, string> = {
  PENDING:  "bg-amber-500/10 text-amber-600",
  APPROVED: "bg-blue-500/10 text-blue-600",
  REJECTED: "bg-red-500/10 text-red-500",
  PAID:     "bg-emerald-500/10 text-emerald-600",
}

const CAT_ICON: Record<string, string> = {
  SOFTWARE:     "ri-code-box-line",
  TRAVEL:       "ri-flight-takeoff-line",
  MEALS:        "ri-restaurant-line",
  OFFICE:       "ri-building-line",
  MARKETING:    "ri-megaphone-line",
  PROFESSIONAL: "ri-briefcase-line",
  OTHER:        "ri-more-line",
}

function todayISODate() { return new Date().toISOString().slice(0, 10) }

function makeEmptyForm(currency: string) {
  return {
    vendor: "", category: "OTHER" as (typeof CATEGORIES)[number],
    status: "PENDING" as (typeof STATUSES)[number],
    amountMajor: "", currency, incurredAt: todayISODate(), notes: "",
  }
}

export default function ExpensesPage() {
  const { currency: accountCurrency } = useCurrency()
  const queryClient  = useQueryClient()
  const [catFilter,    setCatFilter]    = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [createOpen,   setCreateOpen]   = useState(false)
  const [editRow,      setEditRow]      = useState<ExpenseRow | null>(null)
  const [deleteRow,    setDeleteRow]    = useState<ExpenseRow | null>(null)
  const [form, setForm] = useState(() => makeEmptyForm(accountCurrency))

  const { data, isLoading, isError } = useQuery({
    queryKey: ["expenses", "list", catFilter, statusFilter],
    queryFn: async () => {
      const p = new URLSearchParams({ page: "1", limit: "80", sortDir: "desc" })
      if (catFilter    !== "all") p.set("category", catFilter)
      if (statusFilter !== "all") p.set("status",   statusFilter)
      const res = await fetch(`/api/expenses?${p}`, { credentials: "include" })
      if (!res.ok) throw new Error()
      return (await res.json()) as { data: ExpenseRow[]; total: number }
    },
  })

  const rows = useMemo(() => data?.data ?? [], [data])

  const resetForm = () => setForm(makeEmptyForm(accountCurrency))

  const createMutation = useMutation({
    mutationFn: async () => {
      const cents = parseMajorToCents(form.amountMajor)
      if (!cents) throw new Error("amount")
      const res = await fetch("/api/expenses", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor: form.vendor.trim() || undefined, category: form.category, status: form.status,
          amountCents: cents, currency: form.currency,
          incurredAt: new Date(form.incurredAt).toISOString(), notes: form.notes.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["expenses"] })
      await queryClient.invalidateQueries({ queryKey: ["finance"] })
      setCreateOpen(false)
      resetForm()
      toast.success("Expense recorded")
    },
    onError: () => toast.error("Failed to record expense"),
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editRow) return
      const cents = parseMajorToCents(form.amountMajor)
      if (!cents) throw new Error("amount")
      const res = await fetch(`/api/expenses/${editRow.id}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor: form.vendor.trim() || undefined, category: form.category, status: form.status,
          amountCents: cents, currency: form.currency,
          incurredAt: new Date(form.incurredAt).toISOString(), notes: form.notes.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["expenses"] })
      await queryClient.invalidateQueries({ queryKey: ["finance"] })
      setEditRow(null)
      resetForm()
      toast.success("Expense updated")
    },
    onError: () => toast.error("Failed to update expense"),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deleteRow) return
      const res = await fetch(`/api/expenses/${deleteRow.id}`, { method: "DELETE", credentials: "include" })
      if (!res.ok) throw new Error()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["expenses"] })
      await queryClient.invalidateQueries({ queryKey: ["finance"] })
      setDeleteRow(null)
      toast("Expense removed", { icon: <i className="ri-delete-bin-line text-base" /> })
    },
    onError: () => toast.error("Failed to delete expense"),
  })

  function openEdit(row: ExpenseRow) {
    setEditRow(row)
    setForm({
      vendor: row.vendor ?? "",
      category: (CATEGORIES.includes(row.category as (typeof CATEGORIES)[number]) ? row.category : "OTHER") as (typeof CATEGORIES)[number],
      status: (STATUSES.includes(row.status as (typeof STATUSES)[number]) ? row.status : "PENDING") as (typeof STATUSES)[number],
      amountMajor: (row.amountCents / 100).toFixed(2),
      currency: row.currency || "USD",
      incurredAt: row.incurredAt ? new Date(row.incurredAt).toISOString().slice(0, 10) : todayISODate(),
      notes: row.notes ?? "",
    })
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-4 pt-0 lg:px-6">
      <div className="rounded-2xl border border-input bg-card shadow-sm">

        {/* header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-input px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-red-500/10">
              <i className="ri-receipt-line text-lg text-red-500" />
            </span>
            <div>
              <h2 className="text-base font-semibold leading-none">Expenses</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{data?.total ?? 0} records · Operational spend tracking</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={catFilter} onValueChange={(v) => v && setCatFilter(v)}>
              <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
              <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <button type="button" onClick={() => { resetForm(); setCreateOpen(true) }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90">
              <i className="ri-add-line text-sm" /> Add expense
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
            <i className="ri-error-warning-line mr-2 text-destructive" /> Unable to load expenses.
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <span className="flex size-10 items-center justify-center rounded-xl bg-muted">
              <i className="ri-receipt-line text-xl text-muted-foreground" />
            </span>
            <p className="text-sm text-muted-foreground">No expenses in this view.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-input bg-muted/30 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  <th className="px-5 py-3">Vendor</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="hidden px-4 py-3 md:table-cell">Date</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-input">
                {rows.map((row) => (
                  <tr key={row.id} className="group transition hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
                          <i className={cn(CAT_ICON[row.category] ?? "ri-receipt-line", "text-sm text-red-500")} />
                        </span>
                        <p className="font-medium">{row.vendor || "—"}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{row.category}</td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium", EXP_STATUS_STYLE[row.status] ?? "bg-muted text-muted-foreground")}>
                        {row.status}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                      {row.incurredAt ? new Date(row.incurredAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatCents(row.amountCents, row.currency)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => openEdit(row)}
                          className="flex size-7 items-center justify-center rounded-lg border border-input transition hover:bg-muted">
                          <i className="ri-pencil-line text-xs" />
                        </button>
                        <button type="button" onClick={() => setDeleteRow(row)}
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

      {/* create / edit dialogs */}
      <ExpenseFormDialog
        open={createOpen} onOpenChange={setCreateOpen}
        title="Add expense" description="Capture vendor spend for P&L and project costing."
        form={form} setForm={setForm}
        onSubmit={() => createMutation.mutate()}
        pending={createMutation.isPending} error={createMutation.isError} submitLabel="Create"
      />
      <ExpenseFormDialog
        open={Boolean(editRow)} onOpenChange={(o) => { if (!o) setEditRow(null) }}
        title="Edit expense" description="Update classification or amounts."
        form={form} setForm={setForm}
        onSubmit={() => updateMutation.mutate()}
        pending={updateMutation.isPending} error={updateMutation.isError} submitLabel="Save"
      />

      {/* delete confirm */}
      <Dialog open={Boolean(deleteRow)} onOpenChange={(o) => { if (!o) setDeleteRow(null) }}>
        <DialogContent className="w-[min(92vw,28rem)] rounded-2xl" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Remove expense?</DialogTitle>
            <DialogDescription>{deleteRow?.vendor || "This row"} will be removed from reports.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDeleteRow(null)}>Cancel</Button>
            <Button type="button" variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
              {deleteMutation.isPending ? <><i className="ri-loader-4-line animate-spin" /> Removing…</> : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

type FormShape = {
  vendor: string; category: (typeof CATEGORIES)[number]; status: (typeof STATUSES)[number]
  amountMajor: string; currency: string; incurredAt: string; notes: string
}

function ExpenseFormDialog({ open, onOpenChange, title, description, form, setForm, onSubmit, pending, error, submitLabel }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description: string
  form: FormShape; setForm: Dispatch<SetStateAction<FormShape>>
  onSubmit: () => void; pending: boolean; error: boolean; submitLabel: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(95vw,28rem)] rounded-2xl p-0" showCloseButton={false}>
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); onSubmit() }} className="space-y-4 p-6">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Vendor</Label>
              <Input className="mt-1" value={form.vendor} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => CATEGORIES.includes(v as (typeof CATEGORIES)[number]) && setForm((f) => ({ ...f, category: v as (typeof CATEGORIES)[number] }))}>
                  <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => STATUSES.includes(v as (typeof STATUSES)[number]) && setForm((f) => ({ ...f, status: v as (typeof STATUSES)[number] }))}>
                  <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Amount</Label>
              <Input className="mt-1" inputMode="decimal" value={form.amountMajor} onChange={(e) => setForm((f) => ({ ...f, amountMajor: e.target.value }))} />
            </div>
            <div>
              <Label>Incurred date</Label>
              <Input type="date" className="mt-1" value={form.incurredAt} onChange={(e) => setForm((f) => ({ ...f, incurredAt: e.target.value }))} />
            </div>
            <div>
              <Label>Notes</Label>
              <textarea className="mt-1 flex min-h-[64px] w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          {error && <p className="text-xs text-destructive">Something went wrong.</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending || !parseMajorToCents(form.amountMajor)}>
              {pending ? <><i className="ri-loader-4-line animate-spin" /> Saving…</> : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
