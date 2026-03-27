import mongoose from "mongoose"
import { NextResponse } from "next/server"
import { z } from "zod"
import { getDb } from "@/server/db"
import { ProjectTask } from "@/server/models/project-task"
import { requireUserId, readJsonBody, zodErrorResponse } from "../../../_lib"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const UpdateTaskSchema = z.object({
  title:       z.string().min(1).max(300).optional(),
  description: z.string().max(4000).optional().nullable(),
  status:      z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
  priority:    z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  dueDate:     z.string().optional().nullable(),
  order:       z.number().optional(),
})

type Params = { params: { id: string; taskId: string } }

export async function PATCH(req: Request, { params }: Params) {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error
    const { userId } = authRes
    await getDb()

    if (!mongoose.Types.ObjectId.isValid(params.taskId))
      return NextResponse.json({ error: "Invalid task id" }, { status: 400 })

    const input = UpdateTaskSchema.parse(await readJsonBody(req))
    const set: Record<string, unknown> = {}
    if (input.title       !== undefined) set.title       = input.title.trim()
    if (input.description !== undefined) set.description = input.description?.trim() || undefined
    if (input.status      !== undefined) set.status      = input.status
    if (input.priority    !== undefined) set.priority    = input.priority
    if (input.order       !== undefined) set.order       = input.order
    if (input.dueDate     !== undefined) set.dueDate     = input.dueDate ? new Date(input.dueDate) : undefined

    const updated = await ProjectTask.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(params.taskId), userId: new mongoose.Types.ObjectId(userId) },
      { $set: set },
      { new: true }
    ).lean()

    if (!updated) return NextResponse.json({ error: "Task not found" }, { status: 404 })
    return NextResponse.json({ data: { ...updated, id: String((updated as {_id: unknown})._id) } })
  } catch (err) {
    const zodRes = zodErrorResponse(err)
    if (zodRes) return zodRes
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error
    const { userId } = authRes
    await getDb()

    if (!mongoose.Types.ObjectId.isValid(params.taskId))
      return NextResponse.json({ error: "Invalid task id" }, { status: 400 })

    const result = await ProjectTask.deleteOne({
      _id: new mongoose.Types.ObjectId(params.taskId),
      userId: new mongoose.Types.ObjectId(userId),
    })
    if (!result.deletedCount) return NextResponse.json({ error: "Task not found" }, { status: 404 })
    return NextResponse.json({ data: true })
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 })
  }
}
