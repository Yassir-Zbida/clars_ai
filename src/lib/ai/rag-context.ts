/**
 * RAG context builder — compact pipe-delimited format.
 *
 * Format rationale: markdown prose costs ~30 tokens/record; the compact
 * pipe-delimited rows below cost ~12 tokens/record — roughly 55% fewer input
 * tokens while remaining fully parseable by the model.
 *
 * Schema per section:
 *   FIN   rev_mtd|exp_mtd|net|ar|ovd(n)          — all € cents ÷ 100
 *   CLI   name|company|status|email|health|rev|ovd|followup
 *   PRJ   name|status|priority|progress%|budget|deadline
 *   INV   number|client|amount|status|due|balance
 */

import mongoose from "mongoose"
import { getDb } from "@/server/db"
import { Client } from "@/server/models/client"
import { Invoice } from "@/server/models/invoice"
import { Payment } from "@/server/models/payment"
import { Project } from "@/server/models/project"
import { Expense } from "@/server/models/expense"

// Only show 2 decimal places, drop trailing .00 for readability
function eur(cents: number): string {
  const val = cents / 100
  return val % 1 === 0 ? `€${val}` : `€${val.toFixed(2)}`
}

function d(date?: Date | null): string {
  return date ? new Date(date).toISOString().slice(0, 10) : ""
}

// Omit empty/zero fields — every omitted field saves tokens
function row(...fields: (string | number | undefined | null)[]): string {
  // Trim trailing empty fields, keep internal ones for positional schema
  const strs = fields.map((f) => (f == null || f === "" || f === 0 ? "" : String(f)))
  while (strs.length && strs[strs.length - 1] === "") strs.pop()
  return strs.join("|")
}

export async function buildRagContext(userId: string): Promise<string> {
  try {
    await getDb()
    const uid = new mongoose.Types.ObjectId(userId)
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // ── Parallel DB fetch ─────────────────────────────────────────────────────
    const [clients, projects, invoices, payMtd, expMtd] = await Promise.all([
      Client.find({ userId: uid, deletedAt: { $in: [null, undefined] }, isArchived: false })
        .sort({ updatedAt: -1 }).limit(25)
        .select("fullName email company status healthLabel totalRevenue totalOverdue nextFollowUpAt")
        .lean(),

      Project.find({ userId: uid, deletedAt: { $in: [null, undefined] } })
        .sort({ updatedAt: -1 }).limit(15)
        .select("name status priority progress budgetCents endDate")
        .lean(),

      Invoice.find({ userId: uid, deletedAt: null, documentType: "INVOICE" })
        .sort({ issuedAt: -1 }).limit(15)
        .select("number status amountCents currency dueDate clientId title")
        .populate("clientId", "fullName")
        .lean(),

      Payment.aggregate<{ t: number }>([
        { $lookup: { from: "invoices", localField: "invoiceId", foreignField: "_id", as: "inv" } },
        { $unwind: "$inv" },
        { $match: { "inv.userId": uid, "inv.deletedAt": null, "inv.documentType": "INVOICE", paidAt: { $gte: monthStart } } },
        { $group: { _id: null, t: { $sum: "$amountCents" } } },
      ]),

      Expense.aggregate<{ t: number }>([
        { $match: { userId: uid, deletedAt: null, incurredAt: { $gte: monthStart } } },
        { $group: { _id: null, t: { $sum: "$amountCents" } } },
      ]),
    ])

    // ── Balance per invoice ───────────────────────────────────────────────────
    const invIds = invoices.map((i) => i._id as mongoose.Types.ObjectId)
    const paidRows = invIds.length
      ? await Payment.aggregate<{ _id: mongoose.Types.ObjectId; t: number }>([
          { $match: { invoiceId: { $in: invIds } } },
          { $group: { _id: "$invoiceId", t: { $sum: "$amountCents" } } },
        ])
      : []
    const paidMap = new Map(paidRows.map((x) => [String(x._id), x.t]))

    // ── Finance totals ────────────────────────────────────────────────────────
    let arCents = 0
    let ovdCents = 0
    let ovdCount = 0
    for (const inv of invoices) {
      const doc = inv as unknown as { _id: mongoose.Types.ObjectId; status?: string; amountCents?: number; dueDate?: Date }
      if (!doc.status || ["CANCELLED", "DRAFT", "PAID"].includes(doc.status)) continue
      const bal = Math.max(0, (doc.amountCents ?? 0) - (paidMap.get(String(doc._id)) ?? 0))
      if (!bal) continue
      arCents += bal
      if (doc.dueDate && new Date(doc.dueDate) < now) { ovdCents += bal; ovdCount++ }
    }

    const revMtd = payMtd[0]?.t ?? 0
    const expMtdVal = expMtd[0]?.t ?? 0

    // ── Build compact output ──────────────────────────────────────────────────
    const out: string[] = [`[CRM:${d(now)}]`]

    // Finance — single line
    out.push(`FIN|${row(`rev=${eur(revMtd)}`, `exp=${eur(expMtdVal)}`, `net=${eur(revMtd - expMtdVal)}`, `ar=${eur(arCents)}`, ovdCents ? `ovd=${eur(ovdCents)}(${ovdCount})` : "")}`)

    // Clients
    out.push(`CLI(${clients.length})`)
    for (const c of clients) {
      const cl = c as unknown as { fullName: string; email?: string; company?: string; status?: string; healthLabel?: string; totalRevenue?: number; totalOverdue?: number; nextFollowUpAt?: Date }
      out.push(row(
        cl.fullName,
        cl.company,
        cl.status,
        cl.email,
        cl.healthLabel,
        cl.totalRevenue ? eur(cl.totalRevenue) : "",
        cl.totalOverdue ? `OVD:${eur(cl.totalOverdue)}` : "",
        cl.nextFollowUpAt ? `fu:${d(cl.nextFollowUpAt)}` : "",
      ))
    }

    // Projects
    out.push(`PRJ(${projects.length})`)
    for (const p of projects) {
      const pr = p as unknown as { name: string; status?: string; priority?: string; progress?: number; budgetCents?: number; endDate?: Date }
      out.push(row(
        pr.name,
        pr.status,
        pr.priority,
        pr.progress != null ? `${pr.progress}%` : "",
        pr.budgetCents ? eur(pr.budgetCents) : "",
        pr.endDate ? d(pr.endDate) : "",
      ))
    }

    // Invoices
    out.push(`INV(${invoices.length})`)
    for (const inv of invoices) {
      const i = inv as unknown as { _id: mongoose.Types.ObjectId; number: string; status?: string; amountCents?: number; currency?: string; dueDate?: Date; clientId?: { fullName?: string } | null; title?: string }
      const bal = Math.max(0, (i.amountCents ?? 0) - (paidMap.get(String(i._id)) ?? 0))
      out.push(row(
        i.number,
        i.clientId?.fullName ?? "?",
        eur(i.amountCents ?? 0),
        i.status,
        i.dueDate ? d(i.dueDate) : "",
        bal && i.status !== "PAID" ? `bal:${eur(bal)}` : "",
        i.title ?? "",
      ))
    }

    out.push("[/CRM]")
    return out.join("\n")
  } catch (err) {
    console.error("[rag-context]", err)
    return "[CRM:unavailable]"
  }
}
