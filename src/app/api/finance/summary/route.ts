import mongoose from "mongoose"
import { NextResponse } from "next/server"
import { getDb } from "@/server/db"
import { Expense } from "@/server/models/expense"
import { Invoice } from "@/server/models/invoice"
import { Payment } from "@/server/models/payment"
import { requireUserId } from "../_lib"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export async function GET() {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error
    await getDb()
    const uid = new mongoose.Types.ObjectId(authRes.userId)
    const now = new Date()
    const monthStart = startOfMonth(now)

    const [invoices, expenseAgg, paymentMonth, invoiceCounts] = await Promise.all([
      Invoice.find({ userId: uid, deletedAt: null, documentType: "INVOICE" }).lean(),
      Expense.aggregate<{ t: number }>([
        {
          $match: {
            userId: uid,
            deletedAt: null,
            incurredAt: { $gte: monthStart },
          },
        },
        { $group: { _id: null, t: { $sum: "$amountCents" } } },
      ]),
      Payment.aggregate<{ t: number }>([
        {
          $lookup: {
            from: "invoices",
            localField: "invoiceId",
            foreignField: "_id",
            as: "inv",
          },
        },
        { $unwind: "$inv" },
        {
          $match: {
            "inv.userId": uid,
            "inv.deletedAt": null,
            "inv.documentType": "INVOICE",
            paidAt: { $gte: monthStart },
          },
        },
        { $group: { _id: null, t: { $sum: "$amountCents" } } },
      ]),
      Invoice.aggregate<{ _id: string; c: number }>([
        { $match: { userId: uid, deletedAt: null, documentType: "INVOICE" } },
        { $group: { _id: "$status", c: { $sum: 1 } } },
      ]),
    ])

    const invIds = invoices.map((i) => i._id as mongoose.Types.ObjectId)
    const paidByInvoice =
      invIds.length > 0
        ? await Payment.aggregate<{ _id: mongoose.Types.ObjectId; t: number }>([
            { $match: { invoiceId: { $in: invIds } } },
            { $group: { _id: "$invoiceId", t: { $sum: "$amountCents" } } },
          ])
        : []
    const paidMap = new Map(paidByInvoice.map((x) => [String(x._id), x.t]))

    let outstandingCents = 0
    let overdueCents = 0
    const dueNow = now.getTime()

    for (const inv of invoices) {
      const doc = inv as unknown as {
        _id: mongoose.Types.ObjectId
        status?: string
        amountCents?: number
        dueDate?: Date
      }
      const status = doc.status ?? ""
      if (status === "CANCELLED" || status === "DRAFT") continue
      const amount = Number(doc.amountCents) || 0
      const paid = paidMap.get(String(doc._id)) ?? 0
      const bal = Math.max(0, amount - paid)
      if (bal <= 0) continue
      outstandingCents += bal
      const due = doc.dueDate ? new Date(doc.dueDate).getTime() : 0
      if (due < dueNow && status !== "PAID") overdueCents += bal
    }

    const expensesMtdCents = expenseAgg[0]?.t ?? 0
    const revenueMtdCents = paymentMonth[0]?.t ?? 0

    const statusBreakdown: Record<string, number> = {}
    for (const row of invoiceCounts) {
      statusBreakdown[row._id] = row.c
    }

    return NextResponse.json({
      data: {
        outstandingCents,
        overdueCents,
        revenueMtdCents,
        expensesMtdCents,
        netMtdCents: revenueMtdCents - expensesMtdCents,
        invoiceCount: invoices.length,
        statusBreakdown,
      },
    })
  } catch (error) {
    console.error("[api/finance/summary GET]", error)
    return NextResponse.json({ error: "Failed to load summary" }, { status: 500 })
  }
}
