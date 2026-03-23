import mongoose from "mongoose"
import { NextResponse } from "next/server"
import { getDb } from "@/server/db"
import { Client } from "@/server/models/client"
import { Expense } from "@/server/models/expense"
import { Interaction } from "@/server/models/interaction"
import { Invoice } from "@/server/models/invoice"
import { Payment } from "@/server/models/payment"
import { requireUserId } from "@/app/api/clients/_lib"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export type InsightAlert = {
  id: string
  severity: "danger" | "warning" | "info"
  title: string
  body: string
  href: string
}

export type InsightHighlight = {
  id: string
  label: string
  value: string
  hint: string
  href: string
  tone?: "positive" | "neutral" | "negative"
}

export type InsightSuggestion = {
  id: string
  title: string
  body: string
  href: string
}

export async function GET() {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error
    await getDb()
    const uid = new mongoose.Types.ObjectId(authRes.userId)
    const now = new Date()
    const monthStart = startOfMonth(now)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const fourteenDaysAhead = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

    const clientBase = { userId: uid, deletedAt: { $in: [null, undefined] }, isArchived: false }

    const [invoices, expenseAgg, paymentMonth, leadsCount, atRiskCount, interactions30, totalClients, dueSoon] =
      await Promise.all([
        Invoice.find({ userId: uid, deletedAt: null, documentType: "INVOICE" }).lean(),
        Expense.aggregate<{ t: number }>([
          {
            $match: { userId: uid, deletedAt: null, incurredAt: { $gte: monthStart } },
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
        Client.countDocuments({ ...clientBase, status: "LEAD" }),
        Client.countDocuments({ ...clientBase, healthLabel: "AT_RISK" }),
        Interaction.countDocuments({
          userId: uid,
          $or: [{ date: { $gte: thirtyDaysAgo } }, { createdAt: { $gte: thirtyDaysAgo } }],
        }),
        Client.countDocuments(clientBase),
        Invoice.countDocuments({
          userId: uid,
          deletedAt: null,
          documentType: "INVOICE",
          status: { $in: ["SENT", "VIEWED", "PARTIALLY_PAID"] },
          dueDate: { $gte: now, $lte: fourteenDaysAhead },
        }),
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
    let overdueCount = 0
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
      if (due < dueNow && status !== "PAID") {
        overdueCents += bal
        overdueCount += 1
      }
    }

    const revenueMtdCents = paymentMonth[0]?.t ?? 0
    const expensesMtdCents = expenseAgg[0]?.t ?? 0
    const netMtdCents = revenueMtdCents - expensesMtdCents

    const alerts: InsightAlert[] = []

    if (overdueCount > 0) {
      alerts.push({
        id: "overdue-invoices",
        severity: "danger",
        title: `${overdueCount} overdue invoice${overdueCount > 1 ? "s" : ""}`,
        body: `${(overdueCents / 100).toFixed(2)} open balance is past due. Prioritize collection or payment plans.`,
        href: "/dashboard/invoices?status=OVERDUE",
      })
    }

    if (atRiskCount > 0) {
      alerts.push({
        id: "at-risk-contacts",
        severity: "warning",
        title: `${atRiskCount} contact${atRiskCount > 1 ? "s" : ""} marked at risk`,
        body: "Review health scores and schedule touchpoints before churn.",
        href: "/dashboard/clients",
      })
    }

    if (netMtdCents < 0 && revenueMtdCents > 0) {
      alerts.push({
        id: "negative-net",
        severity: "warning",
        title: "Spend exceeded cash-in this month",
        body: "Net cash after expenses is negative. Tighten discretionary costs or accelerate billing.",
        href: "/dashboard/analytics/revenue",
      })
    }

    if (dueSoon > 0 && overdueCount === 0) {
      alerts.push({
        id: "due-soon",
        severity: "info",
        title: `${dueSoon} invoice${dueSoon > 1 ? "s" : ""} due within 14 days`,
        body: "Send reminders early to protect cash flow.",
        href: "/dashboard/invoices",
      })
    }

    const highlights: InsightHighlight[] = [
      {
        id: "mtd-net",
        label: "Net (month to date)",
        value: new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR" }).format(netMtdCents / 100),
        hint: "Collected revenue minus logged expenses",
        href: "/dashboard/finance",
        tone: netMtdCents >= 0 ? "positive" : "negative",
      },
      {
        id: "outstanding",
        label: "Outstanding AR",
        value: new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR" }).format(outstandingCents / 100),
        hint: "Still collectible on open invoices",
        href: "/dashboard/invoices",
        tone: "neutral",
      },
      {
        id: "pipeline-leads",
        label: "Open leads",
        value: String(leadsCount),
        hint: "Contacts in LEAD status",
        href: "/dashboard/clients",
        tone: "neutral",
      },
    ]

    const suggestions: InsightSuggestion[] = []

    if (totalClients > 0 && interactions30 < 3) {
      suggestions.push({
        id: "log-touchpoints",
        title: "Increase logged activity",
        body: "Fewer than 3 interactions in the last 30 days. Log calls and notes from each contact timeline.",
        href: "/dashboard/clients",
      })
    }

    if (leadsCount >= 5) {
      suggestions.push({
        id: "nurture-leads",
        title: "Nurture your lead queue",
        body: "You have several open leads. Qualify or disqualify to keep the pipeline honest.",
        href: "/dashboard/clients",
      })
    }

    if (outstandingCents > 0 && overdueCount === 0) {
      suggestions.push({
        id: "collect-soon",
        title: "Stay ahead of AR",
        body: "Healthy books: no overdue balance. Keep following up before due dates slip.",
        href: "/dashboard/payments",
      })
    }

    return NextResponse.json({
      data: {
        generatedAt: now.toISOString(),
        alerts,
        highlights,
        suggestions,
        meta: {
          interactionsLast30Days: interactions30,
          totalContacts: totalClients,
        },
      },
    })
  } catch (error) {
    console.error("[api/dashboard/insights GET]", error)
    return NextResponse.json({ error: "Failed to load insights" }, { status: 500 })
  }
}
