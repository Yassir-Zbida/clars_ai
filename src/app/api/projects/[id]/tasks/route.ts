import mongoose from "mongoose"
import { NextResponse } from "next/server"
import { z } from "zod"
import { getDb } from "@/server/db"
import { ProjectTask } from "@/server/models/project-task"
import { Project } from "@/server/models/project"
import { requireUserId, readJsonBody, zodErrorResponse } from "../../_lib"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const CreateTaskSchema = z.object({
  title:       z.string().min(1).max(300),
  description: z.string().max(4000).optional(),
  status:      z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional().default("TODO"),
  priority:    z.enum(["LOW", "MEDIUM", "HIGH"]).optional().default("MEDIUM"),
  dueDate:     z.string().optional(),
  order:       z.number().optional(),
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

    const tasks = await ProjectTask.find({
      projectId: new mongoose.Types.ObjectId(params.id),
      userId: new mongoose.Types.ObjectId(userId),
    }).sort({ order: 1, createdAt: 1 }).lean()

    return NextResponse.json({ data: tasks.map((t) => ({ ...t, id: String((t as {_id: unknown})._id) })) })
  } catch (err) {
    const zodRes = zodErrorResponse(err)
    if (zodRes) return zodRes
    const e = err as { status?: number; message?: string }
    return NextResponse.json({ error: e.message ?? "Failed to load tasks" }, { status: e.status ?? 500 })
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
    const input = CreateTaskSchema.parse(await readJsonBody(req))

    const task = await ProjectTask.create({
      projectId: new mongoose.Types.ObjectId(params.id),
      userId: new mongoose.Types.ObjectId(userId),
      title: input.title.trim(),
      description: input.description?.trim() || undefined,
      status: input.status,
      priority: input.priority,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      order: input.order ?? Date.now(),
    })

    return NextResponse.json({ data: task.toJSON() }, { status: 201 })
  } catch (err) {
    const zodRes = zodErrorResponse(err)
    if (zodRes) return zodRes
    const e = err as { status?: number; message?: string }
    return NextResponse.json({ error: e.message ?? "Failed to create task" }, { status: e.status ?? 500 })
  }
}
