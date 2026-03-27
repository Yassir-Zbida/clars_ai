import mongoose from "mongoose"
import { NextResponse } from "next/server"
import { z } from "zod"
import { getDb } from "@/server/db"
import { ProjectEvent } from "@/server/models/project-event"
import { Project } from "@/server/models/project"
import { requireUserId, readJsonBody, zodErrorResponse } from "../../_lib"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const CreateEventSchema = z.object({
  title:       z.string().min(1).max(300),
  description: z.string().max(4000).optional(),
  date:        z.string().min(1),
  type:        z.enum(["MEETING", "DEADLINE", "MILESTONE", "CALL", "OTHER"]).optional().default("OTHER"),
  completed:   z.boolean().optional().default(false),
})

async function assertProjectOwner(projectId: string, userId: string) {
  const project = await Project.findOne({
    _id: new mongoose.Types.ObjectId(projectId),
    userId: new mongoose.Types.ObjectId(userId),
    deletedAt: null,
  }).lean()
  if (!project) throw Object.assign(new Error("Project not found"), { status: 404 })
}

type Params = { params: { id: string } }

export async function GET(_req: Request, { params }: Params) {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error
    const { userId } = authRes
    await getDb()

    if (!mongoose.Types.ObjectId.isValid(params.id))
      return NextResponse.json({ error: "Invalid project id" }, { status: 400 })

    await assertProjectOwner(params.id, userId)
    const events = await ProjectEvent.find({
      projectId: new mongoose.Types.ObjectId(params.id),
      userId: new mongoose.Types.ObjectId(userId),
    }).sort({ date: 1 }).lean()

    return NextResponse.json({ data: events.map((e) => ({ ...e, id: String((e as {_id: unknown})._id) })) })
  } catch (err) {
    const zodRes = zodErrorResponse(err)
    if (zodRes) return zodRes
    const e = err as { status?: number; message?: string }
    return NextResponse.json({ error: e.message ?? "Failed to load events" }, { status: e.status ?? 500 })
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error
    const { userId } = authRes
    await getDb()

    if (!mongoose.Types.ObjectId.isValid(params.id))
      return NextResponse.json({ error: "Invalid project id" }, { status: 400 })

    await assertProjectOwner(params.id, userId)
    const input = CreateEventSchema.parse(await readJsonBody(req))

    const event = await ProjectEvent.create({
      projectId: new mongoose.Types.ObjectId(params.id),
      userId: new mongoose.Types.ObjectId(userId),
      title: input.title.trim(),
      description: input.description?.trim() || undefined,
      date: new Date(input.date),
      type: input.type,
      completed: input.completed,
    })

    return NextResponse.json({ data: event.toJSON() }, { status: 201 })
  } catch (err) {
    const zodRes = zodErrorResponse(err)
    if (zodRes) return zodRes
    const e = err as { status?: number; message?: string }
    return NextResponse.json({ error: e.message ?? "Failed to create event" }, { status: e.status ?? 500 })
  }
}
