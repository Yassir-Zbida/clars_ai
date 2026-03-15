import { NextResponse } from "next/server"
import crypto from "crypto"
import { Resend } from "resend"
import { getDb } from "@/server/db"
import { User } from "@/server/models/user"
import bcrypt from "bcryptjs"

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000"

/** Build "from" address. Resend requires a verified domain for custom emails; default uses Resend's testing address so it works without verification. */
function getFromAddress(): string {
  const raw = (process.env.EMAIL_FROM ?? "onboarding@resend.dev").trim()
  if (!raw) return "Clars <onboarding@resend.dev>"
  if (raw.includes("<") && raw.includes(">")) return raw
  return `Clars <${raw}>`
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      )
    }

    await getDb()

    const user = await User.findOne({
      email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      deletedAt: { $in: [null, undefined] },
    })

    // Always return success to avoid leaking whether the email exists
    if (!user) {
      return NextResponse.json({
        message: "If an account exists with this email, you will receive a password reset link.",
      })
    }

    // Users without a password (e.g. Google-only) cannot reset password
    if (!user.password) {
      return NextResponse.json({
        message: "If an account exists with this email, you will receive a password reset link.",
      })
    }

    const token = crypto.randomBytes(32).toString("hex")
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await User.updateOne(
      { _id: user._id },
      {
        passwordResetToken: await bcrypt.hash(token, 10),
        passwordResetTokenExpiry: expires,
      }
    )

    const recipientEmail = (user.email ?? email).trim().toLowerCase()
    const resetUrl = `${APP_URL}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(recipientEmail)}`

    if (resend) {
      const from = getFromAddress()
      const { data, error } = await resend.emails.send({
        from,
        to: [recipientEmail],
        subject: "Reset your password – clars.ai",
        html: `
          <p>You requested a password reset for clars.ai.</p>
          <p><a href="${resetUrl}">Reset your password</a></p>
          <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
        `,
      })

      if (error) {
        console.error("[forgot-password] Resend error:", error)
        return NextResponse.json(
          { error: "Something went wrong. Please try again." },
          { status: 500 }
        )
      }

      if (!data?.id) {
        console.error("[forgot-password] Resend returned no id:", { data, error })
        return NextResponse.json(
          { error: "Something went wrong. Please try again." },
          { status: 500 }
        )
      }
    } else {
      // No Resend key: for development, log the link (same success response to avoid leaking)
      // eslint-disable-next-line no-console
      console.log("[forgot-password] Reset link (no RESEND_API_KEY):", resetUrl)
    }

    return NextResponse.json({
      message: "If an account exists with this email, you will receive a password reset link.",
    })
  } catch (e) {
    console.error("[forgot-password]", e)
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
