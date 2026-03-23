import mongoose from "mongoose"
import { Client } from "@/server/models/client"
import { serializeProjectLean } from "./_lib"

export type ProjectWithContacts = ReturnType<typeof serializeProjectLean> & {
  contacts: Array<{ id: string; name: string; email?: string | null }>
}

export async function enrichProjectsWithContacts(
  userId: string,
  rows: Record<string, unknown>[]
): Promise<ProjectWithContacts[]> {
  const idSet = new Set<string>()
  for (const row of rows) {
    if (row.clientId) idSet.add(String(row.clientId))
    const arr = row.assignedClientIds as unknown[] | undefined
    if (Array.isArray(arr)) {
      for (const x of arr) {
        const s = String(x)
        if (mongoose.Types.ObjectId.isValid(s)) idSet.add(s)
      }
    }
  }
  const ids = Array.from(idSet)
  const contactMap = new Map<string, { id: string; name: string; email?: string | null }>()
  if (ids.length) {
    const clients = await Client.find({
      userId: new mongoose.Types.ObjectId(userId),
      _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) },
      deletedAt: null,
    })
      .select("fullName email")
      .lean()

    for (const c of clients) {
      const doc = c as { _id: mongoose.Types.ObjectId; fullName?: string; email?: string }
      const id = doc._id.toString()
      contactMap.set(id, {
        id,
        name: doc.fullName?.trim() || "Unnamed contact",
        email: doc.email ?? null,
      })
    }
  }

  return rows.map((row) => {
    const base = serializeProjectLean(row)
    const order: string[] = []
    const arr = row.assignedClientIds as unknown[] | undefined
    if (Array.isArray(arr)) {
      for (const x of arr) {
        const s = String(x)
        if (mongoose.Types.ObjectId.isValid(s)) order.push(s)
      }
    }
    if (order.length === 0 && row.clientId) {
      const s = String(row.clientId)
      if (mongoose.Types.ObjectId.isValid(s)) order.push(s)
    }
    const unique = Array.from(new Set(order))
    const contacts = unique.map((cid) => contactMap.get(cid)).filter(Boolean) as Array<{
      id: string
      name: string
      email?: string | null
    }>
    return { ...base, contacts }
  })
}
