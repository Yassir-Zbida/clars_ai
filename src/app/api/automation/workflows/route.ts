import mongoose from "mongoose"
import { NextResponse } from "next/server"
import { getDb } from "@/server/db"
import { AutomationWorkflow } from "@/server/models/automation-workflow"
import { requireUserId, zodErrorResponse } from "@/app/api/clients/_lib"
import { CreateWorkflowSchema, readJsonBody } from "../_lib"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error
    await getDb()
    const uid = new mongoose.Types.ObjectId(authRes.userId)
    const rows = await AutomationWorkflow.find({ userId: uid, deletedAt: null }).sort({ updatedAt: -1 }).lean()
    const data = rows.map((r) => {
      const row = r as Record<string, unknown>
      return {
        id: String(row._id),
        name: row.name,
        description: row.description ?? null,
        trigger: row.trigger,
        action: row.action,
        enabled: row.enabled,
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
        updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
      }
    })
    return NextResponse.json({ data })
  } catch (error) {
    console.error("[api/automation/workflows GET]", error)
    return NextResponse.json({ error: "Failed to list workflows" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error
    await getDb()
    const uid = new mongoose.Types.ObjectId(authRes.userId)
    const payload = CreateWorkflowSchema.parse(await readJsonBody(request))

    const doc = await AutomationWorkflow.create({
      userId: uid,
      name: payload.name.trim(),
      description: payload.description?.trim() || undefined,
      trigger: payload.trigger,
      action: payload.action,
      enabled: payload.enabled,
    })

    return NextResponse.json({ data: doc.toJSON() }, { status: 201 })
  } catch (error) {
    const z = zodErrorResponse(error)
    if (z) return z
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    if (error && typeof error === "object" && "code" in error && (error as { code?: number }).code === 11000) {
      return NextResponse.json({ error: "A workflow with this name already exists" }, { status: 400 })
    }
    console.error("[api/automation/workflows POST]", error)
    return NextResponse.json({ error: "Failed to create workflow" }, { status: 500 })
  }
}
