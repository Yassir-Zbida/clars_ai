import { NextResponse } from "next/server"
import { z } from "zod"
import { getDb } from "@/server/db"
import { User } from "@/server/models/user"
import { auth } from "@/auth"
import mongoose from "mongoose"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const PatchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
})

/** Current account (minimal fields we store today). */
export async function GET() {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await getDb()
    const doc = await User.findOne({
      _id: new mongoose.Types.ObjectId(userId),
      deletedAt: { $in: [null, undefined] },
    })
      .select("name email image")
      .lean()
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const u = doc as { name?: string; email?: string; image?: string }
    return NextResponse.json({
      data: {
        id: userId,
        name: u.name ?? session.user?.name ?? "",
        email: u.email ?? session.user?.email ?? "",
        image: u.image ?? session.user?.image ?? null,
      },
    })
  } catch (error) {
    console.error("[api/user/me GET]", error)
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const raw = await request.text()
    let parsed: unknown = {}
    if (raw.trim()) {
      try {
        parsed = JSON.parse(raw) as unknown
      } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
      }
    }
    const body = PatchSchema.parse(parsed)
    if (body.name === undefined) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    await getDb()
    const updated = await User.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(userId),
        deletedAt: { $in: [null, undefined] },
      },
      { $set: { name: body.name.trim() } },
      { new: true }
    )
      .select("name email image")
      .lean()

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const u = updated as { name?: string; email?: string; image?: string }
    return NextResponse.json({
      data: {
        id: userId,
        name: u.name ?? "",
        email: u.email ?? "",
        image: u.image ?? null,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: error.flatten() }, { status: 400 })
    }
    console.error("[api/user/me PATCH]", error)
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}
