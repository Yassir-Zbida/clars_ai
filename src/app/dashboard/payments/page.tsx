"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCents } from "@/lib/money"

type PaymentRow = {
  id: string
  invoiceId: string
  invoiceNumber: string | null
  clientId: string | null
  amountCents: number
  method: string | null
  reference: string | null
  paidAt: string
}

type ContactOption = { id: string; fullName?: string; name?: string }

export default function PaymentsPage() {
  const { data: payments, isLoading, isError } = useQuery({
    queryKey: ["payments", "list"],
    queryFn: async () => {
      const res = await fetch("/api/payments?limit=80", { credentials: "include" })
      if (!res.ok) throw new Error("payments")
      const json = (await res.json()) as { data: PaymentRow[] }
      return json.data
    },
  })

  const { data: contacts } = useQuery({
    queryKey: ["clients", "picker"],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: "1",
        limit: "300",
        sortBy: "fullName",
        sortDir: "asc",
      })
      const res = await fetch(`/api/clients?${params}`, { credentials: "include" })
      if (!res.ok) throw new Error("clients")
      const json = (await res.json()) as { data: ContactOption[] }
      return json.data
    },
  })

  const nameByClientId = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of contacts ?? []) {
      m.set(c.id, c.fullName || c.name || c.id)
    }
    return m
  }, [contacts])

  const rows = payments ?? []

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-2 pt-0 lg:px-6 lg:pt-0">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Payments</h1>
          <p className="text-xs text-muted-foreground">Cash applied to invoices, newest first.</p>
        </div>
        <Link href="/dashboard/invoices" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs")}>
          Go to invoices
        </Link>
      </div>

      <Card className="rounded-xl border border-input">
        <CardContent className="p-4">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading payments…
            </div>
          ) : isError ? (
            <p className="text-sm text-muted-foreground">Could not load payments.</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-input">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-input">
                    <TableHead>Received</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} className="border-input hover:bg-muted/25">
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(row.paidAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{row.invoiceNumber || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.clientId ? nameByClientId.get(row.clientId) ?? "—" : "—"}
                      </TableCell>
                      <TableCell className="text-xs">{row.method || "—"}</TableCell>
                      <TableCell className="max-w-[140px] truncate text-xs">{row.reference || "—"}</TableCell>
                      <TableCell className="text-right text-sm font-semibold text-emerald-400">
                        {formatCents(row.amountCents)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/dashboard/invoices/${row.invoiceId}`}
                          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-7 text-xs")}
                        >
                          Invoice
                        </Link>
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
  )
}
