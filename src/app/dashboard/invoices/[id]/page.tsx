"use client"

import Image from "next/image"
import { FormEvent, useState } from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeftIcon, Loader2, PrinterIcon, Trash2Icon } from "lucide-react"

import { DocumentTypeBadge, InvoiceStatusBadge } from "@/components/finance/status-badges"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCents, parseMajorToCents } from "@/lib/money"
import { getDicebearUrl } from "@/lib/dicebear"

type LineItem = { description: string; quantity: number; unitAmountCents: number }

type InvoiceDetail = {
  id: string
  number: string
  documentType: string
  title?: string | null
  status: string
  amountCents: number
  paidCents: number
  balanceCents: number
  currency: string
  dueDate: string
  issuedAt: string
  notes?: string | null
  clientId: string
  clientName?: string | null
  clientEmail?: string | null
  projectId?: string | null
  lineItems: LineItem[]
}

type PaymentRow = {
  id: string
  amountCents: number
  method: string | null
  reference: string | null
  paidAt: string
}

const STATUSES = ["DRAFT", "SENT", "VIEWED", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"] as const

export default function InvoiceDetailPage() {
  const params = useParams()
  const id = typeof params.id === "string" ? params.id : ""
  const router = useRouter()
  const queryClient = useQueryClient()

  const [payOpen, setPayOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [payAmount, setPayAmount] = useState("")
  const [payMethod, setPayMethod] = useState("")
  const [payRef, setPayRef] = useState("")

  const { data: inv, isLoading, isError } = useQuery({
    queryKey: ["invoices", "detail", id],
    queryFn: async () => {
      const res = await fetch(`/api/invoices/${id}`, { credentials: "include" })
      if (res.status === 404) return null
      if (!res.ok) throw new Error("load")
      const json = (await res.json()) as { data: InvoiceDetail }
      return json.data
    },
    enabled: Boolean(id),
  })

  const { data: payments } = useQuery({
    queryKey: ["invoices", id, "payments"],
    queryFn: async () => {
      const res = await fetch(`/api/invoices/${id}/payments`, { credentials: "include" })
      if (!res.ok) throw new Error("payments")
      const json = (await res.json()) as { data: PaymentRow[] }
      return json.data
    },
    enabled: Boolean(id) && inv?.documentType === "INVOICE",
  })

  const { data: contactDetail } = useQuery({
    queryKey: ["clients", "detail", inv?.clientId],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${inv!.clientId}`, { credentials: "include" })
      if (!res.ok) throw new Error("contact")
      return (await res.json()) as {
        data: {
          id: string; fullName?: string; name?: string; email?: string
          phone?: string; company?: string; jobTitle?: string; type?: string
        }
      }
    },
    enabled: contactOpen && Boolean(inv?.clientId),
  })

  const invalidateFinance = () => {
    queryClient.invalidateQueries({ queryKey: ["invoices"] })
    queryClient.invalidateQueries({ queryKey: ["finance"] })
  }

  const updateMutation = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error("update")
      return (await res.json()) as { data: InvoiceDetail }
    },
    onSuccess: () => {
      invalidateFinance()
      queryClient.invalidateQueries({ queryKey: ["invoices", "detail", id] })
    },
  })

  const payMutation = useMutation({
    mutationFn: async () => {
      const cents = parseMajorToCents(payAmount)
      if (!cents) throw new Error("amount")
      const res = await fetch(`/api/invoices/${id}/payments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountCents: cents,
          method: payMethod.trim() || undefined,
          reference: payRef.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error("pay")
      return res.json()
    },
    onSuccess: async () => {
      setPayOpen(false)
      setPayAmount("")
      setPayMethod("")
      setPayRef("")
      invalidateFinance()
      await queryClient.invalidateQueries({ queryKey: ["invoices", "detail", id] })
      await queryClient.invalidateQueries({ queryKey: ["invoices", id, "payments"] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE", credentials: "include" })
      if (!res.ok) throw new Error("delete")
    },
    onSuccess: async () => {
      invalidateFinance()
      router.push("/dashboard/invoices")
    },
  })

  if (!id) return null

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16 text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" />
        Loading document…
      </div>
    )
  }

  if (isError || !inv) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">Document not found.</p>
        <Link href="/dashboard/invoices" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Back to invoices
        </Link>
      </div>
    )
  }

  const isQuote = inv.documentType === "QUOTE"

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-8 pt-0 lg:px-6 lg:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/dashboard/invoices" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 gap-1 text-xs")}>
          <ArrowLeftIcon className="size-3.5" />
          Back
        </Link>
        <a
          href={`/print/invoice/${id}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 gap-1.5 text-xs")}
        >
          <PrinterIcon className="size-3.5" />
          Print / PDF
        </a>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold">{inv.number}</h1>
          <DocumentTypeBadge type={inv.documentType} />
          <InvoiceStatusBadge status={inv.status} />
        </div>
        {inv.title ? <p className="text-sm text-muted-foreground">{inv.title}</p> : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-xl border border-input lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Amounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2 border-b border-input pb-3">
              <span className="text-muted-foreground">Total</span>
              <span className="text-lg font-semibold">{formatCents(inv.amountCents, inv.currency)}</span>
            </div>
            {!isQuote ? (
              <>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Collected</span>
                  <span className="font-medium text-emerald-400">{formatCents(inv.paidCents, inv.currency)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Balance</span>
                  <span className="font-medium">{formatCents(inv.balanceCents, inv.currency)}</span>
                </div>
              </>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <span className="text-xs text-muted-foreground">Issued</span>
                <p>{inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString() : "—"}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Due</span>
                <p>{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-input">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">{inv.clientName || "—"}</p>
            {inv.clientEmail ? <p className="text-xs text-muted-foreground">{inv.clientEmail}</p> : null}
            <button
              type="button"
              onClick={() => setContactOpen(true)}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-2 w-full text-xs")}
            >
              <i className="ri-user-line mr-1.5 text-xs" /> View contact
            </button>
            {!isQuote && inv.balanceCents > 0 && inv.status !== "CANCELLED" ? (
              <Button type="button" className="mt-2 w-full text-xs" size="sm" onClick={() => setPayOpen(true)}>
                Record payment
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full border-destructive/40 text-xs text-destructive hover:bg-destructive/10"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2Icon className="mr-1 size-3.5" />
              Archive
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border border-input">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Workflow</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label className="text-xs">Status</Label>
            <Select
              value={inv.status}
              onValueChange={(v) => {
                if (typeof v === "string" && v) updateMutation.mutate({ status: v })
              }}
            >
              <SelectTrigger className="w-full sm:max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {updateMutation.isPending ? (
            <span className="flex items-center text-xs text-muted-foreground">
              <Loader2 className="mr-1 size-3 animate-spin" />
              Saving…
            </span>
          ) : null}
        </CardContent>
      </Card>

      {inv.lineItems?.length ? (
        <Card className="rounded-xl border border-input">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Line items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border border-input">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-24 text-right">Qty</TableHead>
                    <TableHead className="w-32 text-right">Unit</TableHead>
                    <TableHead className="w-36 text-right">Line</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inv.lineItems.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{row.description}</TableCell>
                      <TableCell className="text-right text-sm">{row.quantity}</TableCell>
                      <TableCell className="text-right text-sm">{formatCents(row.unitAmountCents, inv.currency)}</TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {formatCents(Math.round(row.quantity * row.unitAmountCents), inv.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {inv.notes ? (
        <Card className="rounded-xl border border-input">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{inv.notes}</p>
          </CardContent>
        </Card>
      ) : null}

      {!isQuote ? (
        <Card className="rounded-xl border border-input">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Payment history</CardTitle>
          </CardHeader>
          <CardContent>
            {!payments?.length ? (
              <p className="text-xs text-muted-foreground">No payments yet.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-input">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs">{new Date(p.paidAt).toLocaleString()}</TableCell>
                        <TableCell className="text-xs">{p.method || "—"}</TableCell>
                        <TableCell className="text-xs">{p.reference || "—"}</TableCell>
                        <TableCell className="text-right text-sm font-medium text-emerald-400">
                          {formatCents(p.amountCents, inv.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="rounded-xl" showCloseButton={false}>
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault()
              payMutation.mutate()
            }}
            className="space-y-4"
          >
            <DialogHeader>
              <DialogTitle>Record payment</DialogTitle>
              <DialogDescription>Applies to {inv.number}. Remaining balance {formatCents(inv.balanceCents, inv.currency)}.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Amount ({inv.currency})</Label>
              <Input inputMode="decimal" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Method</Label>
                <Input value={payMethod} onChange={(e) => setPayMethod(e.target.value)} placeholder="Card, wire…" />
              </div>
              <div>
                <Label>Reference</Label>
                <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="Txn id" />
              </div>
            </div>
            {payMutation.isError ? <p className="text-xs text-destructive">Could not record payment.</p> : null}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setPayOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={payMutation.isPending || !parseMajorToCents(payAmount)}>
                {payMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Save payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* contact popup */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="w-[min(95vw,26rem)] rounded-2xl p-0" showCloseButton={false}>
          <div className="p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base">Contact details</DialogTitle>
            </DialogHeader>

            {/* avatar + name */}
            <div className="flex items-center gap-4">
              <span className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl">
                <Image
                  src={getDicebearUrl(contactDetail?.data?.fullName || contactDetail?.data?.name || inv.clientName || "")}
                  alt={inv.clientName || ""}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </span>
              <div className="min-w-0">
                <p className="text-lg font-semibold leading-tight">
                  {contactDetail?.data?.fullName || contactDetail?.data?.name || inv.clientName || "—"}
                </p>
                {(contactDetail?.data?.jobTitle) && (
                  <p className="text-sm text-muted-foreground">{contactDetail.data.jobTitle}</p>
                )}
                {(contactDetail?.data?.company) && (
                  <p className="text-xs text-muted-foreground">{contactDetail.data.company}</p>
                )}
              </div>
            </div>

            {/* detail rows */}
            <div className="divide-y divide-input rounded-xl border border-input text-sm">
              {(contactDetail?.data?.email || inv.clientEmail) && (
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <i className="ri-mail-line shrink-0 text-muted-foreground" />
                  <a href={`mailto:${contactDetail?.data?.email || inv.clientEmail}`}
                    className="truncate text-primary hover:underline underline-offset-4">
                    {contactDetail?.data?.email || inv.clientEmail}
                  </a>
                </div>
              )}
              {contactDetail?.data?.phone && (
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <i className="ri-phone-line shrink-0 text-muted-foreground" />
                  <a href={`tel:${contactDetail.data.phone}`} className="text-primary hover:underline underline-offset-4">
                    {contactDetail.data.phone}
                  </a>
                </div>
              )}
              {contactDetail?.data?.type && (
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <i className="ri-price-tag-3-line shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground capitalize">{contactDetail.data.type.toLowerCase()}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="ghost" className="flex-1" onClick={() => setContactOpen(false)}>
                Close
              </Button>
              <Link
                href={`/dashboard/clients/${inv.clientId}`}
                className={cn(buttonVariants({ variant: "outline" }), "flex-1 text-xs gap-1.5")}
              >
                Full profile <i className="ri-arrow-right-line text-xs opacity-60" />
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="rounded-xl" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Archive this document?</DialogTitle>
            <DialogDescription>
              {inv.number} will be hidden from lists. This action can be reversed only by support restoring data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDeleteOpen(false)}>
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
