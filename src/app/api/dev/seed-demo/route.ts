import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/server/db";
import { resetAndSeedDemoDashboardForUser } from "@/server/seed/demo-dashboard-seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEMO_EMAIL = "zbidayassir10@gmail.com";

function normalizeEmail(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export async function POST() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const email = normalizeEmail(session?.user?.email);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (email !== DEMO_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await getDb();
    await resetAndSeedDemoDashboardForUser(userId);

    return NextResponse.json({
      ok: true,
      message: "Demo data reset and seeded successfully.",
    });
  } catch (error) {
    console.error("[api/dev/seed-demo POST]", error);
    return NextResponse.json({ error: "Failed to seed demo data" }, { status: 500 });
  }
}
