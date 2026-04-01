/**
 * POST /api/user/send-otp
 *
 * Called AFTER a successful signIn — session must be valid.
 * Generates a 6-digit OTP, hashes it into the User document,
 * sends it by email, and returns a `pendingToken` the client
 * will submit to /api/user/verify-otp.
 */
import { NextResponse } from "next/server"
import crypto from "crypto"
import bcrypt from "bcryptjs"
import { Resend } from "resend"
import { auth } from "@/auth"
import { getDb } from "@/server/db"
import { User } from "@/server/models/user"
import { otpEmail } from "@/lib/email-templates"
import mongoose from "mongoose"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000"

function getFrom() {
  const raw = (process.env.EMAIL_FROM ?? "onboarding@resend.dev").trim()
  if (raw.includes("<") && raw.includes(">")) return raw
  return `Clars <${raw}>`
}

export async function POST() {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await getDb()
    const user = await User.findById(userId).select("email name otpEnabled").lean() as {
      _id: { toString(): string }; email?: string; name?: string; otpEnabled?: boolean
    } | null

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })
    if (!user.otpEnabled) return NextResponse.json({ otpRequired: false })

    const email = user.email ?? ""
    const otpCode      = String(Math.floor(100000 + Math.random() * 900000))
    const pendingToken = crypto.randomBytes(32).toString("hex")
    const expiry       = new Date(Date.now() + 10 * 60 * 1000) // 10 min

    await User.updateOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      {
        $set: {
          otpCodeHash:           await bcrypt.hash(otpCode, 10),
          otpCodeExpiry:         expiry,
          otpPendingTokenHash:   await bcrypt.hash(pendingToken, 10),
          otpPendingTokenExpiry: expiry,
        },
      }
    )

    if (resend) {
      await resend.emails.send({
        from:    getFrom(),
        to:      [email],
        subject: "Your Clars sign-in code",
        html:    otpEmail({ code: otpCode, appUrl: APP_URL, name: user.name }),
      })
    } else {
      console.log(`[send-otp] OTP for ${email}: ${otpCode}`)
    }

    return NextResponse.json({ otpRequired: true, pendingToken })
  } catch (e) {
    console.error("[send-otp]", e)
    return NextResponse.json({ error: "Failed to send OTP." }, { status: 500 })
  }
}
