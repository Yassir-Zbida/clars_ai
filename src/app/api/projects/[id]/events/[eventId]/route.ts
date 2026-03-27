import mongoose from "mongoose"
import { NextResponse } from "next/server"
import { z } from "zod"
import { getDb } from "@/server/db"
import { ProjectEvent } from "@/server/models/project-event"
import { requireUserId, readJsonBody, zodErrorResponse } from "../../../_lib"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const UpdateEventSchema = z.object({
  title:       z.string().min(1).max(300).optional(),
  description: z.string().max(4000).optional().nullable(),
  date:        z.string().optional(),
  type:        z.enum(["MEETING", "DEADLINE", "MILESTONE", "CALL", "OTHER"]).optional(),
  completed:   z.boolean().optional(),
})

type Params = { params: { id: string; eventId: string } }

export async function PATCH(req: Request, { params }: Params) {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error
    const { userId } = authRes
    await getDb()

    if (!mongoose.Types.ObjectId.isValid(params.eventId))
      return NextResponse.json({ error: "Invalid event id" }, { status: 400 })

    const input = UpdateEventSchema.parse(await readJsonBody(req))
    const set: Record<string, unknown> = {}
    if (input.title       !== undefined) set.title       = input.title.trim()
    if (input.description !== undefined) set.description = input.description?.trim() || undefined
    if (input.date        !== undefined) set.date        = new Date(input.date)
    if (input.type        !== undefined) set.type        = input.type
    if (input.completed   !== undefined) set.completed   = input.completed

    const updated = await ProjectEvent.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(params.eventId), userId: new mongoose.Types.ObjectId(userId) },
      { $set: set },
      { new: true }
    ).lean()

    if (!updated) return NextResponse.json({ error: "Event not found" }, { status: 404 })
    return NextResponse.json({ data: { ...updated, id: String((updated as {_id: unknown})._id) } })
  } catch (err) {
    const zodRes = zodErrorResponse(err)
    if (zodRes) return zodRes
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error
    const { userId } = authRes
    await getDb()

    const result = await ProjectEvent.deleteOne({
      _id: new mongoose.Types.ObjectId(params.eventId),
      userId: new mongoose.Types.ObjectId(userId),
    })
    if (!result.deletedCount) return NextResponse.json({ error: "Event not found" }, { status: 404 })
    return NextResponse.json({ data: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 })
  }
}
