import mongoose from "mongoose"

import { Account } from "@/server/models/account"
import { AiUsageEvent } from "@/server/models/ai-usage-event"
import { Client } from "@/server/models/client"
import { Contact } from "@/server/models/contact"
import { Expense } from "@/server/models/expense"
import { Interaction } from "@/server/models/interaction"
import { Invoice } from "@/server/models/invoice"
import { Payment } from "@/server/models/payment"
import { Project } from "@/server/models/project"
import { ProjectEvent } from "@/server/models/project-event"
import { ProjectNote } from "@/server/models/project-note"
import { ProjectTask } from "@/server/models/project-task"
import { Session } from "@/server/models/session"
import { User } from "@/server/models/user"

/**
 * Permanently removes a user and all workspace data scoped to that user.
 * Intended for admin-only use after access checks.
 */
export async function deleteUserAndWorkspaceData(userId: string): Promise<{ deleted: boolean }> {
  const uid = new mongoose.Types.ObjectId(userId)

  const invoices = await Invoice.find({ userId: uid }).select("_id").lean()
  const invIds = invoices.map((i) => i._id)
  if (invIds.length) {
    await Payment.deleteMany({ invoiceId: { $in: invIds } })
  }
  await Invoice.deleteMany({ userId: uid })
  await Expense.deleteMany({ userId: uid })
  await Interaction.deleteMany({ userId: uid })

  const projects = await Project.find({ userId: uid }).select("_id").lean()
  const projIds = projects.map((p) => p._id)
  if (projIds.length) {
    await ProjectTask.deleteMany({ projectId: { $in: projIds } })
    await ProjectEvent.deleteMany({ projectId: { $in: projIds } })
    await ProjectNote.deleteMany({ projectId: { $in: projIds } })
  }
  await Project.deleteMany({ userId: uid })

  const clients = await Client.find({ userId: uid }).select("_id").lean()
  const clientIds = clients.map((c) => c._id)
  if (clientIds.length) {
    await Contact.deleteMany({ clientId: { $in: clientIds } })
  }
  await Client.deleteMany({ userId: uid })

  await AiUsageEvent.deleteMany({ userId: uid })
  await Session.deleteMany({ userId: uid })
  await Account.deleteMany({ userId: uid })

  const res = await User.findByIdAndDelete(uid)
  return { deleted: Boolean(res) }
}
