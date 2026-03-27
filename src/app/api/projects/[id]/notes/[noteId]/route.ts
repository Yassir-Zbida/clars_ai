import mongoose from "mongoose"
import { NextResponse } from "next/server"
import { z } from "zod"
import { getDb } from "@/server/db"
import { ProjectNote } from "@/server/models/project-note"
import { requireUserId, readJsonBody, zodErrorResponse } from "../../../_lib"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const UpdateNoteSchema = z.object({
  title:   z.string().max(300).optional().nullable(),
  content: z.string().min(1).max(20000).optional(),
})

type Params = { params: { id: string; noteId: string } }

export async function PATCH(req: Request, { params }: Params) {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error
    const { userId } = authRes
    await getDb()

    if (!mongoose.Types.ObjectId.isValid(params.noteId))
      return NextResponse.json({ error: "Invalid note id" }, { status: 400 })

    const input = UpdateNoteSchema.parse(await readJsonBody(req))
    const set: Record<string, unknown> = {}
    if (input.title   !== undefined) set.title   = input.title?.trim() || undefined
    if (input.content !== undefined) set.content = input.content.trim()

    const updated = await ProjectNote.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(params.noteId), userId: new mongoose.Types.ObjectId(userId) },
      { $set: set },
      { new: true }
    ).lean()

    if (!updated) return NextResponse.json({ error: "Note not found" }, { status: 404 })
    return NextResponse.json({ data: { ...updated, id: String((updated as {_id: unknown})._id) } })
  } catch (err) {
    const zodRes = zodErrorResponse(err)
    if (zodRes) return zodRes
    return NextResponse.json({ error: "Failed to update note" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error
    const { userId } = authRes
    await getDb()

    const result = await ProjectNote.deleteOne({
      _id: new mongoose.Types.ObjectId(params.noteId),
      userId: new mongoose.Types.ObjectId(userId),
    })
    if (!result.deletedCount) return NextResponse.json({ error: "Note not found" }, { status: 404 })
    return NextResponse.json({ data: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete note" }, { status: 500 })
  }
}
