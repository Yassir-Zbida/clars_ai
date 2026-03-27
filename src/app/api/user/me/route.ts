import { NextResponse } from "next/server"
import { z } from "zod"
import { needsOnboardingSurveyForUser } from "@/lib/onboarding-survey"
import { getDb } from "@/server/db"
import { User } from "@/server/models/user"
import { auth } from "@/auth"
import mongoose from "mongoose"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const VALID_CURRENCIES = ["USD","EUR","GBP","CAD","AUD","JPY","CHF","CNY","AED","SAR","MAD","TND","INR","BRL","MXN","SGD","SEK","NOK","DKK","TRY","PLN","ZAR","HKD","KWD","QAR"] as const

const PatchSchema = z.object({
  name:           z.string().min(1).max(100).optional(),
  defaultCurrency: z.enum(VALID_CURRENCIES).optional(),
  companyName:    z.string().max(200).optional(),
  companyTagline: z.string().max(200).optional(),
  companyAddress: z.string().max(500).optional(),
  companyPhone:   z.string().max(50).optional(),
  companyEmail:   z.string().max(200).optional(),
  companyWebsite: z.string().max(200).optional(),
  taxId:          z.string().max(100).optional(),
  paymentInfo:    z.string().max(1000).optional(),
  signatureText:    z.string().max(100).optional(),
  invoiceColor:     z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  signatureDataUrl: z.string().max(600_000).optional(), // ~450 KB base64 limit
  logoDataUrl:      z.string().max(600_000).optional(),
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
      .select("name email image createdAt onboardingSurveyCompletedAt defaultCurrency companyName companyTagline companyAddress companyPhone companyEmail companyWebsite taxId paymentInfo signatureText invoiceColor signatureDataUrl logoDataUrl")
      .lean()
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const u = doc as {
      name?: string; email?: string; image?: string
      createdAt?: Date; onboardingSurveyCompletedAt?: Date
      defaultCurrency?: string
      companyName?: string; companyTagline?: string; companyAddress?: string
      companyPhone?: string; companyEmail?: string; companyWebsite?: string
      taxId?: string; paymentInfo?: string; signatureText?: string; invoiceColor?: string
      signatureDataUrl?: string; logoDataUrl?: string
    }
    const needsOnboardingSurvey = needsOnboardingSurveyForUser(u.createdAt, u.onboardingSurveyCompletedAt)
    return NextResponse.json({
      data: {
        id: userId,
        name: u.name ?? session.user?.name ?? "",
        email: u.email ?? session.user?.email ?? "",
        image: u.image ?? session.user?.image ?? null,
        defaultCurrency: u.defaultCurrency ?? "USD",
        needsOnboardingSurvey,
        companyName:    u.companyName    ?? "",
        companyTagline: u.companyTagline ?? "",
        companyAddress: u.companyAddress ?? "",
        companyPhone:   u.companyPhone   ?? "",
        companyEmail:   u.companyEmail   ?? "",
        companyWebsite: u.companyWebsite ?? "",
        taxId:          u.taxId          ?? "",
        paymentInfo:    u.paymentInfo    ?? "",
        signatureText:  u.signatureText  ?? "",
        invoiceColor:     u.invoiceColor     ?? "#497dcb",
        signatureDataUrl: u.signatureDataUrl ?? "",
        logoDataUrl:      u.logoDataUrl      ?? "",
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
    const textFields   = ["companyName","companyTagline","companyAddress","companyPhone","companyEmail","companyWebsite","taxId","paymentInfo","signatureText","invoiceColor"] as const
    const binaryFields = ["signatureDataUrl","logoDataUrl"] as const
    const anyField = body.name !== undefined || body.defaultCurrency !== undefined
      || textFields.some(f => body[f] !== undefined)
      || binaryFields.some(f => body[f] !== undefined)
    if (!anyField) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    const $set: Record<string, unknown> = {}
    if (body.name !== undefined) $set.name = body.name.trim()
    if (body.defaultCurrency !== undefined) $set.defaultCurrency = body.defaultCurrency
    for (const f of textFields)   { if (body[f] !== undefined) $set[f] = (body[f] as string).trim() }
    for (const f of binaryFields) { if (body[f] !== undefined) $set[f] = body[f] }

    await getDb()
    const updated = await User.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(userId),
        deletedAt: { $in: [null, undefined] },
      },
      { $set },
      { new: true }
    )
      .select("name email image defaultCurrency companyName companyTagline companyAddress companyPhone companyEmail companyWebsite taxId paymentInfo signatureText invoiceColor signatureDataUrl logoDataUrl")
      .lean()

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const u = updated as {
      name?: string; email?: string; image?: string; defaultCurrency?: string
      companyName?: string; companyTagline?: string; companyAddress?: string
      companyPhone?: string; companyEmail?: string; companyWebsite?: string
      taxId?: string; paymentInfo?: string; signatureText?: string; invoiceColor?: string
      signatureDataUrl?: string; logoDataUrl?: string
    }
    return NextResponse.json({
      data: {
        id: userId,
        name: u.name ?? "",
        email: u.email ?? "",
        image: u.image ?? null,
        defaultCurrency:  u.defaultCurrency  ?? "USD",
        companyName:      u.companyName      ?? "",
        companyTagline:   u.companyTagline   ?? "",
        companyAddress:   u.companyAddress   ?? "",
        companyPhone:     u.companyPhone     ?? "",
        companyEmail:     u.companyEmail     ?? "",
        companyWebsite:   u.companyWebsite   ?? "",
        taxId:            u.taxId            ?? "",
        paymentInfo:      u.paymentInfo      ?? "",
        signatureText:    u.signatureText    ?? "",
        invoiceColor:     u.invoiceColor     ?? "#497dcb",
        signatureDataUrl: u.signatureDataUrl ?? "",
        logoDataUrl:      u.logoDataUrl      ?? "",
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
