import { NextResponse } from "next/server"
import crypto from "crypto"
import bcrypt from "bcryptjs"
import { getDb } from "@/server/db"
import { User } from "@/server/models/user"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body         = await request.json()
    const email        = typeof body?.email        === "string" ? body.email.trim().toLowerCase()   : ""
    const pendingToken = typeof body?.pendingToken === "string" ? body.pendingToken.trim()           : ""
    const code         = typeof body?.code         === "string" ? body.code.trim().replace(/\s/g, ""): ""

    if (!email || !pendingToken || !code) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 })
    }
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Enter the 6-digit code from your email." }, { status: 400 })
    }

    await getDb()

    const user = await User.findOne({
      email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      deletedAt: { $in: [null, undefined] },
    }).select("otpCodeHash otpCodeExpiry otpPendingTokenHash otpPendingTokenExpiry").lean()

    const doc = user as {
      _id: { toString(): string }
      otpCodeHash?: string; otpCodeExpiry?: Date
      otpPendingTokenHash?: string; otpPendingTokenExpiry?: Date
    } | null

    const invalid = () => NextResponse.json({ error: "Invalid or expired code. Please try again." }, { status: 401 })

    if (!doc?.otpCodeHash || !doc.otpCodeExpiry || !doc.otpPendingTokenHash || !doc.otpPendingTokenExpiry) return invalid()
    if (new Date() > doc.otpCodeExpiry || new Date() > doc.otpPendingTokenExpiry) return invalid()

    const [tokenOk, codeOk] = await Promise.all([
      bcrypt.compare(pendingToken, doc.otpPendingTokenHash),
      bcrypt.compare(code,         doc.otpCodeHash),
    ])
    if (!tokenOk || !codeOk) return invalid()

    // Issue a short-lived verified token (5 min, one-time use)
    const verifiedToken = crypto.randomBytes(32).toString("hex")
    await User.updateOne(
      { _id: doc._id },
      {
        $set: {
          otpVerifiedTokenHash:   await bcrypt.hash(verifiedToken, 10),
          otpVerifiedTokenExpiry: new Date(Date.now() + 5 * 60 * 1000),
        },
        $unset: {
          otpCodeHash: "", otpCodeExpiry: "",
          otpPendingTokenHash: "", otpPendingTokenExpiry: "",
        },
      }
    )

    return NextResponse.json({ verifiedToken })
  } catch (e) {
    console.error("[verify-otp]", e)
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
