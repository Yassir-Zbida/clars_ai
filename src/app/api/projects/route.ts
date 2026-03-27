import mongoose from "mongoose"
import { NextResponse } from "next/server"
import { getDb } from "@/server/db"
import { Project } from "@/server/models/project"
import {
  CreateProjectSchema,
  cleanOptionalString,
  dedupeObjectIds,
  projectPriorityValues,
  projectStatusValues,
  readJsonBody,
  requireUserId,
  zodErrorResponse,
} from "./_lib"
import { assertClientsOwnedByUser } from "./assert-clients"
import { enrichProjectsWithContacts } from "./enrich-contacts"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error
    const { userId } = authRes

    await getDb()
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("search")?.trim()
    const statusFilter = searchParams.get("status")?.trim().toUpperCase()
    const priorityFilter = searchParams.get("priority")?.trim().toUpperCase()
    const contactId = searchParams.get("contactId")?.trim()
    const sortBy = searchParams.get("sortBy") ?? "createdAt"
    const sortDir = searchParams.get("sortDir") === "asc" ? 1 : -1

    const clauses: Record<string, unknown>[] = [
      { userId: new mongoose.Types.ObjectId(userId) },
      { deletedAt: null },
    ]

    if (query) {
      const searchRegex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
      clauses.push({ $or: [{ name: searchRegex }, { description: searchRegex }] })
    }

    if (statusFilter && projectStatusValues.includes(statusFilter as (typeof projectStatusValues)[number])) {
      clauses.push({ status: statusFilter })
    }

    if (
      priorityFilter &&
      projectPriorityValues.includes(priorityFilter as (typeof projectPriorityValues)[number])
    ) {
      clauses.push({ priority: priorityFilter })
    }

    if (contactId && mongoose.Types.ObjectId.isValid(contactId)) {
      const oid = new mongoose.Types.ObjectId(contactId)
      clauses.push({ $or: [{ clientId: oid }, { assignedClientIds: oid }] })
    }

    const mongoQuery = clauses.length === 2 ? { ...clauses[0], ...clauses[1] } : { $and: clauses }

    const sortable = new Set(["createdAt", "name", "budgetCents", "progress", "priority", "status", "updatedAt"])
    const sort: Record<string, 1 | -1> = {}
    if (sortable.has(sortBy)) sort[sortBy] = sortDir
    else sort.createdAt = -1
    sort._id = sortDir

    const [total, rows] = await Promise.all([
      Project.countDocuments(mongoQuery),
      Project.find(mongoQuery).sort(sort).limit(200).lean(),
    ])

    const data = await enrichProjectsWithContacts(userId, rows as Record<string, unknown>[])

    return NextResponse.json({
      data,
      total,
    })
  } catch (error) {
    const zodResponse = zodErrorResponse(error)
    if (zodResponse) return zodResponse
    console.error("[api/projects GET]", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: "Failed to list projects", detail: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error
    const { userId } = authRes
    await getDb()

    const payload = CreateProjectSchema.parse(await readJsonBody(request))

    const idList = dedupeObjectIds([
      ...(payload.clientId ? [payload.clientId] : []),
      ...payload.assignedClientIds,
    ])
    await assertClientsOwnedByUser(userId, idList)

    const doc: Record<string, unknown> = {
      userId: new mongoose.Types.ObjectId(userId),
      name: payload.name.trim(),
      description: cleanOptionalString(payload.description),
      notes: cleanOptionalString(payload.notes),
      status: payload.status,
      priority: payload.priority,
      progress: payload.progress,
      startDate: payload.startDate ? new Date(payload.startDate) : undefined,
      endDate: payload.endDate ? new Date(payload.endDate) : undefined,
      budgetCents: payload.budgetCents,
      currency: payload.currency?.trim() || "USD",
      assignedClientIds: idList,
      clientId: idList[0],
    }

    const project = await Project.create(doc)

    return NextResponse.json({ data: project.toJSON() }, { status: 201 })
  } catch (error) {
    const zodResponse = zodErrorResponse(error)
    if (zodResponse) return zodResponse
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }
    if (error instanceof mongoose.Error.ValidationError) {
      return NextResponse.json({ error: "Validation failed", detail: error.message }, { status: 400 })
    }
    if (error instanceof Error && error.name === "ContactAssignmentError") {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("[api/projects POST]", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: "Failed to create project", detail: message }, { status: 500 })
  }
}
