import { getDb } from "@/server/db"
import { Interaction } from "@/server/models/interaction"
import { Invoice } from "@/server/models/invoice"
import { ProjectTask } from "@/server/models/project-task"
import { User } from "@/server/models/user"

export type AdminDashboardData = {
  generatedAt: string
  overview: {
    totalUsers: number
    activeUsers: number
    softDeletedUsers: number
    newUsers30d: number
    newUsers7d: number
    surveyCompleted: number
    surveySkipped: number
    responseRate: number
    overdueInvoices: number
    overdueInvoices7d: number
    releaseQuality: { authHealth: number; surveyHealth: number; runtimeHealth: number }
  }
  series: {
    signupsByDay: Array<{ label: string; count: number }>
    surveysByDay: Array<{ label: string; count: number }>
    alertsByDay: Array<{ label: string; count: number }>
  }
  logs: {
    incidents: Array<{
      key: string
      service: string
      level: "critical" | "warning" | "info"
      message: string
      count: number
    }>
  }
  surveys: {
    responseRate: number
    totalCompleted: number
    skipped: number
    heard: Array<{ key: string; count: number }>
    comments: string[]
  }
  aiAnalytics: {
    aiProviderConfigured: boolean
    activeEditors30d: number
    interactions30d: number
    interactions7d: number
    proposal30d: number
    email30d: number
    note30d: number
  }
}

