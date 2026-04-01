import mongoose from "mongoose"
import { NextResponse } from "next/server"
import { z } from "zod"

import { auth } from "@/auth"
import { requireAdminUser } from "@/app/api/admin/_lib"
import { deleteUserAndWorkspaceData } from "@/lib/admin-delete-user"
import { getDb } from "@/server/db"
import { User } from "@/server/models/user"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const profileSelect =
  "name email emailVerified image createdAt updatedAt deletedAt defaultCurrency companyName companyTagline companyAddress companyPhone companyEmail companyWebsite taxId paymentInfo signatureText invoiceColor onboardingSurveyCompletedAt onboardingSurvey otpEnabled logoDataUrl signatureDataUrl"

const PatchBodySchema = z.object({
  action: z.enum(["DEACTIVATE", "ACTIVATE"]),
})

/** Profile for admin dialog — omits secrets and strips large binary fields. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authRes = await requireAdminUser()
    if ("error" in authRes) return authRes.error

    const { id } = await params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 })
    }

    await getDb()
    const row = await User.findById(id).select(profileSelect).lean() as {
      name?: string
      email?: string
      emailVerified?: Date | null
      image?: string | null
      createdAt?: Date
      updatedAt?: Date
      deletedAt?: Date | null
      defaultCurrency?: string
      companyName?: string
      companyTagline?: string
      companyAddress?: string
      companyPhone?: string
      companyEmail?: string
      companyWebsite?: string
      taxId?: string
      paymentInfo?: string
      signatureText?: string
      invoiceColor?: string
      onboardingSurveyCompletedAt?: Date | null
      onboardingSurvey?: unknown
      otpEnabled?: boolean
      logoDataUrl?: string | null
      signatureDataUrl?: string | null
    } | null

    if (!row) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const hasLogo = typeof row.logoDataUrl === "string" && row.logoDataUrl.length > 0
    const hasSignatureImage = typeof row.signatureDataUrl === "string" && row.signatureDataUrl.length > 0

    const data = {
      id,
      name: row.name ?? null,
      email: row.email ?? null,
      emailVerified: row.emailVerified ? new Date(row.emailVerified).toISOString() : null,
      image: row.image ?? null,
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
      updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
      deletedAt: row.deletedAt ? new Date(row.deletedAt).toISOString() : null,
      status: row.deletedAt ? ("ARCHIVED" as const) : ("ACTIVE" as const),
      defaultCurrency: row.defaultCurrency ?? null,
      companyName: row.companyName ?? null,
      companyTagline: row.companyTagline ?? null,
      companyAddress: row.companyAddress ?? null,
      companyPhone: row.companyPhone ?? null,
      companyEmail: row.companyEmail ?? null,
      companyWebsite: row.companyWebsite ?? null,
      taxId: row.taxId ?? null,
      paymentInfo: row.paymentInfo ?? null,
      signatureText: row.signatureText ?? null,
      invoiceColor: row.invoiceColor ?? null,
      onboardingSurveyCompletedAt: row.onboardingSurveyCompletedAt
        ? new Date(row.onboardingSurveyCompletedAt).toISOString()
        : null,
      onboardingSurvey: row.onboardingSurvey ?? null,
      otpEnabled: Boolean(row.otpEnabled),
      hasLogo,
      hasSignatureImage,
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("[api/admin/users/[id] GET]", error)
    return NextResponse.json({ error: "Failed to load user" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authRes = await requireAdminUser()
    if ("error" in authRes) return authRes.error

    const session = await auth()
    const currentUserId = session?.user?.id ?? ""

    const { id } = await params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 })
    }

    const body = PatchBodySchema.parse(await request.json())

    if (body.action === "DEACTIVATE" && id === currentUserId) {
      return NextResponse.json({ error: "You cannot deactivate your current account." }, { status: 400 })
    }

    await getDb()

    const update =
      body.action === "DEACTIVATE"
        ? { $set: { deletedAt: new Date() } }
        : { $unset: { deletedAt: 1 } }

    const updated = await User.findByIdAndUpdate(id, update, { new: true })
      .select("name email deletedAt")
      .lean()

    if (!updated) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const u = updated as { _id: unknown; name?: string; email?: string; deletedAt?: Date | null }
    return NextResponse.json({
      data: {
        id: String(u._id),
        name: u.name ?? "Unnamed user",
        email: u.email ?? "",
        status: u.deletedAt ? "SOFT_DELETED" : "ACTIVE",
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: error.flatten() }, { status: 400 })
    }
    console.error("[api/admin/users/[id] PATCH]", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authRes = await requireAdminUser()
    if ("error" in authRes) return authRes.error

    const session = await auth()
    const currentUserId = session?.user?.id ?? ""

    const { id } = await params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 })
    }

    if (id === currentUserId) {
      return NextResponse.json({ error: "You cannot delete your current account." }, { status: 400 })
    }

    await getDb()
    const existing = await User.findById(id).select("_id").lean()
    if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const { deleted } = await deleteUserAndWorkspaceData(id)
    if (!deleted) {
      return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[api/admin/users/[id] DELETE]", error)
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}
