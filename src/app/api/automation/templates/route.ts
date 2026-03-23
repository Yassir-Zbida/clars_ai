import mongoose from "mongoose"
import { NextResponse } from "next/server"
import { getDb } from "@/server/db"
import { MessageTemplate } from "@/server/models/message-template"
import { requireUserId, zodErrorResponse } from "@/app/api/clients/_lib"
import { CreateTemplateSchema, readJsonBody } from "../_lib"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error
    await getDb()
    const uid = new mongoose.Types.ObjectId(authRes.userId)
    const rows = await MessageTemplate.find({ userId: uid, deletedAt: null }).sort({ name: 1 }).lean()
    const data = rows.map((r) => {
      const row = r as Record<string, unknown>
      return {
        id: String(row._id),
        name: row.name,
        slug: row.slug,
        channel: row.channel,
        body: row.body,
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
        updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
      }
    })
    return NextResponse.json({ data })
  } catch (error) {
    console.error("[api/automation/templates GET]", error)
    return NextResponse.json({ error: "Failed to list templates" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error
    await getDb()
    const uid = new mongoose.Types.ObjectId(authRes.userId)
    const payload = CreateTemplateSchema.parse(await readJsonBody(request))

    const doc = await MessageTemplate.create({
      userId: uid,
      name: payload.name.trim(),
      slug: payload.slug.trim().toLowerCase(),
      channel: payload.channel,
      body: payload.body,
    })

    return NextResponse.json({ data: doc.toJSON() }, { status: 201 })
  } catch (error) {
    const z = zodErrorResponse(error)
    if (z) return z
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    if (error && typeof error === "object" && "code" in error && (error as { code?: number }).code === 11000) {
      return NextResponse.json({ error: "Slug already in use" }, { status: 400 })
    }
    console.error("[api/automation/templates POST]", error)
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 })
  }
}
