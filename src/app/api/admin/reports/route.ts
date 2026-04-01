import { NextResponse } from "next/server"
import { z } from "zod"

import { requireAdminUser } from "@/app/api/admin/_lib"
import { serializeAdminReport } from "@/lib/admin-report-serialize"
import { getDb } from "@/server/db"
import { AdminReport } from "@/server/models/admin-report"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const CreateSchema = z.object({
  name: z.string().min(2).max(200),
  schedule: z.string().min(2).max(120),
  destination: z.preprocess((v) => (v == null || v === "" ? "" : String(v)), z.string().max(320)),
  status: z.enum(["active", "draft"]).default("draft"),
})

export async function GET() {
  try {
    const authRes = await requireAdminUser()
    if ("error" in authRes) return authRes.error

    await getDb()
    const rows = await AdminReport.find({}).sort({ updatedAt: -1 }).lean()
    const data = rows
      .map((r) => serializeAdminReport(r))
      .filter((x): x is NonNullable<typeof x> => x != null)
    return NextResponse.json({ data })
  } catch (error) {
    console.error("[api/admin/reports GET]", error)
    return NextResponse.json({ error: "Failed to load reports" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const authRes = await requireAdminUser()
    if ("error" in authRes) return authRes.error

    let raw: unknown
    try {
      raw = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const input = CreateSchema.parse(raw)
    await getDb()

    const created = await AdminReport.create({
      name: input.name.trim(),
      schedule: input.schedule.trim(),
      destination: input.destination.trim().slice(0, 320),
      status: input.status,
      createdByEmail: authRes.email.toLowerCase(),
    })

    const plain = created.toObject({ flattenMaps: true })
    const dto = serializeAdminReport(plain)
    if (!dto) {
      console.error("[api/admin/reports POST] serialize returned null", plain)
      return NextResponse.json({ error: "Failed to serialize new report" }, { status: 500 })
    }
    return NextResponse.json({ data: dto }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: error.flatten() }, { status: 400 })
    }
    if (error && typeof error === "object" && "name" in error && (error as { name?: string }).name === "ValidationError") {
      const e = error as { message?: string }
      return NextResponse.json({ error: "Database validation failed", detail: e.message }, { status: 400 })
    }
    const detail = error instanceof Error ? error.message : "Unknown error"
    console.error("[api/admin/reports POST]", error)
    return NextResponse.json({ error: "Failed to create report", detail }, { status: 500 })
  }
}
