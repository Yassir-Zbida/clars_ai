"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const invoiceTone: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SENT: "bg-blue-500/15 text-blue-400",
  VIEWED: "bg-sky-500/15 text-sky-400",
  PARTIALLY_PAID: "bg-amber-500/15 text-amber-400",
  PAID: "bg-emerald-500/15 text-emerald-400",
  OVERDUE: "bg-red-500/15 text-red-400",
  CANCELLED: "bg-muted text-muted-foreground line-through",
}

const expenseTone: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-400",
  APPROVED: "bg-blue-500/15 text-blue-400",
  REJECTED: "bg-red-500/15 text-red-400",
  PAID: "bg-emerald-500/15 text-emerald-400",
}

export function InvoiceStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="secondary" className={cn("text-[10px] font-medium", invoiceTone[status] ?? "bg-muted")}>
      {status.replace(/_/g, " ")}
    </Badge>
  )
}

export function ExpenseStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="secondary" className={cn("text-[10px] font-medium", expenseTone[status] ?? "bg-muted")}>
      {status}
    </Badge>
  )
}

export function DocumentTypeBadge({ type }: { type: string }) {
  const isQuote = type === "QUOTE"
  return (
    <Badge
      variant="outline"
      className={cn("text-[10px]", isQuote ? "border-violet-500/40 text-violet-400" : "border-emerald-500/40 text-emerald-400")}
    >
      {isQuote ? "Quote" : "Invoice"}
    </Badge>
  )
}
