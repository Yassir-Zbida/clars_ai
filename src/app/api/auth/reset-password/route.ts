import { NextResponse } from "next/server"
import { getDb } from "@/server/db"
import { User } from "@/server/models/user"
import bcrypt from "bcryptjs"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const token = typeof body?.token === "string" ? body.token.trim() : ""
    const email = typeof body?.email === "string" ? body.email.trim() : ""
    const password = typeof body?.password === "string" ? body.password : ""

    if (!token || !email) {
      return NextResponse.json(
        { error: "Invalid or expired reset link. Please request a new one." },
        { status: 400 }
      )
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      )
    }

    await getDb()

    const user = await User.findOne({
      email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      deletedAt: { $in: [null, undefined] },
      passwordResetTokenExpiry: { $gt: new Date() },
    })
      .select("passwordResetToken passwordResetTokenExpiry")
      .lean() as { passwordResetToken?: string } | null

    if (!user?.passwordResetToken) {
      return NextResponse.json(
        { error: "Invalid or expired reset link. Please request a new one." },
        { status: 400 }
      )
    }

    const valid = await bcrypt.compare(token, user.passwordResetToken)
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid or expired reset link. Please request a new one." },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    await User.updateOne(
      { email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
      {
        $set: { password: hashedPassword },
        $unset: { passwordResetToken: 1, passwordResetTokenExpiry: 1 },
      }
    )

    return NextResponse.json({ message: "Password updated. You can sign in now." })
  } catch (e) {
    console.error("[reset-password]", e)
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
