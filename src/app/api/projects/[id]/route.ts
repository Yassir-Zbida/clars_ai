import mongoose from "mongoose"
import { NextResponse } from "next/server"
import { getDb } from "@/server/db"
import { Project } from "@/server/models/project"
import { assertClientsOwnedByUser } from "../assert-clients"
import { enrichProjectsWithContacts } from "../enrich-contacts"
import {
  readJsonBody,
  requireUserId,
  UpdateProjectSchema,
  cleanOptionalString,
  dedupeObjectIds,
  zodErrorResponse,
} from "../_lib"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Params = { params: { id: string } }

function asObjectId(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid id")
  return new mongoose.Types.ObjectId(id)
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error
    await getDb()

    const project = await Project.findOne({
      _id: asObjectId(params.id),
      userId: new mongoose.Types.ObjectId(authRes.userId),
      deletedAt: null,
    }).lean()

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })
    const [enriched] = await enrichProjectsWithContacts(authRes.userId, [project as Record<string, unknown>])
    return NextResponse.json({ data: enriched })
  } catch (error) {
    const zodResponse = zodErrorResponse(error)
    if (zodResponse) return zodResponse
    console.error("[api/projects/:id GET]", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: "Failed to load project", detail: message }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error
    await getDb()

    const input = UpdateProjectSchema.parse(await readJsonBody(request))
    const setPayload: Record<string, unknown> = {}
    if (input.name !== undefined) setPayload.name = input.name.trim()
    if (input.description !== undefined) setPayload.description = cleanOptionalString(input.description)
    if (input.notes !== undefined) setPayload.notes = cleanOptionalString(input.notes)
    if (input.status !== undefined) setPayload.status = input.status
    if (input.priority !== undefined) setPayload.priority = input.priority
    if (input.progress !== undefined) setPayload.progress = input.progress
    if (input.startDate !== undefined) setPayload.startDate = input.startDate ? new Date(input.startDate) : undefined
    if (input.endDate !== undefined) setPayload.endDate = input.endDate ? new Date(input.endDate) : undefined
    if (input.budgetCents !== undefined) setPayload.budgetCents = input.budgetCents
      if (input.currency !== undefined) setPayload.currency = input.currency?.trim() ? input.currency.trim() : "USD"

    if (input.assignedClientIds !== undefined) {
      const assigned = dedupeObjectIds(input.assignedClientIds)
      await assertClientsOwnedByUser(authRes.userId, assigned)
      setPayload.assignedClientIds = assigned
      setPayload.clientId = assigned[0] ?? null
    } else if (input.clientId !== undefined) {
      if (!input.clientId || !mongoose.Types.ObjectId.isValid(input.clientId)) {
        setPayload.assignedClientIds = []
        setPayload.clientId = null
      } else {
        const oid = new mongoose.Types.ObjectId(input.clientId)
        await assertClientsOwnedByUser(authRes.userId, [oid])
        setPayload.assignedClientIds = [oid]
        setPayload.clientId = oid
      }
    }

    const updated = await Project.findOneAndUpdate(
      {
        _id: asObjectId(params.id),
        userId: new mongoose.Types.ObjectId(authRes.userId),
        deletedAt: null,
      },
      { $set: setPayload },
      { new: true }
    ).lean()

    if (!updated) return NextResponse.json({ error: "Project not found" }, { status: 404 })
    const [enriched] = await enrichProjectsWithContacts(authRes.userId, [updated as Record<string, unknown>])
    return NextResponse.json({ data: enriched })
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
    console.error("[api/projects/:id PUT]", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: "Failed to update project", detail: message }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error
    await getDb()

    const result = await Project.updateOne(
      {
        _id: asObjectId(params.id),
        userId: new mongoose.Types.ObjectId(authRes.userId),
        deletedAt: null,
      },
      { $set: { deletedAt: new Date() } }
    )
    if (!result.matchedCount) return NextResponse.json({ error: "Project not found" }, { status: 404 })
    return NextResponse.json({ data: true })
  } catch (error) {
    const zodResponse = zodErrorResponse(error)
    if (zodResponse) return zodResponse
    console.error("[api/projects/:id DELETE]", error)
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 })
  }
}
