"use client"

import type { Dispatch, SetStateAction } from "react"
import { FormEvent, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { ExpenseStatusBadge } from "@/components/finance/status-badges"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCents, parseMajorToCents } from "@/lib/money"

type ExpenseRow = {
  id: string
  vendor: string | null
  category: string
  status: string
  amountCents: number
  currency: string
  incurredAt: string
  notes: string | null
  projectId: string | null
  clientId: string | null
}

const CATEGORIES = ["SOFTWARE", "TRAVEL", "MEALS", "OFFICE", "MARKETING", "PROFESSIONAL", "OTHER"] as const
const STATUSES = ["PENDING", "APPROVED", "REJECTED", "PAID"] as const
const CAT_FILTER = ["all", ...CATEGORIES] as const
const STATUS_FILTER = ["all", ...STATUSES] as const

function todayISODate() {
  return new Date().toISOString().slice(0, 10)
}

export default function ExpensesPage() {
  const queryClient = useQueryClient()
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [createOpen, setCreateOpen] = useState(false)
  const [editRow, setEditRow] = useState<ExpenseRow | null>(null)
  const [deleteRow, setDeleteRow] = useState<ExpenseRow | null>(null)

  const [form, setForm] = useState({
    vendor: "",
    category: "OTHER" as (typeof CATEGORIES)[number],
    status: "PENDING" as (typeof STATUSES)[number],
    amountMajor: "",
    currency: "EUR",
    incurredAt: todayISODate(),
    notes: "",
  })

  const { data, isLoading, isError } = useQuery({
    queryKey: ["expenses", "list", categoryFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: "1",
        limit: "80",
        sortDir: "desc",
      })
      if (categoryFilter !== "all") params.set("category", categoryFilter)
      if (statusFilter !== "all") params.set("status", statusFilter)
      const res = await fetch(`/api/expenses?${params}`, { credentials: "include" })
      if (!res.ok) throw new Error("expenses")
      return (await res.json()) as { data: ExpenseRow[]; total: number }
    },
  })

  const rows = useMemo(() => data?.data ?? [], [data])

  const resetForm = () =>
    setForm({
      vendor: "",
      category: "OTHER",
      status: "PENDING",
      amountMajor: "",
      currency: "EUR",
      incurredAt: todayISODate(),
      notes: "",
    })

  const createMutation = useMutation({
    mutationFn: async () => {
      const cents = parseMajorToCents(form.amountMajor)
      if (!cents) throw new Error("amount")
      const res = await fetch("/api/expenses", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor: form.vendor.trim() || undefined,
          category: form.category,
          status: form.status,
          amountCents: cents,
          currency: form.currency,
          incurredAt: new Date(form.incurredAt).toISOString(),
          notes: form.notes.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error("create")
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["expenses"] })
      await queryClient.invalidateQueries({ queryKey: ["finance"] })
      setCreateOpen(false)
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editRow) return
      const cents = parseMajorToCents(form.amountMajor)
      if (!cents) throw new Error("amount")
      const res = await fetch(`/api/expenses/${editRow.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor: form.vendor.trim() || undefined,
          category: form.category,
          status: form.status,
          amountCents: cents,
          currency: form.currency,
          incurredAt: new Date(form.incurredAt).toISOString(),
          notes: form.notes.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error("update")
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["expenses"] })
      await queryClient.invalidateQueries({ queryKey: ["finance"] })
      setEditRow(null)
      resetForm()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deleteRow) return
      const res = await fetch(`/api/expenses/${deleteRow.id}`, { method: "DELETE", credentials: "include" })
      if (!res.ok) throw new Error("delete")
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["expenses"] })
      await queryClient.invalidateQueries({ queryKey: ["finance"] })
      setDeleteRow(null)
    },
  })

  const openEdit = (row: ExpenseRow) => {
    setEditRow(row)
    setForm({
      vendor: row.vendor ?? "",
      category: (CATEGORIES.includes(row.category as (typeof CATEGORIES)[number]) ? row.category : "OTHER") as (typeof CATEGORIES)[number],
      status: (STATUSES.includes(row.status as (typeof STATUSES)[number]) ? row.status : "PENDING") as (typeof STATUSES)[number],
      amountMajor: (row.amountCents / 100).toFixed(2),
      currency: row.currency || "EUR",
      incurredAt: row.incurredAt ? new Date(row.incurredAt).toISOString().slice(0, 10) : todayISODate(),
      notes: row.notes ?? "",
    })
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-2 pt-0 lg:px-6 lg:pt-0">
      <Card className="rounded-xl border border-input ring-0">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Expenses</h2>
              <p className="text-xs text-muted-foreground">{data?.total ?? 0} records · Operational spend tracking</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select value={categoryFilter} onValueChange={(v) => typeof v === "string" && v && setCategoryFilter(v)}>
                <SelectTrigger className="h-8 w-full text-xs sm:w-[160px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {CAT_FILTER.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c === "all" ? "All categories" : c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => typeof v === "string" && v && setStatusFilter(v)}>
                <SelectTrigger className="h-8 w-full text-xs sm:w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === "all" ? "All statuses" : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" size="sm" className="h-8 text-xs" onClick={() => setCreateOpen(true)}>
                <PlusIcon className="size-3.5" />
                Add expense
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading…
            </div>
          ) : isError ? (
            <p className="text-sm text-muted-foreground">Unable to load expenses.</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No expenses in this view.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-input">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-input">
                    <TableHead>Vendor</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-[140px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} className="border-input hover:bg-muted/25">
                      <TableCell className="text-sm font-medium">{row.vendor || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.category}</TableCell>
                      <TableCell>
                        <ExpenseStatusBadge status={row.status} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.incurredAt ? new Date(row.incurredAt).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {formatCents(row.amountCents, row.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(row)} aria-label="Edit">
                          <PencilIcon className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive"
                          onClick={() => setDeleteRow(row)}
                          aria-label="Delete"
                        >
                          <Trash2Icon className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ExpenseFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Add expense"
        description="Capture vendor spend for P&amp;L and project costing."
        form={form}
        setForm={setForm}
        onSubmit={() => createMutation.mutate()}
        pending={createMutation.isPending}
        error={createMutation.isError}
        submitLabel="Create"
      />

      <ExpenseFormDialog
        open={Boolean(editRow)}
        onOpenChange={(o) => {
          if (!o) setEditRow(null)
        }}
        title="Edit expense"
        description="Update classification or amounts."
        form={form}
        setForm={setForm}
        onSubmit={() => updateMutation.mutate()}
        pending={updateMutation.isPending}
        error={updateMutation.isError}
        submitLabel="Save"
      />

      <Dialog open={Boolean(deleteRow)} onOpenChange={(o) => !o && setDeleteRow(null)}>
        <DialogContent className="rounded-xl" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Remove expense?</DialogTitle>
            <DialogDescription>
              {deleteRow?.vendor || "This row"} will be archived and excluded from reports.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDeleteRow(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Archive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ExpenseFormDialog({
  open,
  onOpenChange,
  title,
  description,
  form,
  setForm,
  onSubmit,
  pending,
  error,
  submitLabel,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  description: string
  form: {
    vendor: string
    category: (typeof CATEGORIES)[number]
    status: (typeof STATUSES)[number]
    amountMajor: string
    currency: string
    incurredAt: string
    notes: string
  }
  setForm: Dispatch<
    SetStateAction<{
      vendor: string
      category: (typeof CATEGORIES)[number]
      status: (typeof STATUSES)[number]
      amountMajor: string
      currency: string
      incurredAt: string
      notes: string
    }>
  >
  onSubmit: () => void
  pending: boolean
  error: boolean
  submitLabel: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(95vw,28rem)] rounded-xl p-0" showCloseButton={false}>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            onSubmit()
          }}
          className="space-y-4 p-5"
        >
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
                <Select
                  value={form.category}
                  onValueChange={(v) =>
                    typeof v === "string" && CATEGORIES.includes(v as (typeof CATEGORIES)[number]) && setForm((f) => ({ ...f, category: v as (typeof CATEGORIES)[number] }))
                  }
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    typeof v === "string" && STATUSES.includes(v as (typeof STATUSES)[number]) && setForm((f) => ({ ...f, status: v as (typeof STATUSES)[number] }))
                  }
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Amount</Label>
                <Input
                  className="mt-1"
                  inputMode="decimal"
                  value={form.amountMajor}
                  onChange={(e) => setForm((f) => ({ ...f, amountMajor: e.target.value }))}
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Input className="mt-1" value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Incurred date</Label>
              <Input
                type="date"
                className="mt-1"
                value={form.incurredAt}
                onChange={(e) => setForm((f) => ({ ...f, incurredAt: e.target.value }))}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <textarea
                className="mt-1 flex min-h-[64px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          {error ? <p className="text-xs text-destructive">Something went wrong.</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !parseMajorToCents(form.amountMajor)}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
