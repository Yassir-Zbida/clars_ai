import { z } from "zod"
import mongoose from "mongoose"
import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { Invoice } from "@/server/models/invoice"

export const invoiceStatusValues = [
  "DRAFT",
  "SENT",
  "VIEWED",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "CANCELLED",
] as const

export const documentTypeValues = ["INVOICE", "QUOTE"] as const

export const expenseCategoryValues = [
  "SOFTWARE",
  "TRAVEL",
  "MEALS",
  "OFFICE",
  "MARKETING",
  "PROFESSIONAL",
  "OTHER",
] as const

export const expenseStatusValues = ["PENDING", "APPROVED", "REJECTED", "PAID"] as const

const lineItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().positive().default(1),
  unitAmountCents: z.number().int(),
})

export const CreateInvoiceSchema = z.object({
  clientId: z.string().refine((v) => mongoose.Types.ObjectId.isValid(v), "Invalid client"),
  projectId: z.string().refine((v) => !v || mongoose.Types.ObjectId.isValid(v), "Invalid project").optional(),
  documentType: z.enum(documentTypeValues).default("INVOICE"),
  title: z.string().max(200).optional(),
  status: z.enum(invoiceStatusValues).default("DRAFT"),
  amountCents: z.number().int().positive().optional(),
  taxRatePercent: z.number().min(0).max(100).optional(),
  currency: z.string().min(1).max(8).default("EUR"),
  dueDate: z.string(),
  issuedAt: z.string().optional(),
  notes: z.string().max(8000).optional(),
  lineItems: z.array(lineItemSchema).optional().default([]),
})

export const UpdateInvoiceSchema = CreateInvoiceSchema.partial().extend({
  status: z.enum(invoiceStatusValues).optional(),
})

export const CreatePaymentSchema = z.object({
  amountCents: z.number().int().positive(),
  method: z.string().max(80).optional(),
  reference: z.string().max(200).optional(),
  paidAt: z.string().optional(),
})

export const CreateExpenseSchema = z.object({
  vendor: z.string().max(200).optional(),
  category: z.enum(expenseCategoryValues).default("OTHER"),
  status: z.enum(expenseStatusValues).default("PENDING"),
  amountCents: z.number().int().positive(),
  currency: z.string().min(1).max(8).default("EUR"),
  incurredAt: z.string().optional(),
  notes: z.string().max(8000).optional(),
  receiptUrl: z.string().url().optional().or(z.literal("")),
  projectId: z.string().optional(),
  clientId: z.string().optional(),
})

export const UpdateExpenseSchema = CreateExpenseSchema.partial()

export function cleanOptionalString(value: string | undefined): string | undefined {
  if (value == null) return undefined
  const t = value.trim()
  return t.length ? t : undefined
}

export async function requireUserId() {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  return { userId }
}

export function zodErrorResponse(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: "Validation failed", issues: error.flatten() }, { status: 400 })
  }
  return null
}

export async function readJsonBody(request: Request): Promise<unknown> {
  const text = await request.text()
  if (!text.trim()) return {}
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new SyntaxError("Invalid JSON body")
  }
}

export function sumLineItemsCents(items: z.infer<typeof lineItemSchema>[]): number {
  return items.reduce((acc, row) => acc + Math.round(row.quantity * row.unitAmountCents), 0)
}

export async function nextDocumentNumber(userId: string, documentType: (typeof documentTypeValues)[number]) {
  const oid  = new mongoose.Types.ObjectId(userId)
  const year = new Date().getFullYear()
  const prefix = documentType === "QUOTE" ? "QUO" : "INV"

  // Count ALL docs (including soft-deleted) so the unique { userId, number }
  // index is never re-used after an archive/delete.
  const count = await Invoice.countDocuments({ userId: oid, documentType })
  return `${prefix}-${year}-${String(count + 1).padStart(3, "0")}`
}
