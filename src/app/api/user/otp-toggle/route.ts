import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getDb } from "@/server/db"
import { User } from "@/server/models/user"
import mongoose from "mongoose"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    await getDb()
    const doc = await User.findById(userId).select("otpEnabled").lean() as { otpEnabled?: boolean } | null
    return NextResponse.json({ otpEnabled: doc?.otpEnabled ?? false })
  } catch (e) {
    console.error("[otp-toggle GET]", e)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { enabled } = await request.json() as { enabled?: boolean }
    if (typeof enabled !== "boolean") return NextResponse.json({ error: "enabled must be boolean" }, { status: 400 })
    await getDb()
    await User.updateOne({ _id: new mongoose.Types.ObjectId(userId) }, { $set: { otpEnabled: enabled } })
    return NextResponse.json({ otpEnabled: enabled })
  } catch (e) {
    console.error("[otp-toggle POST]", e)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
