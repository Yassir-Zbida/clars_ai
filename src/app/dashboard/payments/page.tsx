"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"

import { cn } from "@/lib/utils"
import { formatCents } from "@/lib/money"
import { useCurrency } from "@/contexts/currency-context"

type PaymentRow = {
  id: string; invoiceId: string; invoiceNumber: string | null
  clientId: string | null; amountCents: number
  method: string | null; reference: string | null; paidAt: string
}

type ContactOption = { id: string; fullName?: string; name?: string }

const METHOD_ICON: Record<string, string> = {
  BANK_TRANSFER: "ri-bank-line",
  CREDIT_CARD:   "ri-bank-card-line",
  CASH:          "ri-money-dollar-circle-line",
  CHECK:         "ri-file-text-line",
  PAYPAL:        "ri-paypal-line",
  STRIPE:        "ri-secure-payment-line",
}

export default function PaymentsPage() {
  const { currency } = useCurrency()

  const { data: payments, isLoading, isError } = useQuery({
    queryKey: ["payments", "list"],
    queryFn: async () => {
      const res = await fetch("/api/payments?limit=80", { credentials: "include" })
      if (!res.ok) throw new Error()
      return ((await res.json()) as { data: PaymentRow[] }).data
    },
  })

  const { data: contacts } = useQuery({
    queryKey: ["clients", "picker"],
    queryFn: async () => {
      const p = new URLSearchParams({ page: "1", limit: "300", sortBy: "fullName", sortDir: "asc" })
      const res = await fetch(`/api/clients?${p}`, { credentials: "include" })
      if (!res.ok) throw new Error()
      return ((await res.json()) as { data: ContactOption[] }).data
    },
  })

  const nameByClientId = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of contacts ?? []) m.set(c.id, c.fullName || c.name || c.id)
    return m
  }, [contacts])

  const rows = payments ?? []

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-4 pt-0 lg:px-6">
      <div className="rounded-2xl border border-input bg-card shadow-sm">

        {/* header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-input px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10">
              <i className="ri-cash-line text-lg text-emerald-500" />
            </span>
            <div>
              <h2 className="text-base font-semibold leading-none">Payments</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Cash applied to invoices, newest first.</p>
            </div>
          </div>
          <Link href="/dashboard/invoices"
            className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium transition hover:bg-muted">
            <i className="ri-file-text-line text-sm" /> Go to invoices
          </Link>
        </div>

        {/* body */}
        {isLoading ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <i className="ri-loader-4-line animate-spin text-xl text-primary" />
            </span>
            <p className="text-sm text-muted-foreground">Loading payments…</p>
          </div>
        ) : isError ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            <i className="ri-error-warning-line mr-2 text-destructive" /> Could not load payments.
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <span className="flex size-10 items-center justify-center rounded-xl bg-muted">
              <i className="ri-cash-line text-xl text-muted-foreground" />
            </span>
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-input bg-muted/30 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  <th className="px-5 py-3">Received</th>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="hidden px-4 py-3 md:table-cell">Contact</th>
                  <th className="hidden px-4 py-3 sm:table-cell">Method</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Reference</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-input">
                {rows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                          <i className="ri-arrow-down-line text-sm text-emerald-500" />
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(row.paidAt).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">{row.invoiceNumber || "—"}</td>
                    <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                      {row.clientId ? nameByClientId.get(row.clientId) ?? "—" : "—"}
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      {row.method ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <i className={cn(METHOD_ICON[row.method] ?? "ri-bank-card-line", "text-sm")} />
                          {row.method.replace(/_/g, " ")}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="hidden max-w-[140px] truncate px-4 py-3 text-xs text-muted-foreground lg:table-cell">
                      {row.reference || "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-500">
                          {formatCents(row.amountCents, currency)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/dashboard/invoices/${row.invoiceId}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-input px-2.5 py-1 text-xs font-medium transition hover:bg-muted">
                        Invoice <i className="ri-arrow-right-line text-xs opacity-60" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
