"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { ArrowRightIcon, Loader2 } from "lucide-react"

import { InvoiceStatusBadge, DocumentTypeBadge } from "@/components/finance/status-badges"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCents } from "@/lib/money"

type Summary = {
  outstandingCents: number
  overdueCents: number
  revenueMtdCents: number
  expensesMtdCents: number
  netMtdCents: number
  invoiceCount: number
  statusBreakdown: Record<string, number>
}

type InvoiceRow = {
  id: string
  number: string
  documentType: string
  title?: string | null
  status: string
  amountCents: number
  currency: string
  dueDate: string
  clientName?: string | null
}

type PaymentRow = {
  id: string
  invoiceNumber: string | null
  amountCents: number
  method: string | null
  paidAt: string
}

type ExpenseRow = {
  id: string
  vendor: string | null
  category: string
  status: string
  amountCents: number
  currency: string
  incurredAt: string
}

export default function FinanceOverviewPage() {
  const { data: summary, isLoading: sumLoading } = useQuery({
    queryKey: ["finance", "summary"],
    queryFn: async () => {
      const res = await fetch("/api/finance/summary", { credentials: "include" })
      if (!res.ok) throw new Error("summary")
      const json = (await res.json()) as { data: Summary }
      return json.data
    },
  })

  const { data: recentInvoices, isLoading: invLoading } = useQuery({
    queryKey: ["finance", "recent-invoices"],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: "1",
        limit: "6",
        sortBy: "dueDate",
        sortDir: "asc",
        documentType: "INVOICE",
      })
      const res = await fetch(`/api/invoices?${params}`, { credentials: "include" })
      if (!res.ok) throw new Error("invoices")
      const json = (await res.json()) as { data: InvoiceRow[] }
      return json.data
    },
  })

  const { data: recentPayments, isLoading: payLoading } = useQuery({
    queryKey: ["finance", "recent-payments"],
    queryFn: async () => {
      const res = await fetch("/api/payments?limit=8", { credentials: "include" })
      if (!res.ok) throw new Error("payments")
      const json = (await res.json()) as { data: PaymentRow[] }
      return json.data
    },
  })

  const { data: recentExpenses, isLoading: expLoading } = useQuery({
    queryKey: ["finance", "recent-expenses"],
    queryFn: async () => {
      const params = new URLSearchParams({ page: "1", limit: "6", sortDir: "desc" })
      const res = await fetch(`/api/expenses?${params}`, { credentials: "include" })
      if (!res.ok) throw new Error("expenses")
      const json = (await res.json()) as { data: ExpenseRow[] }
      return json.data
    },
  })

  const loading = sumLoading

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-2 pt-0 lg:px-6 lg:pt-0">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Finance</h1>
        <p className="text-xs text-muted-foreground">Cash position, billing documents, and spend in one place.</p>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" />
          Loading finance snapshot…
        </div>
      ) : summary ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Outstanding AR"
            value={formatCents(summary.outstandingCents)}
            hint="Open invoice balance"
            tone="default"
          />
          <KpiCard label="Overdue" value={formatCents(summary.overdueCents)} hint="Past due, unpaid" tone="danger" />
          <KpiCard
            label="Revenue (MTD)"
            value={formatCents(summary.revenueMtdCents)}
            hint="Payments collected"
            tone="success"
          />
          <KpiCard
            label="Net (MTD)"
            value={formatCents(summary.netMtdCents)}
            hint={`Expenses ${formatCents(summary.expensesMtdCents)}`}
            tone={summary.netMtdCents >= 0 ? "success" : "danger"}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/invoices" className={cn(buttonVariants({ size: "sm" }), "h-8 text-xs")}>
          Invoices
          <ArrowRightIcon className="ml-1 size-3" />
        </Link>
        <Link
          href="/dashboard/invoices?type=quote"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs")}
        >
          Quotes
        </Link>
        <Link href="/dashboard/payments" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs")}>
          Payments
        </Link>
        <Link href="/dashboard/expenses" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs")}>
          Expenses
        </Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-xl border border-input">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming & open invoices</CardTitle>
            <Link href="/dashboard/invoices" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 text-xs")}>
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {invLoading ? (
              <MiniLoader />
            ) : !recentInvoices?.length ? (
              <p className="text-xs text-muted-foreground">No invoices yet. Create one from the Invoices page.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-input">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="border-input">
                      <TableHead className="text-xs">Document</TableHead>
                      <TableHead className="text-xs">Contact</TableHead>
                      <TableHead className="text-xs">Due</TableHead>
                      <TableHead className="text-right text-xs">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentInvoices.map((row) => (
                      <TableRow key={row.id} className="border-input">
                        <TableCell className="py-2">
                          <Link href={`/dashboard/invoices/${row.id}`} className="text-sm font-medium hover:underline">
                            {row.number}
                          </Link>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1">
                            <DocumentTypeBadge type={row.documentType} />
                            <InvoiceStatusBadge status={row.status} />
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{row.clientName || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {row.dueDate ? new Date(row.dueDate).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {formatCents(row.amountCents, row.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-input">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent payments</CardTitle>
            <Link href="/dashboard/payments" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 text-xs")}>
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {payLoading ? (
              <MiniLoader />
            ) : !recentPayments?.length ? (
              <p className="text-xs text-muted-foreground">No payments recorded yet.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-input">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="border-input">
                      <TableHead className="text-xs">Invoice</TableHead>
                      <TableHead className="text-xs">When</TableHead>
                      <TableHead className="text-xs">Method</TableHead>
                      <TableHead className="text-right text-xs">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentPayments.map((row) => (
                      <TableRow key={row.id} className="border-input">
                        <TableCell className="py-2 text-sm">{row.invoiceNumber || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(row.paidAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{row.method || "—"}</TableCell>
                        <TableCell className="text-right text-sm font-medium text-emerald-400">
                          {formatCents(row.amountCents)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border border-input">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Recent expenses</CardTitle>
          <Link href="/dashboard/expenses" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 text-xs")}>
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {expLoading ? (
            <MiniLoader />
          ) : !recentExpenses?.length ? (
            <p className="text-xs text-muted-foreground">Log vendor spend to see it here.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-input">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-input">
                    <TableHead className="text-xs">Vendor</TableHead>
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-right text-xs">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentExpenses.map((row) => (
                    <TableRow key={row.id} className="border-input">
                      <TableCell className="py-2 text-sm">{row.vendor || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.category}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.incurredAt ? new Date(row.incurredAt).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {formatCents(row.amountCents, row.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {summary && Object.keys(summary.statusBreakdown).length > 0 ? (
        <Card className="rounded-xl border border-input">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Invoice pipeline</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Object.entries(summary.statusBreakdown).map(([k, v]) => (
              <span
                key={k}
                className="inline-flex items-center gap-1.5 rounded-full border border-input bg-muted/20 px-2.5 py-1 text-xs"
              >
                <InvoiceStatusBadge status={k} />
                <span className="text-muted-foreground">{v}</span>
              </span>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function KpiCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint: string
  tone: "default" | "success" | "danger"
}) {
  return (
    <Card
      className={
        tone === "danger"
          ? "rounded-xl border border-red-500/20 bg-red-500/5"
          : tone === "success"
            ? "rounded-xl border border-emerald-500/20 bg-emerald-500/5"
            : "rounded-xl border border-input"
      }
    >
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}

function MiniLoader() {
  return (
    <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">
      <Loader2 className="mr-2 size-4 animate-spin" />
      Loading…
    </div>
  )
}
