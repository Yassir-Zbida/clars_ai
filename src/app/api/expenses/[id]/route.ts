import mongoose from "mongoose"
import { NextResponse } from "next/server"
import { getDb } from "@/server/db"
import { Client } from "@/server/models/client"
import { Expense } from "@/server/models/expense"
import { Project } from "@/server/models/project"
import { UpdateExpenseSchema, cleanOptionalString, readJsonBody, requireUserId, zodErrorResponse } from "../../finance/_lib"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Params = { params: { id: string } }

function asOid(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid id")
  return new mongoose.Types.ObjectId(id)
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error
    await getDb()
    const row = await Expense.findOne({
      _id: asOid(params.id),
      userId: new mongoose.Types.ObjectId(authRes.userId),
      deletedAt: null,
    }).lean() as Record<string, unknown> | null
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const data = {
      id: String(row._id),
      vendor: row.vendor ?? null,
      category: row.category,
      status: row.status,
      amountCents: row.amountCents,
      currency: row.currency,
      incurredAt: row.incurredAt instanceof Date ? (row.incurredAt as Date).toISOString() : row.incurredAt,
      notes: row.notes ?? null,
      receiptUrl: row.receiptUrl ?? null,
      projectId: row.projectId != null ? String(row.projectId) : null,
      clientId: row.clientId != null ? String(row.clientId) : null,
    }
    return NextResponse.json({ data })
  } catch (error) {
    console.error("[api/expenses/:id GET]", error)
    return NextResponse.json({ error: "Failed to load" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error
    await getDb()
    const uid = new mongoose.Types.ObjectId(authRes.userId)
    const input = UpdateExpenseSchema.parse(await readJsonBody(request))
    const setPayload: Record<string, unknown> = {}

    if (input.vendor !== undefined) setPayload.vendor = cleanOptionalString(input.vendor)
    if (input.category !== undefined) setPayload.category = input.category
    if (input.status !== undefined) setPayload.status = input.status
    if (input.amountCents !== undefined) setPayload.amountCents = input.amountCents
    if (input.currency !== undefined) setPayload.currency = input.currency
    if (input.incurredAt !== undefined) setPayload.incurredAt = new Date(input.incurredAt)
    if (input.notes !== undefined) setPayload.notes = cleanOptionalString(input.notes)
    if (input.receiptUrl !== undefined) setPayload.receiptUrl = cleanOptionalString(input.receiptUrl)

    if (input.clientId !== undefined) {
      if (!input.clientId) setPayload.clientId = undefined
      else if (mongoose.Types.ObjectId.isValid(input.clientId)) {
        const ok = await Client.exists({ _id: new mongoose.Types.ObjectId(input.clientId), userId: uid, deletedAt: null })
        if (!ok) return NextResponse.json({ error: "Contact not found" }, { status: 400 })
        setPayload.clientId = new mongoose.Types.ObjectId(input.clientId)
      }
    }
    if (input.projectId !== undefined) {
      if (!input.projectId) setPayload.projectId = undefined
      else if (mongoose.Types.ObjectId.isValid(input.projectId)) {
        const ok = await Project.exists({ _id: new mongoose.Types.ObjectId(input.projectId), userId: uid, deletedAt: null })
        if (!ok) return NextResponse.json({ error: "Project not found" }, { status: 400 })
        setPayload.projectId = new mongoose.Types.ObjectId(input.projectId)
      }
    }

    const updated = await Expense.findOneAndUpdate(
      { _id: asOid(params.id), userId: uid, deletedAt: null },
      { $set: setPayload },
      { new: true }
    ).lean() as Record<string, unknown> | null
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({
      data: {
        id: String(updated._id),
        ...setPayload,
        vendor: updated.vendor,
        category: updated.category,
        status: updated.status,
        amountCents: updated.amountCents,
        currency: updated.currency,
      },
    })
  } catch (error) {
    const z = zodErrorResponse(error)
    if (z) return z
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    console.error("[api/expenses/:id PUT]", error)
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error
    await getDb()
    const r = await Expense.updateOne(
      { _id: asOid(params.id), userId: new mongoose.Types.ObjectId(authRes.userId), deletedAt: null },
      { $set: { deletedAt: new Date() } }
    )
    if (!r.matchedCount) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ data: true })
  } catch (error) {
    console.error("[api/expenses/:id DELETE]", error)
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}
