import mongoose from "mongoose"
import { NextResponse } from "next/server"
import { getDb } from "@/server/db"
import { Client } from "@/server/models/client"
import { Invoice } from "@/server/models/invoice"
import { Payment } from "@/server/models/payment"
import { Project } from "@/server/models/project"
import {
  UpdateInvoiceSchema,
  cleanOptionalString,
  readJsonBody,
  requireUserId,
  sumLineItemsCents,
  zodErrorResponse,
} from "../../finance/_lib"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Params = { params: { id: string } }

function asOid(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid id")
  return new mongoose.Types.ObjectId(id)
}

async function loadInvoice(userId: string, id: string) {
  const inv = await Invoice.findOne({
    _id: asOid(id),
    userId: new mongoose.Types.ObjectId(userId),
    deletedAt: null,
  }).lean() as Record<string, unknown> | null
  return inv
}

async function serializeInvoiceDetail(userId: string, inv: Record<string, unknown>) {
  const cid = inv.clientId != null ? String(inv.clientId) : ""
  const [client, paidAgg] = await Promise.all([
    cid
      ? Client.findOne({
          _id: new mongoose.Types.ObjectId(cid),
          userId: new mongoose.Types.ObjectId(userId),
        })
          .select("fullName email phone company")
          .lean()
      : null,
    Payment.aggregate<{ t: number }>([
      { $match: { invoiceId: inv._id as mongoose.Types.ObjectId } },
      { $group: { _id: null, t: { $sum: "$amountCents" } } },
    ]),
  ])
  const paidCents = paidAgg[0]?.t ?? 0
  const amount = Number(inv.amountCents) || 0
  return {
    id: String(inv._id),
    userId: String(inv.userId),
    clientId: cid,
    clientName:    (client as { fullName?: string } | null)?.fullName ?? null,
    clientEmail:   (client as { email?: string } | null)?.email ?? null,
    clientPhone:   (client as { phone?: string } | null)?.phone ?? null,
    clientCompany: (client as { company?: string } | null)?.company ?? null,
    projectId: inv.projectId != null ? String(inv.projectId) : null,
    number: inv.number,
    documentType: inv.documentType,
    title: inv.title ?? null,
    status: inv.status,
    amountCents: amount,
    paidCents,
    balanceCents: Math.max(0, amount - paidCents),
    taxRatePercent: inv.taxRatePercent ?? null,
    currency: inv.currency,
    dueDate: inv.dueDate instanceof Date ? (inv.dueDate as Date).toISOString() : inv.dueDate,
    issuedAt: inv.issuedAt instanceof Date ? (inv.issuedAt as Date).toISOString() : inv.issuedAt,
    notes: inv.notes ?? null,
    lineItems: inv.lineItems ?? [],
    createdAt: inv.createdAt instanceof Date ? (inv.createdAt as Date).toISOString() : inv.createdAt,
    updatedAt: inv.updatedAt instanceof Date ? (inv.updatedAt as Date).toISOString() : inv.updatedAt,
  }
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error
    await getDb()
    const inv = await loadInvoice(authRes.userId, params.id)
    if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const data = await serializeInvoiceDetail(authRes.userId, inv)
    return NextResponse.json({ data })
  } catch (error) {
    const z = zodErrorResponse(error)
    if (z) return z
    console.error("[api/invoices/:id GET]", error)
    return NextResponse.json({ error: "Failed to load invoice" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error
    await getDb()
    const input = UpdateInvoiceSchema.parse(await readJsonBody(request))
    const uid = new mongoose.Types.ObjectId(authRes.userId)
    const setPayload: Record<string, unknown> = {}

    if (input.clientId !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(input.clientId)) {
        return NextResponse.json({ error: "Invalid client" }, { status: 400 })
      }
      const ok = await Client.exists({ _id: new mongoose.Types.ObjectId(input.clientId), userId: uid, deletedAt: null })
      if (!ok) return NextResponse.json({ error: "Contact not found" }, { status: 400 })
      setPayload.clientId = new mongoose.Types.ObjectId(input.clientId)
    }
    if (input.projectId !== undefined) {
      if (!input.projectId) {
        setPayload.projectId = undefined
      } else if (mongoose.Types.ObjectId.isValid(input.projectId)) {
        const ok = await Project.exists({ _id: new mongoose.Types.ObjectId(input.projectId), userId: uid, deletedAt: null })
        if (!ok) return NextResponse.json({ error: "Project not found" }, { status: 400 })
        setPayload.projectId = new mongoose.Types.ObjectId(input.projectId)
      }
    }
    if (input.title !== undefined) setPayload.title = cleanOptionalString(input.title)
    if (input.status !== undefined) setPayload.status = input.status
    if (input.documentType !== undefined) setPayload.documentType = input.documentType
    if (input.taxRatePercent !== undefined) setPayload.taxRatePercent = input.taxRatePercent
    if (input.currency !== undefined) setPayload.currency = input.currency
    if (input.dueDate !== undefined) setPayload.dueDate = new Date(input.dueDate)
    if (input.issuedAt !== undefined) setPayload.issuedAt = input.issuedAt ? new Date(input.issuedAt) : new Date()
    if (input.notes !== undefined) setPayload.notes = cleanOptionalString(input.notes)

    if (input.lineItems !== undefined) {
      const lineSum = sumLineItemsCents(input.lineItems)
      setPayload.lineItems = input.lineItems
      if (lineSum > 0) setPayload.amountCents = lineSum
    }
    if (input.amountCents !== undefined && input.lineItems === undefined) {
      setPayload.amountCents = input.amountCents
    }

    const updated = await Invoice.findOneAndUpdate(
      { _id: asOid(params.id), userId: uid, deletedAt: null },
      { $set: setPayload },
      { new: true }
    ).lean() as Record<string, unknown> | null

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const data = await serializeInvoiceDetail(authRes.userId, updated)
    return NextResponse.json({ data })
  } catch (error) {
    const z = zodErrorResponse(error)
    if (z) return z
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    console.error("[api/invoices/:id PUT]", error)
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error
    await getDb()
    const r = await Invoice.updateOne(
      { _id: asOid(params.id), userId: new mongoose.Types.ObjectId(authRes.userId), deletedAt: null },
      { $set: { deletedAt: new Date() } }
    )
    if (!r.matchedCount) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ data: true })
  } catch (error) {
    console.error("[api/invoices/:id DELETE]", error)
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}
