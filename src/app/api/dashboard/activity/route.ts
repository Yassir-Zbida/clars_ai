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

export type ActivityKind = "interaction" | "payment" | "contact" | "project" | "invoice" | "expense"

export type ActivityItem = {
  id: string
  kind: ActivityKind
  title: string
  subtitle: string | null
  at: string
  href: string
}

function ts(d: unknown): number {
  if (d instanceof Date) return d.getTime()
  if (typeof d === "string" || typeof d === "number") return new Date(d).getTime()
  return 0
}

export async function GET(request: Request) {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error
    await getDb()
    const uid = new mongoose.Types.ObjectId(authRes.userId)
    const { searchParams } = new URL(request.url)
    const limit = Math.min(80, Math.max(1, Number(searchParams.get("limit")) || 50))

    const clientMatch = { userId: uid, deletedAt: { $in: [null, undefined] }, isArchived: false }

    const [interactions, clientsNew, projectsUp, invoicesRecent, expensesRecent, userInvoices] = await Promise.all([
      Interaction.find({ userId: uid }).sort({ date: -1, createdAt: -1 }).limit(30).lean(),
      Client.find(clientMatch).sort({ createdAt: -1 }).limit(20).select("fullName company createdAt").lean(),
      Project.find({ userId: uid, deletedAt: { $in: [null, undefined] } })
        .sort({ updatedAt: -1 })
        .limit(20)
        .select("name status updatedAt createdAt")
        .lean(),
      Invoice.find({ userId: uid, deletedAt: null })
        .sort({ createdAt: -1 })
        .limit(20)
        .select("number documentType status amountCents clientId createdAt")
        .lean(),
      Expense.find({ userId: uid, deletedAt: null })
        .sort({ createdAt: -1 })
        .limit(15)
        .select("vendor category amountCents createdAt")
        .lean(),
      Invoice.find({ userId: uid, deletedAt: null }).distinct("_id") as Promise<mongoose.Types.ObjectId[]>,
    ])

    const interactionClientIds = Array.from(
      new Set(
        interactions
          .map((i) => (i as { clientId?: mongoose.Types.ObjectId }).clientId)
          .filter(Boolean)
          .map((id) => String(id))
      )
    )
    const iclient =
      interactionClientIds.length > 0
        ? await Client.find({
            _id: { $in: interactionClientIds.map((id) => new mongoose.Types.ObjectId(id)) },
            userId: uid,
          })
            .select("fullName")
            .lean()
        : []
    const interactionNames = new Map(iclient.map((c) => [String(c._id), (c as { fullName?: string }).fullName || "Contact"]))

    const items: ActivityItem[] = []

    for (const row of interactions) {
      const r = row as {
        _id: mongoose.Types.ObjectId
        clientId?: mongoose.Types.ObjectId
        type?: string
        title?: string
        date?: Date
        createdAt?: Date
      }
      const at = r.date ?? r.createdAt ?? new Date()
      const cid = r.clientId ? String(r.clientId) : ""
      items.push({
        id: `int-${String(r._id)}`,
        kind: "interaction",
        title: r.title || "Activity",
        subtitle: `${r.type ?? "NOTE"} · ${interactionNames.get(cid) ?? "Contact"}`,
        at: at instanceof Date ? at.toISOString() : new Date(at).toISOString(),
        href: cid ? `/dashboard/clients/${cid}` : "/dashboard/clients",
      })
    }

    const invIds = userInvoices
    let paymentsRecent: Record<string, unknown>[] = []
    if (invIds.length > 0) {
      paymentsRecent = await Payment.find({ invoiceId: { $in: invIds } })
        .sort({ paidAt: -1 })
        .limit(25)
        .lean()
    }
    const payInvoiceIds = Array.from(
      new Set(paymentsRecent.map((p) => String((p as { invoiceId?: mongoose.Types.ObjectId }).invoiceId)).filter(Boolean))
    )
    const payInvoices =
      payInvoiceIds.length > 0
        ? await Invoice.find({
            _id: { $in: payInvoiceIds.map((id) => new mongoose.Types.ObjectId(id)) },
            userId: uid,
          })
            .select("number")
            .lean()
        : []
    const invNum = new Map(payInvoices.map((i) => [String(i._id), (i as { number?: string }).number || ""]))

    for (const row of paymentsRecent) {
      const p = row as {
        _id: mongoose.Types.ObjectId
        invoiceId?: mongoose.Types.ObjectId
        amountCents?: number
        paidAt?: Date
        method?: string
      }
      const at = p.paidAt ?? new Date()
      const iid = p.invoiceId ? String(p.invoiceId) : ""
      const invNo = invNum.get(iid)
      items.push({
        id: `pay-${String(p._id)}`,
        kind: "payment",
        title: invNo ? `Payment · ${invNo}` : "Payment received",
        subtitle: p.method ? `${p.method} · ${((p.amountCents ?? 0) / 100).toFixed(2)}` : `${((p.amountCents ?? 0) / 100).toFixed(2)}`,
        at: at instanceof Date ? at.toISOString() : new Date(at).toISOString(),
        href: iid ? `/dashboard/invoices/${iid}` : "/dashboard/payments",
      })
    }

    for (const row of clientsNew) {
      const c = row as { _id: mongoose.Types.ObjectId; fullName?: string; company?: string; createdAt?: Date }
      items.push({
        id: `cli-${String(c._id)}`,
        kind: "contact",
        title: `New contact · ${c.fullName || "Unnamed"}`,
        subtitle: c.company || null,
        at: (c.createdAt instanceof Date ? c.createdAt : new Date()).toISOString(),
        href: `/dashboard/clients/${String(c._id)}`,
      })
    }

    for (const row of projectsUp) {
      const p = row as { _id: mongoose.Types.ObjectId; name?: string; status?: string; updatedAt?: Date }
      items.push({
        id: `prj-${String(p._id)}`,
        kind: "project",
        title: `Project · ${p.name || "Untitled"}`,
        subtitle: p.status ? `Updated · ${p.status.replace(/_/g, " ")}` : "Updated",
        at: (p.updatedAt instanceof Date ? p.updatedAt : new Date()).toISOString(),
        href: `/dashboard/projects/${String(p._id)}`,
      })
    }

    for (const row of invoicesRecent) {
      const inv = row as {
        _id: mongoose.Types.ObjectId
        number?: string
        documentType?: string
        status?: string
        amountCents?: number
        clientId?: mongoose.Types.ObjectId
        createdAt?: Date
      }
      const docLabel = inv.documentType === "QUOTE" ? "Quote" : "Invoice"
      items.push({
        id: `inv-${String(inv._id)}`,
        kind: "invoice",
        title: `${docLabel} ${inv.number || ""}`.trim(),
        subtitle: inv.status ? `${inv.status.replace(/_/g, " ")}` : null,
        at: (inv.createdAt instanceof Date ? inv.createdAt : new Date()).toISOString(),
        href: `/dashboard/invoices/${String(inv._id)}`,
      })
    }

    for (const row of expensesRecent) {
      const e = row as {
        _id: mongoose.Types.ObjectId
        vendor?: string
        category?: string
        amountCents?: number
        createdAt?: Date
      }
      items.push({
        id: `exp-${String(e._id)}`,
        kind: "expense",
        title: `Expense · ${e.vendor || e.category || "Recorded"}`,
        subtitle: e.category || null,
        at: (e.createdAt instanceof Date ? e.createdAt : new Date()).toISOString(),
        href: "/dashboard/expenses",
      })
    }

    items.sort((a, b) => ts(b.at) - ts(a.at))

    return NextResponse.json({ data: items.slice(0, limit) })
  } catch (error) {
    console.error("[api/dashboard/activity GET]", error)
    return NextResponse.json({ error: "Failed to load activity" }, { status: 500 })
  }
}
