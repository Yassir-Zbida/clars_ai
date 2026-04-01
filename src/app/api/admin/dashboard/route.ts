import { NextResponse } from "next/server"

import { requireAdminUser } from "@/app/api/admin/_lib"
import { computeAdminDashboardData } from "@/server/admin-dashboard-data"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const authRes = await requireAdminUser()
    if ("error" in authRes) return authRes.error

    const data = await computeAdminDashboardData()
    return NextResponse.json({ data })
  } catch (error) {
    console.error("[api/admin/dashboard GET]", error)
    return NextResponse.json({ error: "Failed to load admin dashboard" }, { status: 500 })
  }
}
