import mongoose from "mongoose"
import { NextResponse } from "next/server"
import { getDb } from "@/server/db"
import { Invoice } from "@/server/models/invoice"
import { Payment } from "@/server/models/payment"
import { requireUserId } from "../finance/_lib"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const authRes = await requireUserId()
    if ("error" in authRes) return authRes.error
    await getDb()

    const uid = new mongoose.Types.ObjectId(authRes.userId)
    const { searchParams } = new URL(request.url)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 40))

    const invIds = await Invoice.find({ userId: uid, deletedAt: null }).distinct("_id")
    if (!invIds.length) return NextResponse.json({ data: [] })

    const rows = await Payment.find({ invoiceId: { $in: invIds } })
      .sort({ paidAt: -1 })
      .limit(limit)
      .lean()

    const invMap = new Map<string, { number?: string; clientId?: string }>()
    const invoices = await Invoice.find({ _id: { $in: rows.map((p) => p.invoiceId) } })
      .select("number clientId")
      .lean()
    for (const inv of invoices) {
      invMap.set(String(inv._id), {
        number: (inv as { number?: string }).number,
        clientId: (inv as { clientId?: mongoose.Types.ObjectId }).clientId?.toString(),
      })
    }

    const data = rows.map((p) => {
      const meta = invMap.get(String(p.invoiceId))
      return {
        id: String(p._id),
        invoiceId: String(p.invoiceId),
        invoiceNumber: meta?.number ?? null,
        clientId: meta?.clientId ?? null,
        amountCents: p.amountCents,
        method: p.method ?? null,
        reference: p.reference ?? null,
        paidAt: p.paidAt instanceof Date ? p.paidAt.toISOString() : p.paidAt,
        createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
      }
    })

    return NextResponse.json({ data })
  } catch (error) {
    console.error("[api/payments GET]", error)
    return NextResponse.json({ error: "Failed to list payments" }, { status: 500 })
  }
}
