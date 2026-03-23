import mongoose from "mongoose"
import { NextResponse } from "next/server"
import { getDb } from "@/server/db"
import { Client } from "@/server/models/client"
import { Expense } from "@/server/models/expense"
import { Project } from "@/server/models/project"
import {
  CreateExpenseSchema,
  cleanOptionalString,
  expenseCategoryValues,
  expenseStatusValues,
  readJsonBody,
  requireUserId,
  zodErrorResponse,
} from "../finance/_lib"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error
    const { userId } = authRes
    await getDb()

    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")?.toUpperCase()
    const status = searchParams.get("status")?.toUpperCase()
    const page = Math.max(1, Number(searchParams.get("page")) || 1)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 25))
    const sortDir = searchParams.get("sortDir") === "asc" ? 1 : -1

    const uid = new mongoose.Types.ObjectId(userId)
    const clauses: Record<string, unknown>[] = [{ userId: uid }, { deletedAt: null }]

    if (category && expenseCategoryValues.includes(category as (typeof expenseCategoryValues)[number])) {
      clauses.push({ category })
    }
    if (status && expenseStatusValues.includes(status as (typeof expenseStatusValues)[number])) {
      clauses.push({ status })
    }

    const mongoQuery = clauses.length === 2 ? { ...clauses[0], ...clauses[1] } : { $and: clauses }
    const skip = (page - 1) * limit

    const [total, rows] = await Promise.all([
      Expense.countDocuments(mongoQuery),
      Expense.find(mongoQuery).sort({ incurredAt: sortDir, _id: -1 }).skip(skip).limit(limit).lean(),
    ])

    const data = rows.map((row) => {
      const r = row as Record<string, unknown>
      return {
        id: String(r._id),
        vendor: r.vendor ?? null,
        category: r.category,
        status: r.status,
        amountCents: r.amountCents,
        currency: r.currency,
        incurredAt: r.incurredAt instanceof Date ? (r.incurredAt as Date).toISOString() : r.incurredAt,
        notes: r.notes ?? null,
        receiptUrl: r.receiptUrl ?? null,
        projectId: r.projectId != null ? String(r.projectId) : null,
        clientId: r.clientId != null ? String(r.clientId) : null,
        createdAt: r.createdAt instanceof Date ? (r.createdAt as Date).toISOString() : r.createdAt,
      }
    })

    return NextResponse.json({ data, total, page, limit, hasMore: skip + data.length < total })
  } catch (error) {
    console.error("[api/expenses GET]", error)
    return NextResponse.json({ error: "Failed to list expenses" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error
    const { userId } = authRes
    await getDb()
    const uid = new mongoose.Types.ObjectId(userId)

    const payload = CreateExpenseSchema.parse(await readJsonBody(request))

    if (payload.clientId && mongoose.Types.ObjectId.isValid(payload.clientId)) {
      const ok = await Client.exists({ _id: new mongoose.Types.ObjectId(payload.clientId), userId: uid, deletedAt: null })
      if (!ok) return NextResponse.json({ error: "Contact not found" }, { status: 400 })
    }
    if (payload.projectId && mongoose.Types.ObjectId.isValid(payload.projectId)) {
      const ok = await Project.exists({ _id: new mongoose.Types.ObjectId(payload.projectId), userId: uid, deletedAt: null })
      if (!ok) return NextResponse.json({ error: "Project not found" }, { status: 400 })
    }

    const doc = await Expense.create({
      userId: uid,
      vendor: cleanOptionalString(payload.vendor),
      category: payload.category,
      status: payload.status,
      amountCents: payload.amountCents,
      currency: payload.currency,
      incurredAt: payload.incurredAt ? new Date(payload.incurredAt) : new Date(),
      notes: cleanOptionalString(payload.notes),
      receiptUrl: cleanOptionalString(payload.receiptUrl),
      projectId:
        payload.projectId && mongoose.Types.ObjectId.isValid(payload.projectId)
          ? new mongoose.Types.ObjectId(payload.projectId)
          : undefined,
      clientId:
        payload.clientId && mongoose.Types.ObjectId.isValid(payload.clientId)
          ? new mongoose.Types.ObjectId(payload.clientId)
          : undefined,
    })

    return NextResponse.json({ data: doc.toJSON() }, { status: 201 })
  } catch (error) {
    const z = zodErrorResponse(error)
    if (z) return z
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    console.error("[api/expenses POST]", error)
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 })
  }
}
