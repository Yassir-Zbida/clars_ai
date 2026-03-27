import mongoose from "mongoose"
import { NextResponse } from "next/server"
import { z } from "zod"
import { getDb } from "@/server/db"
import { ProjectNote } from "@/server/models/project-note"
import { Project } from "@/server/models/project"
import { requireUserId, readJsonBody, zodErrorResponse } from "../../_lib"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const CreateNoteSchema = z.object({
  title:   z.string().max(300).optional(),
  content: z.string().min(1).max(20000),
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
    const notes = await ProjectNote.find({
      projectId: new mongoose.Types.ObjectId(params.id),
      userId: new mongoose.Types.ObjectId(userId),
    }).sort({ updatedAt: -1 }).lean()

    return NextResponse.json({ data: notes.map((n) => ({ ...n, id: String((n as {_id: unknown})._id) })) })
  } catch (err) {
    const zodRes = zodErrorResponse(err)
    if (zodRes) return zodRes
    const e = err as { status?: number; message?: string }
    return NextResponse.json({ error: e.message ?? "Failed to load notes" }, { status: e.status ?? 500 })
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
    const input = CreateNoteSchema.parse(await readJsonBody(req))

    const note = await ProjectNote.create({
      projectId: new mongoose.Types.ObjectId(params.id),
      userId: new mongoose.Types.ObjectId(userId),
      title: input.title?.trim() || undefined,
      content: input.content.trim(),
    })

    return NextResponse.json({ data: note.toJSON() }, { status: 201 })
  } catch (err) {
    const zodRes = zodErrorResponse(err)
    if (zodRes) return zodRes
    const e = err as { status?: number; message?: string }
    return NextResponse.json({ error: e.message ?? "Failed to create note" }, { status: e.status ?? 500 })
  }
}
