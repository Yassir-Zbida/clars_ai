"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, PlusIcon, SearchIcon } from "lucide-react"

import { DocumentTypeBadge, InvoiceStatusBadge } from "@/components/finance/status-badges"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCents, parseMajorToCents } from "@/lib/money"

type InvoiceRow = {
  id: string
  number: string
  documentType: string
  title?: string | null
  status: string
  amountCents: number
  currency: string
  dueDate: string
  issuedAt: string
  clientId: string
  clientName?: string | null
  projectId?: string | null
}

type ContactOption = { id: string; fullName?: string; name?: string; email?: string }
type ProjectOption = { id: string; name?: string | null }

const STATUS_OPTIONS = ["all", "DRAFT", "SENT", "VIEWED", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"] as const

function defaultDueDate() {
  const d = new Date()
  d.setDate(d.getDate() + 14)
  return d.toISOString().slice(0, 10)
}

export default function InvoicesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  const urlType = searchParams.get("type")?.toLowerCase()
  const documentTypeFilter = urlType === "quote" ? "QUOTE" : "INVOICE"

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    const s = searchParams.get("status")?.toUpperCase()
    if (s && (STATUS_OPTIONS as readonly string[]).includes(s)) setStatusFilter(s)
  }, [searchParams])
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({
    clientId: "",
    projectId: "",
    title: "",
    amountMajor: "",
    dueDate: defaultDueDate(),
    status: "DRAFT",
    notes: "",
    currency: "EUR",
  })

  const { data: contactsData } = useQuery({
    queryKey: ["clients", "picker"],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: "1",
        limit: "200",
        sortBy: "fullName",
        sortDir: "asc",
      })
      const res = await fetch(`/api/clients?${params}`, { credentials: "include" })
      if (!res.ok) throw new Error("clients")
      const json = (await res.json()) as { data: ContactOption[] }
      return json.data
    },
  })

  const { data: projectsData } = useQuery({
    queryKey: ["projects", "picker"],
    queryFn: async () => {
      const res = await fetch("/api/projects?limit=100&sortBy=name&sortDir=asc", { credentials: "include" })
      if (!res.ok) throw new Error("projects")
      const json = (await res.json()) as { data: ProjectOption[] }
      return json.data
    },
  })

  const contacts = contactsData ?? []
  const projects = projectsData ?? []

  const { data, isLoading, isError } = useQuery({
    queryKey: ["invoices", "list", search, statusFilter, documentTypeFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: "1",
        limit: "50",
        sortBy: "issuedAt",
        sortDir: "desc",
        documentType: documentTypeFilter,
      })
      if (search.trim()) params.set("search", search.trim())
      if (statusFilter !== "all") params.set("status", statusFilter)
      const res = await fetch(`/api/invoices?${params}`, { credentials: "include" })
      if (!res.ok) throw new Error("invoices")
      return (await res.json()) as { data: InvoiceRow[]; total: number }
    },
  })

  const rows = useMemo(() => data?.data ?? [], [data])

  const createMutation = useMutation({
    mutationFn: async () => {
      const cents = parseMajorToCents(form.amountMajor)
      if (!form.clientId || !cents) throw new Error("validation")
      const body: Record<string, unknown> = {
        clientId: form.clientId,
        documentType: documentTypeFilter,
        dueDate: new Date(form.dueDate).toISOString(),
        status: form.status,
        currency: form.currency,
        amountCents: cents,
      }
      if (form.projectId) body.projectId = form.projectId
      if (form.title.trim()) body.title = form.title.trim()
      if (form.notes.trim()) body.notes = form.notes.trim()

      const res = await fetch("/api/invoices", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || "create failed")
      }
      return (await res.json()) as { data: { id: string } }
    },
    onSuccess: async (json) => {
      await queryClient.invalidateQueries({ queryKey: ["invoices"] })
      await queryClient.invalidateQueries({ queryKey: ["finance"] })
      setCreateOpen(false)
      setForm({
        clientId: "",
        projectId: "",
        title: "",
        amountMajor: "",
        dueDate: defaultDueDate(),
        status: "DRAFT",
        notes: "",
        currency: "EUR",
      })
      router.push(`/dashboard/invoices/${json.data.id}`)
    },
  })

  const heading = documentTypeFilter === "QUOTE" ? "Quotes" : "Invoices"
  const subtitle =
    documentTypeFilter === "QUOTE"
      ? "Proposals and estimates before they become invoices."
      : "Bill customers and track collection like a revenue workspace."

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-2 pt-0 lg:px-6 lg:pt-0">
      <Card className="rounded-xl border border-input ring-0">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">{heading}</h2>
              <p className="text-xs text-muted-foreground">
                {data?.total ?? 0} documents · {subtitle}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-56">
                <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search number, title, notes…"
                  className="h-8 pl-8 text-xs"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => typeof v === "string" && v && setStatusFilter(v)}>
                <SelectTrigger className="h-8 w-full text-xs sm:w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === "all" ? "All statuses" : s.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <a href="/dashboard/invoices" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs")}>
                  Invoices
                </a>
                <a
                  href="/dashboard/invoices?type=quote"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs")}
                >
                  Quotes
                </a>
              </div>
              <Button type="button" size="sm" className="h-8 text-xs" onClick={() => setCreateOpen(true)}>
                <PlusIcon className="size-3.5" />
                New {documentTypeFilter === "QUOTE" ? "quote" : "invoice"}
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading…
            </div>
          ) : isError ? (
            <div className="flex h-32 flex-col items-center justify-center gap-1 text-center text-sm text-muted-foreground">
              <p>Unable to load documents.</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-1 text-center text-sm text-muted-foreground">
              <p>No documents match this view.</p>
              <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={() => setCreateOpen(true)}>
                Create your first {documentTypeFilter === "QUOTE" ? "quote" : "invoice"}
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-input">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-input">
                    <TableHead className="w-[28%]">Document</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-[120px] text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} className="border-input hover:bg-muted/25">
                      <TableCell className="py-2.5">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium">{row.number}</span>
                          {row.title ? <span className="text-[11px] text-muted-foreground">{row.title}</span> : null}
                          <DocumentTypeBadge type={row.documentType} />
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.clientName || "—"}</TableCell>
                      <TableCell>
                        <InvoiceStatusBadge status={row.status} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.dueDate ? new Date(row.dueDate).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {formatCents(row.amountCents, row.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/invoices/${row.id}`)}>
                          Open
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="w-[min(95vw,32rem)] rounded-xl p-0" showCloseButton={false}>
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault()
              createMutation.mutate()
            }}
            className="space-y-4 p-5"
          >
            <DialogHeader>
              <DialogTitle>New {documentTypeFilter === "QUOTE" ? "quote" : "invoice"}</DialogTitle>
              <DialogDescription>Issue a document with a total. You can refine line items later from the detail page.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-3">
              <div>
                <Label>Contact</Label>
                <Select
                  value={form.clientId || undefined}
                  onValueChange={(v) => typeof v === "string" && setForm((f) => ({ ...f, clientId: v }))}
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue placeholder="Select contact" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.fullName || c.name || c.email || c.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Project (optional)</Label>
                <Select
                  value={form.projectId || "__none__"}
                  onValueChange={(v) =>
                    typeof v === "string" && setForm((f) => ({ ...f, projectId: v === "__none__" ? "" : v }))
                  }
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name || p.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Amount ({form.currency})</Label>
                  <Input
                    className="mt-1"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={form.amountMajor}
                    onChange={(e) => setForm((f) => ({ ...f, amountMajor: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Due date</Label>
                  <Input
                    type="date"
                    className="mt-1"
                    value={form.dueDate}
                    onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => typeof v === "string" && v && setForm((f) => ({ ...f, status: v }))}
                  >
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["DRAFT", "SENT", "VIEWED"].map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Currency</Label>
                  <Input className="mt-1" value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Title (optional)</Label>
                <Input className="mt-1" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <Label>Notes</Label>
                <textarea
                  className="mt-1 flex min-h-[72px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>

            {createMutation.isError ? (
              <p className="text-xs text-destructive">
                {(createMutation.error as Error)?.message || "Could not create document."}
              </p>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || !form.clientId || !parseMajorToCents(form.amountMajor)}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  "Create"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
