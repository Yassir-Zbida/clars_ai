"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"

import { InvoiceStatusBadge, DocumentTypeBadge } from "@/components/finance/status-badges"
import { cn } from "@/lib/utils"
import { formatCents } from "@/lib/money"
import { useCurrency } from "@/contexts/currency-context"

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

type KpiConfig = {
  label: string
  value: string
  hint: string
  icon: string
  iconBg: string
  iconColor: string
  tone: "default" | "success" | "danger"
}

function KpiCard({ label, value, hint, icon, iconBg, iconColor, tone }: KpiConfig) {
  return (
    <div className={cn(
      "rounded-2xl border bg-card p-4 shadow-sm",
      tone === "danger"  ? "border-red-500/20 bg-red-500/5" :
      tone === "success" ? "border-emerald-500/20 bg-emerald-500/5" :
      "border-input"
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", iconBg)}>
          <i className={cn(icon, iconColor, "text-lg")} />
        </span>
      </div>
    </div>
  )
}

function SectionHeader({ icon, iconBg, iconColor, title, action }: {
  icon: string; iconBg: string; iconColor: string; title: string
  action?: { label: string; href: string }
}) {
  return (
    <div className="flex items-center justify-between border-b border-input px-5 py-3">
      <div className="flex items-center gap-2.5">
        <span className={cn("flex size-7 items-center justify-center rounded-lg", iconBg)}>
          <i className={cn(icon, iconColor, "text-sm")} />
        </span>
        <p className="text-sm font-semibold">{title}</p>
      </div>
      {action && (
        <Link href={action.href}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground">
          {action.label} <i className="ri-arrow-right-line text-xs" />
        </Link>
      )}
    </div>
  )
}

const PIPELINE_STYLE: Record<string, string> = {
  DRAFT:          "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  SENT:           "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  VIEWED:         "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  PAID:           "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  OVERDUE:        "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  CANCELLED:      "bg-slate-100 text-slate-400 line-through dark:bg-slate-800",
}

const PIPELINE_DOT: Record<string, string> = {
  DRAFT:          "bg-slate-400",
  SENT:           "bg-blue-500",
  VIEWED:         "bg-violet-500",
  PARTIALLY_PAID: "bg-amber-500",
  PAID:           "bg-emerald-500",
  OVERDUE:        "bg-red-500",
  CANCELLED:      "bg-slate-400",
}

const PIPELINE_COUNT: Record<string, string> = {
  DRAFT:          "bg-slate-200 text-slate-600 dark:bg-slate-700",
  SENT:           "bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200",
  VIEWED:         "bg-violet-200 text-violet-800 dark:bg-violet-800 dark:text-violet-200",
  PARTIALLY_PAID: "bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200",
  PAID:           "bg-emerald-200 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200",
  OVERDUE:        "bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200",
  CANCELLED:      "bg-slate-200 text-slate-500 dark:bg-slate-700",
}

export default function FinanceOverviewPage() {
  const { currency } = useCurrency()
  const fmt = (cents: number) => formatCents(cents, currency)

  const { data: summary, isLoading: sumLoading } = useQuery({
    queryKey: ["finance", "summary"],
    queryFn: async () => {
      const res = await fetch("/api/finance/summary", { credentials: "include" })
      if (!res.ok) throw new Error("summary")
      return ((await res.json()) as { data: Summary }).data
    },
  })

  const { data: recentInvoices, isLoading: invLoading } = useQuery({
    queryKey: ["finance", "recent-invoices"],
    queryFn: async () => {
      const params = new URLSearchParams({ page: "1", limit: "6", sortBy: "dueDate", sortDir: "asc", documentType: "INVOICE" })
      const res = await fetch(`/api/invoices?${params}`, { credentials: "include" })
      if (!res.ok) throw new Error("invoices")
      return ((await res.json()) as { data: InvoiceRow[] }).data
    },
  })

  const { data: recentPayments, isLoading: payLoading } = useQuery({
    queryKey: ["finance", "recent-payments"],
    queryFn: async () => {
      const res = await fetch("/api/payments?limit=8", { credentials: "include" })
      if (!res.ok) throw new Error("payments")
      return ((await res.json()) as { data: PaymentRow[] }).data
    },
  })

  const { data: recentExpenses, isLoading: expLoading } = useQuery({
    queryKey: ["finance", "recent-expenses"],
    queryFn: async () => {
      const params = new URLSearchParams({ page: "1", limit: "6", sortDir: "desc" })
      const res = await fetch(`/api/expenses?${params}`, { credentials: "include" })
      if (!res.ok) throw new Error("expenses")
      return ((await res.json()) as { data: ExpenseRow[] }).data
    },
  })

  const kpis: KpiConfig[] = summary ? [
    {
      label: "Outstanding AR",
      value: fmt(summary.outstandingCents),
      hint: "Open invoice balance",
      icon: "ri-file-text-line",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
      tone: "default",
    },
    {
      label: "Overdue",
      value: fmt(summary.overdueCents),
      hint: "Past due, unpaid",
      icon: "ri-alarm-warning-line",
      iconBg: "bg-red-500/10",
      iconColor: "text-red-500",
      tone: summary.overdueCents > 0 ? "danger" : "default",
    },
    {
      label: "Revenue (MTD)",
      value: fmt(summary.revenueMtdCents),
      hint: "Payments collected",
      icon: "ri-money-dollar-circle-line",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-500",
      tone: "success",
    },
    {
      label: "Net (MTD)",
      value: fmt(summary.netMtdCents),
      hint: `Expenses ${fmt(summary.expensesMtdCents)}`,
      icon: "ri-line-chart-line",
      iconBg: summary.netMtdCents >= 0 ? "bg-emerald-500/10" : "bg-red-500/10",
      iconColor: summary.netMtdCents >= 0 ? "text-emerald-500" : "text-red-500",
      tone: summary.netMtdCents >= 0 ? "success" : "danger",
    },
  ] : []

  return (
    <div className="flex flex-1 flex-col gap-5 px-4 pb-4 pt-0 lg:px-6">

      {/* page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10">
            <i className="ri-bank-card-line text-lg text-emerald-500" />
          </span>
          <div>
            <h1 className="text-base font-semibold leading-none">Finance</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">Cash position, billing &amp; spend in one place.</p>
          </div>
        </div>
        {/* quick nav */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Invoices",  href: "/dashboard/invoices",             icon: "ri-file-text-line" },
            { label: "Quotes",    href: "/dashboard/invoices?type=quote",  icon: "ri-draft-line" },
            { label: "Payments",  href: "/dashboard/payments",             icon: "ri-cash-line" },
            { label: "Expenses",  href: "/dashboard/expenses",             icon: "ri-receipt-line" },
          ].map((item) => (
            <Link key={item.href} href={item.href}
              className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-card px-3 py-1.5 text-xs font-medium transition hover:bg-muted">
              <i className={cn(item.icon, "text-sm text-muted-foreground")} />
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      {sumLoading ? (
        <div className="flex h-32 flex-col items-center justify-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
            <i className="ri-loader-4-line animate-spin text-lg text-primary" />
          </span>
          <p className="text-xs text-muted-foreground">Loading snapshot…</p>
        </div>
      ) : kpis.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
        </div>
      ) : null}

      {/* invoice pipeline pills */}
      {summary && Object.keys(summary.statusBreakdown).length > 0 && (
        <div className="rounded-2xl border border-input bg-card shadow-sm">
          <SectionHeader icon="ri-bar-chart-grouped-line" iconBg="bg-blue-500/10" iconColor="text-blue-500" title="Invoice pipeline" />
          <div className="flex flex-wrap gap-2 px-5 py-4">
            {Object.entries(summary.statusBreakdown).map(([k, v]) => (
              <span key={k} className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${PIPELINE_STYLE[k] ?? "bg-muted/60 text-muted-foreground"}`}>
                <span className={`size-1.5 rounded-full ${PIPELINE_DOT[k] ?? "bg-muted-foreground"}`} />
                {k.replace(/_/g, " ")}
                <span className={`flex size-5 items-center justify-center rounded-full text-[11px] font-bold ${PIPELINE_COUNT[k] ?? "bg-black/10 text-current"}`}>{v}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* tables grid */}
      <div className="grid gap-4 xl:grid-cols-2">

        {/* upcoming invoices */}
        <div className="rounded-2xl border border-input bg-card shadow-sm">
          <SectionHeader icon="ri-file-text-line" iconBg="bg-blue-500/10" iconColor="text-blue-500"
            title="Upcoming & open invoices" action={{ label: "View all", href: "/dashboard/invoices" }} />
          <div className="px-2 py-2">
            {invLoading ? <MiniLoader /> : !recentInvoices?.length ? (
              <p className="px-3 py-4 text-xs text-muted-foreground">No invoices yet. Create one from the Invoices page.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    <th className="px-3 py-2">Document</th>
                    <th className="px-3 py-2">Contact</th>
                    <th className="hidden px-3 py-2 sm:table-cell">Due</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-input">
                  {recentInvoices.map((row) => (
                    <tr key={row.id} className="transition hover:bg-muted/30">
                      <td className="px-3 py-2.5">
                        <Link href={`/dashboard/invoices/${row.id}`} className="text-sm font-medium hover:text-primary hover:underline underline-offset-4 transition">
                          {row.number}
                        </Link>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1">
                          <DocumentTypeBadge type={row.documentType} />
                          <InvoiceStatusBadge status={row.status} />
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{row.clientName || "—"}</td>
                      <td className="hidden px-3 py-2.5 text-xs text-muted-foreground sm:table-cell">
                        {row.dueDate ? new Date(row.dueDate).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right text-sm font-medium">{fmt(row.amountCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* recent payments */}
        <div className="rounded-2xl border border-input bg-card shadow-sm">
          <SectionHeader icon="ri-cash-line" iconBg="bg-emerald-500/10" iconColor="text-emerald-500"
            title="Recent payments" action={{ label: "View all", href: "/dashboard/payments" }} />
          <div className="px-2 py-2">
            {payLoading ? <MiniLoader /> : !recentPayments?.length ? (
              <p className="px-3 py-4 text-xs text-muted-foreground">No payments recorded yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    <th className="px-3 py-2">Invoice</th>
                    <th className="px-3 py-2">When</th>
                    <th className="hidden px-3 py-2 sm:table-cell">Method</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-input">
                  {recentPayments.map((row) => (
                    <tr key={row.id} className="transition hover:bg-muted/30">
                      <td className="px-3 py-2.5 text-sm font-medium">{row.invoiceNumber || "—"}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{new Date(row.paidAt).toLocaleDateString()}</td>
                      <td className="hidden px-3 py-2.5 text-xs text-muted-foreground sm:table-cell">{row.method || "—"}</td>
                      <td className="px-3 py-2.5 text-right text-sm font-semibold text-emerald-500">{fmt(row.amountCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* recent expenses */}
      <div className="rounded-2xl border border-input bg-card shadow-sm">
        <SectionHeader icon="ri-receipt-line" iconBg="bg-red-500/10" iconColor="text-red-500"
          title="Recent expenses" action={{ label: "View all", href: "/dashboard/expenses" }} />
        <div className="px-2 py-2">
          {expLoading ? <MiniLoader /> : !recentExpenses?.length ? (
            <p className="px-3 py-4 text-xs text-muted-foreground">Log vendor spend to see it here.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  <th className="px-3 py-2">Vendor</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="hidden px-3 py-2 sm:table-cell">Date</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-input">
                {recentExpenses.map((row) => (
                  <tr key={row.id} className="transition hover:bg-muted/30">
                    <td className="px-3 py-2.5 text-sm font-medium">{row.vendor || "—"}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{row.category}</td>
                    <td className="hidden px-3 py-2.5 text-xs text-muted-foreground sm:table-cell">
                      {row.incurredAt ? new Date(row.incurredAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right text-sm font-medium">{fmt(row.amountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function MiniLoader() {
  return (
    <div className="flex h-20 items-center justify-center gap-2 text-xs text-muted-foreground">
      <i className="ri-loader-4-line animate-spin" /> Loading…
    </div>
  )
}
