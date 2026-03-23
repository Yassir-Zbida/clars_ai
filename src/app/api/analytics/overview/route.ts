import mongoose from "mongoose"
import { NextResponse } from "next/server"
import { getDb } from "@/server/db"
import { Client } from "@/server/models/client"
import { Expense } from "@/server/models/expense"
import { Interaction } from "@/server/models/interaction"
import { Invoice } from "@/server/models/invoice"
import { Payment } from "@/server/models/payment"
import { Project } from "@/server/models/project"
import { requireUserId } from "@/app/api/clients/_lib"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function monthKey(y: number, m: number) {
  return `${y}-${String(m).padStart(2, "0")}`
}

/** Last `months` calendar months including current, oldest first (for charts). */
function rollingMonthKeys(months: number) {
  const out: string[] = []
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push(monthKey(d.getFullYear(), d.getMonth() + 1))
  }
  return out
}

export async function GET() {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error
    await getDb()
    const uid = new mongoose.Types.ObjectId(authRes.userId)
    const now = new Date()
    const monthStart = startOfMonth(now)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const clientBase = {
      userId: uid,
      deletedAt: { $in: [null, undefined] },
      isArchived: false,
    }

    const [
      invoices,
      expenseAgg,
      paymentMonth,
      invoiceCounts,
      revenueByMonthAgg,
      clientsByStatus,
      projectsByStatus,
      interactions30,
      expenseByMonthAgg,
    ] = await Promise.all([
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
      Payment.aggregate<{ _id: { y: number; m: number }; t: number }>([
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
            paidAt: { $gte: sixMonthsAgo },
          },
        },
        {
          $group: {
            _id: { y: { $year: "$paidAt" }, m: { $month: "$paidAt" } },
            t: { $sum: "$amountCents" },
          },
        },
      ]),
      Client.aggregate<{ _id: string; c: number }>([
        { $match: clientBase },
        { $group: { _id: "$status", c: { $sum: 1 } } },
      ]),
      Project.aggregate<{ _id: string; c: number }>([
        { $match: { userId: uid, deletedAt: { $in: [null, undefined] } } },
        { $group: { _id: "$status", c: { $sum: 1 } } },
      ]),
      Interaction.countDocuments({
        userId: uid,
        $or: [{ date: { $gte: thirtyDaysAgo } }, { createdAt: { $gte: thirtyDaysAgo } }],
      }),
      Expense.aggregate<{ _id: { y: number; m: number }; t: number }>([
        {
          $match: {
            userId: uid,
            deletedAt: null,
            incurredAt: { $gte: sixMonthsAgo },
          },
        },
        {
          $group: {
            _id: { y: { $year: "$incurredAt" }, m: { $month: "$incurredAt" } },
            t: { $sum: "$amountCents" },
          },
        },
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

    const revMap = new Map<string, number>()
    for (const row of revenueByMonthAgg) {
      revMap.set(monthKey(row._id.y, row._id.m), row.t)
    }
    const expMap = new Map<string, number>()
    for (const row of expenseByMonthAgg) {
      expMap.set(monthKey(row._id.y, row._id.m), row.t)
    }

    const monthKeys = rollingMonthKeys(6)
    const revenueExpenseSeries = monthKeys.map((key) => ({
      month: key,
      revenueCents: revMap.get(key) ?? 0,
      expensesCents: expMap.get(key) ?? 0,
    }))

    const clientsByStatusObj: Record<string, number> = {}
    for (const row of clientsByStatus) {
      clientsByStatusObj[row._id] = row.c
    }

    const projectsByStatusObj: Record<string, number> = {}
    for (const row of projectsByStatus) {
      projectsByStatusObj[row._id] = row.c
    }

    const totalClients = Object.values(clientsByStatusObj).reduce((a, b) => a + b, 0)
    const activeOrQualified =
      (clientsByStatusObj.ACTIVE ?? 0) +
      (clientsByStatusObj.QUALIFIED ?? 0) +
      (clientsByStatusObj.PROPOSAL ?? 0)

    const last3 = revenueExpenseSeries.slice(-3)
    const avgRev =
      last3.length > 0 ? last3.reduce((s, x) => s + x.revenueCents, 0) / last3.length : 0
    const forecastNextMonthCents = Math.round(avgRev)

    return NextResponse.json({
      data: {
        finance: {
          outstandingCents,
          overdueCents,
          revenueMtdCents,
          expensesMtdCents,
          netMtdCents: revenueMtdCents - expensesMtdCents,
          invoiceCount: invoices.length,
          statusBreakdown,
        },
        revenueExpenseSeries,
        clientsByStatus: clientsByStatusObj,
        projectsByStatus: projectsByStatusObj,
        productivity: {
          interactionsLast30Days: interactions30,
          totalClients,
          pipelineContacts: activeOrQualified,
        },
        forecast: {
          nextMonthRevenueCents: forecastNextMonthCents,
          basedOnMonths: last3.length,
        },
      },
    })
  } catch (error) {
    console.error("[api/analytics/overview GET]", error)
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 })
  }
}
