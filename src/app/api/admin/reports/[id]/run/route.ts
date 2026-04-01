import mongoose from "mongoose"
import { NextResponse } from "next/server"

import { requireAdminUser } from "@/app/api/admin/_lib"
import { buildAdminReportPayload } from "@/lib/admin-report-content"
import { serializeAdminReport } from "@/lib/admin-report-serialize"
import { getDb } from "@/server/db"
import { computeAdminDashboardData } from "@/server/admin-dashboard-data"
import { AdminReport } from "@/server/models/admin-report"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authRes = await requireAdminUser()
    if ("error" in authRes) return authRes.error

    const { id } = await params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid report id" }, { status: 400 })
    }

    await getDb()
    const report = (await AdminReport.findById(id).lean()) as { _id: unknown; name?: string } | null

    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 })

    const dashboard = await computeAdminDashboardData()
    const { summary, detail } = buildAdminReportPayload(dashboard, report.name ?? "Admin report")

    const now = new Date()
    const updated = await AdminReport.findByIdAndUpdate(
      id,
      {
        $set: {
          lastRunAt: now,
          lastRunSummary: summary.slice(0, 1000),
          lastRunDetail: detail.slice(0, 14000),
        },
        $unset: { lastRunEmailStatus: 1, lastRunEmailDetail: 1 },
      },
      { new: true }
    ).lean()

    const dto = serializeAdminReport(updated)

    return NextResponse.json({
      data: {
        report: dto,
        runAt: now.toISOString(),
        summary,
      },
    })
  } catch (error) {
    console.error("[api/admin/reports/[id]/run POST]", error)
    return NextResponse.json({ error: "Failed to run report" }, { status: 500 })
  }
}
