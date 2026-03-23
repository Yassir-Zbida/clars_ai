import mongoose from "mongoose"
import { NextResponse } from "next/server"
import { getDb } from "@/server/db"
import { MessageTemplate } from "@/server/models/message-template"
import { requireUserId, zodErrorResponse } from "@/app/api/clients/_lib"
import { UpdateTemplateSchema, readJsonBody } from "../../_lib"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Params = { params: { id: string } }

function oid(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid id")
  return new mongoose.Types.ObjectId(id)
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error
    await getDb()
    const uid = new mongoose.Types.ObjectId(authRes.userId)
    const input = UpdateTemplateSchema.parse(await readJsonBody(request))
    const set: Record<string, unknown> = {}
    if (input.name !== undefined) set.name = input.name.trim()
    if (input.slug !== undefined) set.slug = input.slug.trim().toLowerCase()
    if (input.channel !== undefined) set.channel = input.channel
    if (input.body !== undefined) set.body = input.body

    const updated = (await MessageTemplate.findOneAndUpdate(
      { _id: oid(params.id), userId: uid, deletedAt: null },
      { $set: set },
      { new: true }
    ).lean()) as Record<string, unknown> | null
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ data: { ...updated, id: String(updated._id) } })
  } catch (error) {
    const z = zodErrorResponse(error)
    if (z) return z
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    if (error instanceof Error && error.message === "Invalid id") {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 })
    }
    if (error && typeof error === "object" && "code" in error && (error as { code?: number }).code === 11000) {
      return NextResponse.json({ error: "Slug already in use" }, { status: 400 })
    }
    console.error("[api/automation/templates/:id PUT]", error)
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error
    await getDb()
    const uid = new mongoose.Types.ObjectId(authRes.userId)
    const r = await MessageTemplate.updateOne(
      { _id: oid(params.id), userId: uid, deletedAt: null },
      { $set: { deletedAt: new Date() } }
    )
    if (!r.matchedCount) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ data: true })
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid id") {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 })
    }
    console.error("[api/automation/templates/:id DELETE]", error)
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}