/** Shared snapshot for admin dashboard UI and scheduled / manual reports (no HTTP hop). */
export async function computeAdminDashboardData(): Promise<AdminDashboardData> {
  await getDb()
  const now = new Date()
  const last30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const last7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const days: Array<{ key: string; start: Date; end: Date }> = Array.from({ length: 14 }).map((_, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (13 - idx))
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
    const key = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`
    return { key, start, end }
  })

  const [totalUsers, activeUsers, softDeletedUsers, newUsers30d, newUsers7d] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ deletedAt: { $in: [null, undefined] } }),
    User.countDocuments({ deletedAt: { $ne: null } }),
    User.countDocuments({ createdAt: { $gte: last30 } }),
    User.countDocuments({ createdAt: { $gte: last7 } }),
  ])

  const [surveyCompleted, surveySkipped, surveyCommentsRaw, heardRaw] = await Promise.all([
    User.countDocuments({
      deletedAt: { $in: [null, undefined] },
      onboardingSurveyCompletedAt: { $exists: true, $ne: null },
    }),
    User.countDocuments({
      deletedAt: { $in: [null, undefined] },
      onboardingSurveyCompletedAt: { $exists: true, $ne: null },
      "onboardingSurvey.skipped": true,
    }),
    User.find({
      deletedAt: { $in: [null, undefined] },
      onboardingSurveyCompletedAt: { $exists: true, $ne: null },
      "onboardingSurvey.comments": { $exists: true, $type: "string", $ne: "" },
    })
      .select("onboardingSurvey onboardingSurveyCompletedAt")
      .sort({ onboardingSurveyCompletedAt: -1 })
      .limit(5)
      .lean(),
    User.aggregate<{ _id: string; count: number }>([
      {
        $match: {
          deletedAt: { $in: [null, undefined] },
          onboardingSurveyCompletedAt: { $exists: true, $ne: null },
          "onboardingSurvey.howHeard": { $exists: true, $ne: null },
        },
      },
      { $group: { _id: "$onboardingSurvey.howHeard", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ])

  const [overdueInvoices, pendingPasswordResets, overdueTasks, overdueInvoices7d] = await Promise.all([
    Invoice.countDocuments({
      deletedAt: null,
      documentType: "INVOICE",
      dueDate: { $lt: now },
      status: { $in: ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"] },
    }),
    User.countDocuments({
      deletedAt: { $in: [null, undefined] },
      passwordResetTokenExpiry: { $gt: now },
    }),
    ProjectTask.countDocuments({
      dueDate: { $lt: now },
      status: { $nin: ["DONE"] },
    }),
    Invoice.countDocuments({
      deletedAt: null,
      documentType: "INVOICE",
      dueDate: { $gte: last7, $lt: now },
      status: { $in: ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"] },
    }),
  ])

  const [interactions30d, proposal30d, email30d, note30d, activeEditors30d, interactions7d] = await Promise.all([
    Interaction.countDocuments({
      $or: [{ date: { $gte: last30 } }, { createdAt: { $gte: last30 } }],
    }),
    Interaction.countDocuments({
      type: "PROPOSAL",
      $or: [{ date: { $gte: last30 } }, { createdAt: { $gte: last30 } }],
    }),
    Interaction.countDocuments({
      type: "EMAIL",
      $or: [{ date: { $gte: last30 } }, { createdAt: { $gte: last30 } }],
    }),
    Interaction.countDocuments({
      type: "NOTE",
      $or: [{ date: { $gte: last30 } }, { createdAt: { $gte: last30 } }],
    }),
    User.countDocuments({
      deletedAt: { $in: [null, undefined] },
      updatedAt: { $gte: last30 },
    }),
    Interaction.countDocuments({
      $or: [{ date: { $gte: last7 } }, { createdAt: { $gte: last7 } }],
    }),
  ])

  const [signupsByDay, surveysByDay, alertsByDay] = await Promise.all([
    Promise.all(
      days.map(async (d) => ({
        label: d.key,
        count: await User.countDocuments({ createdAt: { $gte: d.start, $lte: d.end } }),
      }))
    ),
    Promise.all(
      days.map(async (d) => ({
        label: d.key,
        count: await User.countDocuments({ onboardingSurveyCompletedAt: { $gte: d.start, $lte: d.end } }),
      }))
    ),
    Promise.all(
      days.map(async (d) => ({
        label: d.key,
        count:
          (await Invoice.countDocuments({
            deletedAt: null,
            documentType: "INVOICE",
            dueDate: { $gte: d.start, $lte: d.end },
            status: { $in: ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"] },
          })) +
          (await ProjectTask.countDocuments({
            dueDate: { $gte: d.start, $lte: d.end },
            status: { $nin: ["DONE"] },
          })),
      }))
    ),
  ])

  const comments = surveyCommentsRaw
    .map((u) => ((u as { onboardingSurvey?: { comments?: string } }).onboardingSurvey?.comments ?? "").trim())
    .filter(Boolean)
    .slice(0, 3)

  const heard = heardRaw.map((x) => ({ key: x._id, count: x.count }))

  const responseRate = activeUsers > 0 ? Math.round((surveyCompleted / activeUsers) * 100) : 0
  const surveyHealth = Math.max(0, Math.min(100, responseRate))
  const authHealth = Math.max(0, 100 - Math.min(40, pendingPasswordResets * 3))
  const runtimeHealth = Math.max(0, 100 - Math.min(50, overdueInvoices * 2 + overdueTasks))

  return {
    generatedAt: now.toISOString(),
    overview: {
      totalUsers,
      activeUsers,
      softDeletedUsers,
      newUsers30d,
      newUsers7d,
      surveyCompleted,
      surveySkipped,
      responseRate,
      overdueInvoices,
      overdueInvoices7d,
      releaseQuality: {
        authHealth,
        surveyHealth,
        runtimeHealth,
      },
    },
    series: {
      signupsByDay,
      surveysByDay,
      alertsByDay,
    },
    logs: {
      incidents: [
        {
          key: "overdue_invoices",
          service: "billing",
          level: overdueInvoices > 10 ? "critical" : overdueInvoices > 0 ? "warning" : "info",
          message: "Overdue invoices awaiting recovery",
          count: overdueInvoices,
        },
        {
          key: "password_resets",
          service: "auth",
          level: pendingPasswordResets > 25 ? "warning" : "info",
          message: "Active password reset requests",
          count: pendingPasswordResets,
        },
        {
          key: "overdue_tasks",
          service: "projects",
          level: overdueTasks > 15 ? "warning" : "info",
          message: "Overdue open tasks",
          count: overdueTasks,
        },
      ],
    },
    surveys: {
      responseRate,
      totalCompleted: surveyCompleted,
      skipped: surveySkipped,
      heard,
      comments,
    },
    aiAnalytics: {
      aiProviderConfigured: Boolean(process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY),
      activeEditors30d,
      interactions30d,
      interactions7d,
      proposal30d,
      email30d,
      note30d,
    },
  }
}
