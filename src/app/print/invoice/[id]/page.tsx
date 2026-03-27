"use client"

import { useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"

import { formatCents } from "@/lib/money"

const queryClient = new QueryClient()

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
  taxRatePercent?: number | null
  currency: string
  dueDate: string
  issuedAt: string
  notes?: string | null
  clientId: string
  clientName?: string | null
  clientEmail?: string | null
  lineItems: LineItem[]
}

function PrintPage() {
  const params = useParams()
  const id = typeof params.id === "string" ? params.id : ""
  const didPrint = useRef(false)

  const { data: inv, isLoading, isError } = useQuery({
    queryKey: ["print-invoice", id],
    queryFn: async () => {
      const res = await fetch(`/api/invoices/${id}`, { credentials: "include" })
      if (!res.ok) throw new Error("load")
      const json = (await res.json()) as { data: InvoiceDetail }
      return json.data
    },
    enabled: Boolean(id),
  })

  useEffect(() => {
    if (inv && !didPrint.current) {
      didPrint.current = true
      // Small delay so the page renders fully before print dialog opens
      setTimeout(() => window.print(), 400)
    }
  }, [inv])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-gray-500">
        <Loader2 className="size-4 animate-spin" />
        Preparing document…
      </div>
    )
  }

  if (isError || !inv) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">
        Document not found.
      </div>
    )
  }

  const isQuote = inv.documentType === "QUOTE"
  const subtotal = inv.lineItems.reduce((s, l) => s + Math.round(l.quantity * l.unitAmountCents), 0)
  const taxRate = inv.taxRatePercent ?? 0
  const taxAmount = Math.round(subtotal * (taxRate / 100))

  return (
    <>
      {/* Print button — hidden when actually printing */}
      <div className="print:hidden fixed right-4 top-4 flex gap-2">
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"
        >
          Print / Save PDF
        </button>
        <button
          onClick={() => window.close()}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow hover:bg-gray-50"
        >
          Close
        </button>
      </div>

      {/* Invoice document */}
      <div className="mx-auto min-h-screen max-w-3xl bg-white px-12 py-14 text-gray-900 print:px-0 print:py-0">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-2xl font-bold tracking-tight text-blue-600">Clars.ai</div>
            <div className="mt-0.5 text-xs text-gray-500">Intelligent CRM for Freelancers</div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold uppercase tracking-widest text-gray-300">
              {isQuote ? "Quote" : "Invoice"}
            </div>
            <div className="mt-1 text-base font-semibold text-gray-800">{inv.number}</div>
            <div
              className="mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide"
              style={{ background: statusBg(inv.status), color: statusColor(inv.status) }}
            >
              {inv.status.replace(/_/g, " ")}
            </div>
          </div>
        </div>

        <hr className="my-8 border-gray-200" />

        {/* Bill To + Dates */}
        <div className="grid grid-cols-2 gap-8">
          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Bill To</div>
            <div className="text-sm font-semibold">{inv.clientName || "—"}</div>
            {inv.clientEmail ? <div className="mt-0.5 text-xs text-gray-500">{inv.clientEmail}</div> : null}
          </div>
          <div className="space-y-2 text-sm">
            {inv.title ? (
              <div>
                <span className="text-xs text-gray-400">Subject</span>
                <div className="font-medium">{inv.title}</div>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-400">Issue date</div>
                <div>{inv.issuedAt ? fmt(inv.issuedAt) : "—"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Due date</div>
                <div className={isDue(inv.dueDate, inv.status) ? "font-semibold text-red-600" : ""}>
                  {inv.dueDate ? fmt(inv.dueDate) : "—"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Line items */}
        {inv.lineItems.length > 0 ? (
          <div className="mt-10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-2 text-left text-xs font-semibold uppercase tracking-widest text-gray-400">
                    Description
                  </th>
                  <th className="pb-2 text-right text-xs font-semibold uppercase tracking-widest text-gray-400">Qty</th>
                  <th className="pb-2 text-right text-xs font-semibold uppercase tracking-widest text-gray-400">
                    Unit price
                  </th>
                  <th className="pb-2 text-right text-xs font-semibold uppercase tracking-widest text-gray-400">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {inv.lineItems.map((row, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-3 text-gray-800">{row.description}</td>
                    <td className="py-3 text-right text-gray-600">{row.quantity}</td>
                    <td className="py-3 text-right text-gray-600">
                      {formatCents(row.unitAmountCents, inv.currency)}
                    </td>
                    <td className="py-3 text-right font-medium">
                      {formatCents(Math.round(row.quantity * row.unitAmountCents), inv.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {/* Totals */}
        <div className="mt-6 flex justify-end">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatCents(subtotal, inv.currency)}</span>
            </div>
            {taxRate > 0 ? (
              <div className="flex justify-between text-gray-600">
                <span>Tax ({taxRate}%)</span>
                <span>{formatCents(taxAmount, inv.currency)}</span>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold">
              <span>Total</span>
              <span>{formatCents(inv.amountCents, inv.currency)}</span>
            </div>
            {!isQuote && inv.paidCents > 0 ? (
              <>
                <div className="flex justify-between text-gray-600">
                  <span>Collected</span>
                  <span className="text-emerald-600">{formatCents(inv.paidCents, inv.currency)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Balance due</span>
                  <span className={inv.balanceCents > 0 ? "text-red-600" : "text-emerald-600"}>
                    {formatCents(inv.balanceCents, inv.currency)}
                  </span>
                </div>
              </>
            ) : null}
          </div>
        </div>

        {/* Notes */}
        {inv.notes ? (
          <div className="mt-10 rounded-lg border border-gray-100 bg-gray-50 p-4">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Notes</div>
            <p className="whitespace-pre-wrap text-xs text-gray-600">{inv.notes}</p>
          </div>
        ) : null}

        {/* Footer */}
        <div className="mt-14 border-t border-gray-100 pt-6 text-center text-[10px] text-gray-400">
          Generated by Clars.ai · {inv.number}
        </div>
      </div>

      <style>{`
        @media print {
          @page { margin: 1.5cm; size: A4; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </>
  )
}

// Helpers
function fmt(d: string) {
  return new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })
}

function isDue(date: string, status: string) {
  return status === "OVERDUE" || (!!date && new Date(date) < new Date() && !["PAID", "CANCELLED"].includes(status))
}

function statusBg(s: string) {
  const m: Record<string, string> = {
    PAID: "#d1fae5", PARTIALLY_PAID: "#fef9c3", OVERDUE: "#fee2e2",
    SENT: "#dbeafe", DRAFT: "#f3f4f6", CANCELLED: "#f3f4f6", VIEWED: "#ede9fe",
  }
  return m[s] ?? "#f3f4f6"
}

function statusColor(s: string) {
  const m: Record<string, string> = {
    PAID: "#065f46", PARTIALLY_PAID: "#713f12", OVERDUE: "#991b1b",
    SENT: "#1e40af", DRAFT: "#374151", CANCELLED: "#374151", VIEWED: "#5b21b6",
  }
  return m[s] ?? "#374151"
}

export default function PrintInvoicePage() {
  return (
    <QueryClientProvider client={queryClient}>
      <PrintPage />
    </QueryClientProvider>
  )
}
