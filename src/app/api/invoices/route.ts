import mongoose from "mongoose"
import { NextResponse } from "next/server"
import { getDb } from "@/server/db"
import { Client } from "@/server/models/client"
import { Invoice } from "@/server/models/invoice"
import { Project } from "@/server/models/project"
import {
  CreateInvoiceSchema,
  cleanOptionalString,
  documentTypeValues,
  invoiceStatusValues,
  nextDocumentNumber,
  readJsonBody,
  requireUserId,
  sumLineItemsCents,
  zodErrorResponse,
} from "../finance/_lib"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function asUserOid(userId: string) {
  return new mongoose.Types.ObjectId(userId)
}

export async function GET(request: Request) {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error
    const { userId } = authRes
    await getDb()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")?.trim()
    const status = searchParams.get("status")?.toUpperCase()
    const docType = searchParams.get("documentType")?.toUpperCase()
    const clientId = searchParams.get("clientId")?.trim()
    const page = Math.max(1, Number(searchParams.get("page")) || 1)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 25))
    const sortBy = searchParams.get("sortBy") ?? "issuedAt"
    const sortDir = searchParams.get("sortDir") === "asc" ? 1 : -1

    const clauses: Record<string, unknown>[] = [{ userId: asUserOid(userId) }, { deletedAt: null }]

    if (status && invoiceStatusValues.includes(status as (typeof invoiceStatusValues)[number])) {
      clauses.push({ status })
    }
    if (docType && documentTypeValues.includes(docType as (typeof documentTypeValues)[number])) {
      clauses.push({ documentType: docType })
    }
    if (clientId && mongoose.Types.ObjectId.isValid(clientId)) {
      clauses.push({ clientId: new mongoose.Types.ObjectId(clientId) })
    }

    const mongoQuery = clauses.length === 2 ? { ...clauses[0], ...clauses[1] } : { $and: clauses }

    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
      ;(mongoQuery as Record<string, unknown>).$or = [{ number: rx }, { title: rx }, { notes: rx }]
    }

    const sortable = new Set(["issuedAt", "dueDate", "amountCents", "createdAt", "number", "status"])
    const sort: Record<string, 1 | -1> = {}
    if (sortable.has(sortBy)) sort[sortBy] = sortDir
    else sort.issuedAt = -1
    sort._id = -1

    const skip = (page - 1) * limit
    const [total, rows] = await Promise.all([
      Invoice.countDocuments(mongoQuery),
      Invoice.find(mongoQuery).sort(sort).skip(skip).limit(limit).lean(),
    ])

    const clientIds = Array.from(
      new Set(rows.map((r) => String((r as { clientId?: mongoose.Types.ObjectId }).clientId)).filter(Boolean))
    )
    const clients =
      clientIds.length > 0
        ? await Client.find({
            _id: { $in: clientIds.map((id) => new mongoose.Types.ObjectId(id)) },
            userId: asUserOid(userId),
          })
            .select("fullName")
            .lean()
        : []
    const clientName = new Map(
      clients.map((c) => [String(c._id), (c as { fullName?: string }).fullName || "Contact"])
    )

    const data = rows.map((row) => {
      const r = row as Record<string, unknown>
      const cid = r.clientId != null ? String(r.clientId) : ""
      return {
        id: String(r._id),
        userId: String(r.userId),
        clientId: cid,
        clientName: clientName.get(cid) ?? null,
        projectId: r.projectId != null ? String(r.projectId) : null,
        number: r.number,
        documentType: r.documentType,
        title: r.title ?? null,
        status: r.status,
        amountCents: r.amountCents,
        taxRatePercent: r.taxRatePercent ?? null,
        currency: r.currency,
        dueDate: r.dueDate instanceof Date ? r.dueDate.toISOString() : r.dueDate,
        issuedAt: r.issuedAt instanceof Date ? r.issuedAt.toISOString() : r.issuedAt,
        notes: r.notes ?? null,
        lineItems: r.lineItems ?? [],
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
        updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
      }
    })

    return NextResponse.json({ data, total, page, limit, hasMore: skip + data.length < total })
  } catch (error) {
    const z = zodErrorResponse(error)
    if (z) return z
    console.error("[api/invoices GET]", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: "Failed to list invoices", detail: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error
    const { userId } = authRes
    await getDb()

    const payload = CreateInvoiceSchema.parse(await readJsonBody(request))
    const uid = asUserOid(userId)

    const clientOk = await Client.exists({
      _id: new mongoose.Types.ObjectId(payload.clientId),
      userId: uid,
      deletedAt: null,
    })
    if (!clientOk) {
      return NextResponse.json({ error: "Contact not found" }, { status: 400 })
    }

    if (payload.projectId) {
      if (!mongoose.Types.ObjectId.isValid(payload.projectId)) {
        return NextResponse.json({ error: "Invalid project" }, { status: 400 })
      }
      const projOk = await Project.exists({
        _id: new mongoose.Types.ObjectId(payload.projectId),
        userId: uid,
        deletedAt: null,
      })
      if (!projOk) return NextResponse.json({ error: "Project not found" }, { status: 400 })
    }

    const lineSum = sumLineItemsCents(payload.lineItems ?? [])
    const amountCents = lineSum > 0 ? lineSum : payload.amountCents
    if (amountCents == null || amountCents <= 0) {
      return NextResponse.json({ error: "amountCents or line items with positive total required" }, { status: 400 })
    }

    const number = await nextDocumentNumber(userId, payload.documentType)

    const doc = await Invoice.create({
      userId: uid,
      clientId: new mongoose.Types.ObjectId(payload.clientId),
      projectId:
        payload.projectId && mongoose.Types.ObjectId.isValid(payload.projectId)
          ? new mongoose.Types.ObjectId(payload.projectId)
          : undefined,
      number,
      documentType: payload.documentType,
      title: cleanOptionalString(payload.title),
      status: payload.status,
      amountCents,
      taxRatePercent: payload.taxRatePercent,
      currency: payload.currency,
      dueDate: new Date(payload.dueDate),
      issuedAt: payload.issuedAt ? new Date(payload.issuedAt) : new Date(),
      notes: cleanOptionalString(payload.notes),
      lineItems: payload.lineItems?.length ? payload.lineItems : [],
    })

    return NextResponse.json({ data: doc.toJSON() }, { status: 201 })
  } catch (error) {
    const z = zodErrorResponse(error)
    if (z) return z
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }
    console.error("[api/invoices POST]", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: "Failed to create invoice", detail: message }, { status: 500 })
  }
}
