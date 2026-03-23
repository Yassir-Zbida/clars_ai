import mongoose from "mongoose"
import { Client } from "@/server/models/client"

export async function assertClientsOwnedByUser(userId: string, clientIds: mongoose.Types.ObjectId[]) {
  if (!clientIds.length) return
  const count = await Client.countDocuments({
    userId: new mongoose.Types.ObjectId(userId),
    _id: { $in: clientIds },
    deletedAt: null,
  })
  if (count !== clientIds.length) {
    const err = new Error("One or more contacts are invalid or do not belong to your account")
    err.name = "ContactAssignmentError"
    throw err
  }
}
