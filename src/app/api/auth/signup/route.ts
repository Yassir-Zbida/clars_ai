import { NextResponse } from "next/server"
import { getDb } from "@/server/db"
import { User } from "@/server/models/user"
import bcrypt from "bcryptjs"
import { clientIpFromRequest, consumeSignupAttempt } from "@/lib/rate-limit-memory"

const MIN_PASSWORD_LENGTH = 8
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const name = typeof body?.name === "string" ? body.name.trim() : ""
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
    const password = typeof body?.password === "string" ? body.password : ""

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      )
    }
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      )
    }
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      )
    }

    await getDb()

    const existing = await User.findOne({
      email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      deletedAt: { $in: [null, undefined] },
    })

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      )
    }

    const ip = clientIpFromRequest(request)
    const rl = consumeSignupAttempt(`ip:${ip}`, `email:${email}`)
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many signup attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    await User.create({
      name: name || undefined,
      email,
      password: hashedPassword,
    })

    return NextResponse.json({
      message: "Account created. You can sign in now.",
    })
  } catch (e) {
    console.error("[signup]", e)
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
