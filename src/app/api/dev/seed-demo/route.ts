import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { canUserSeedDemo, isDemoSeedRouteEnabled } from "@/lib/demo-seed-access"
import { getDb } from "@/server/db"
import { resetAndSeedDemoDashboardForUser } from "@/server/seed/demo-dashboard-seed"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Tells the settings UI whether to show the demo seed control (no email enumeration). */
export async function GET() {
  try {
    if (!isDemoSeedRouteEnabled()) {
      return NextResponse.json({ canSeed: false })
    }
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ canSeed: false })
    }
    const email = session.user.email
    return NextResponse.json({ canSeed: canUserSeedDemo(email) })
  } catch (e) {
    console.error("[api/dev/seed-demo GET]", e)
    return NextResponse.json({ canSeed: false })
  }
}

export async function POST() {
  try {
    if (!isDemoSeedRouteEnabled()) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const session = await auth()
    const userId = session?.user?.id

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!canUserSeedDemo(session?.user?.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await getDb()
    await resetAndSeedDemoDashboardForUser(userId)

    return NextResponse.json({
      ok: true,
      message: "Demo data reset and seeded successfully.",
    })
  } catch (error) {
    console.error("[api/dev/seed-demo POST]", error)
    return NextResponse.json({ error: "Failed to seed demo data" }, { status: 500 })
  }
}
