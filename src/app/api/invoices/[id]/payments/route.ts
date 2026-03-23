import mongoose from "mongoose"
import { NextResponse } from "next/server"
import { getDb } from "@/server/db"
import { Invoice } from "@/server/models/invoice"
import { Payment } from "@/server/models/payment"
import { CreatePaymentSchema, readJsonBody, requireUserId, zodErrorResponse } from "../../../finance/_lib"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Params = { params: { id: string } }

function nextInvoiceStatus(amountCents: number, paidTotal: number, previous: string): string {
  if (previous === "CANCELLED") return previous
  if (paidTotal >= amountCents) return "PAID"
  if (paidTotal > 0) return "PARTIALLY_PAID"
  return previous === "PARTIALLY_PAID" || previous === "PAID" ? "SENT" : previous
}

export async function POST(request: Request, { params }: Params) {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error
    await getDb()
    const uid = new mongoose.Types.ObjectId(authRes.userId)
    const invoiceId = new mongoose.Types.ObjectId(params.id)

    const inv = await Invoice.findOne({ _id: invoiceId, userId: uid, deletedAt: null }).lean() as {
      _id: mongoose.Types.ObjectId
      amountCents: number
      status: string
    } | null
    if (!inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    if (inv.status === "CANCELLED") {
      return NextResponse.json({ error: "Cannot record payment on cancelled document" }, { status: 400 })
    }

    const body = CreatePaymentSchema.parse(await readJsonBody(request))
    const pay = await Payment.create({
      invoiceId,
      amountCents: body.amountCents,
      method: body.method?.trim() || undefined,
      reference: body.reference?.trim() || undefined,
      paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
    })

    const agg = await Payment.aggregate<{ t: number }>([
      { $match: { invoiceId } },
      { $group: { _id: null, t: { $sum: "$amountCents" } } },
    ])
    const paidTotal = agg[0]?.t ?? 0
    const newStatus = nextInvoiceStatus(inv.amountCents, paidTotal, inv.status)

    await Invoice.updateOne({ _id: invoiceId }, { $set: { status: newStatus } })

    return NextResponse.json(
      {
        data: {
          payment: pay.toJSON(),
          invoiceStatus: newStatus,
          paidCents: paidTotal,
          balanceCents: Math.max(0, inv.amountCents - paidTotal),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    const z = zodErrorResponse(error)
    if (z) return z
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    console.error("[api/invoices/:id/payments POST]", error)
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 })
  }
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error
    await getDb()
    const uid = new mongoose.Types.ObjectId(authRes.userId)
    const invoiceId = new mongoose.Types.ObjectId(params.id)

    const inv = await Invoice.exists({ _id: invoiceId, userId: uid, deletedAt: null })
    if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const rows = await Payment.find({ invoiceId }).sort({ paidAt: -1 }).lean()
    const data = rows.map((p) => ({
      id: String(p._id),
      invoiceId: String(p.invoiceId),
      amountCents: p.amountCents,
      method: p.method ?? null,
      reference: p.reference ?? null,
      paidAt: p.paidAt instanceof Date ? p.paidAt.toISOString() : p.paidAt,
      createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
    }))
    return NextResponse.json({ data })
  } catch (error) {
    console.error("[api/invoices/:id/payments GET]", error)
    return NextResponse.json({ error: "Failed to list payments" }, { status: 500 })
  }
}
