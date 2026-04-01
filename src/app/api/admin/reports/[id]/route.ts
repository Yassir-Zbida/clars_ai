import mongoose from "mongoose"
import { NextResponse } from "next/server"
import { z } from "zod"

import { requireAdminUser } from "@/app/api/admin/_lib"
import { serializeAdminReport } from "@/lib/admin-report-serialize"
import { getDb } from "@/server/db"
import { AdminReport } from "@/server/models/admin-report"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const UpdateSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  schedule: z.string().min(2).max(120).optional(),
  destination: z.string().max(320).optional(),
  status: z.enum(["active", "draft"]).optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authRes = await requireAdminUser()
    if ("error" in authRes) return authRes.error

    const { id } = await params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid report id" }, { status: 400 })
    }

    const input = UpdateSchema.parse(await request.json())
    if (Object.keys(input).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const update: Record<string, unknown> = {}
    if (input.name !== undefined) update.name = input.name.trim()
    if (input.schedule !== undefined) update.schedule = input.schedule.trim()
    if (input.destination !== undefined) update.destination = input.destination.trim().slice(0, 320)
    if (input.status !== undefined) update.status = input.status

    await getDb()
    const updated = await AdminReport.findByIdAndUpdate(id, { $set: update }, { new: true }).lean()
    if (!updated) return NextResponse.json({ error: "Report not found" }, { status: 404 })
    const dto = serializeAdminReport(updated)
    return NextResponse.json({ data: dto })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: error.flatten() }, { status: 400 })
    }
    console.error("[api/admin/reports/[id] PATCH]", error)
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authRes = await requireAdminUser()
    if ("error" in authRes) return authRes.error

    const { id } = await params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid report id" }, { status: 400 })
    }

    await getDb()
    const deleted = await AdminReport.findByIdAndDelete(id).lean()
    if (!deleted) return NextResponse.json({ error: "Report not found" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[api/admin/reports/[id] DELETE]", error)
    return NextResponse.json({ error: "Failed to delete report" }, { status: 500 })
  }
}
