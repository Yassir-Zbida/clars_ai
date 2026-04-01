import { NextResponse } from "next/server"
import { mongoose, getDb } from "@/server/db"
import { requireAdminUser } from "@/app/api/admin/_lib"
import { User } from "@/server/models/user"
import { AdminReport } from "@/server/models/admin-report"
import { AiUsageEvent } from "@/server/models/ai-usage-event"
import { AdminStatusHistory } from "@/server/models/admin-status-history"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type CheckResult = {
  key: string
  label: string
  status: "pass" | "fail" | "warn"
  message: string
  ms?: number
}

async function time<T>(fn: () => Promise<T>): Promise<{ ms: number; value: T }> {
  const start = Date.now()
  const value = await fn()
  return { ms: Date.now() - start, value }
}

export async function GET(request: Request) {
  try {
    const authRes = await requireAdminUser()
    if ("error" in authRes) return authRes.error

    const checks: CheckResult[] = []

    // 1) Environment configuration checks (fast)
    const resendConfigured = Boolean(process.env.RESEND_API_KEY)
    checks.push({
      key: "email_provider",
      label: "Email provider (Resend)",
      status: resendConfigured ? "pass" : "warn",
      message: resendConfigured ? "RESEND_API_KEY configured" : "RESEND_API_KEY not set (emails won’t send; dev logs will show links)",
    })

    const aiConfigured = Boolean(
      process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY
    )
    checks.push({
      key: "ai_provider",
      label: "AI provider",
      status: aiConfigured ? "pass" : "warn",
      message: aiConfigured ? "AI provider key configured" : "No AI provider key set (AI features will fallback to offline templates)",
    })

    // 2) Database connectivity + ping
    try {
      const { ms } = await time(async () => {
        await getDb()
        const db = mongoose.connection.db
        if (!db) throw new Error("db not ready")
        await db.command({ ping: 1 })
      })
      checks.push({
        key: "db_ping",
        label: "Database ping",
        status: "pass",
        message: "MongoDB reachable",
        ms,
      })
    } catch (e) {
      checks.push({
        key: "db_ping",
        label: "Database ping",
        status: "fail",
        message: e instanceof Error ? e.message : "MongoDB ping failed",
      })
    }

    // 3) Core queries (prove models/collections work)
    try {
      const { ms, value } = await time(async () => {
        await getDb()
        const [users, activeUsers] = await Promise.all([
          User.countDocuments({}),
          User.countDocuments({ deletedAt: { $in: [null, undefined] } }),
        ])
        return { users, activeUsers }
      })
      checks.push({
        key: "query_users",
        label: "Users query",
        status: "pass",
        message: `${value.users.toLocaleString()} users (${value.activeUsers.toLocaleString()} active)`,
        ms,
      })
    } catch (e) {
      checks.push({
        key: "query_users",
        label: "Users query",
        status: "fail",
        message: e instanceof Error ? e.message : "Users query failed",
      })
    }

    try {
      const { ms, value } = await time(async () => {
        await getDb()
        const totalReports = await AdminReport.countDocuments({})
        return { totalReports }
      })
      checks.push({
        key: "query_reports",
        label: "Admin reports query",
        status: "pass",
        message: `${value.totalReports.toLocaleString()} admin reports`,
        ms,
      })
    } catch (e) {
      checks.push({
        key: "query_reports",
        label: "Admin reports query",
        status: "fail",
        message: e instanceof Error ? e.message : "Reports query failed",
      })
    }

    try {
      const { ms, value } = await time(async () => {
        await getDb()
        const total = await AiUsageEvent.countDocuments({})
        return { total }
      })
      checks.push({
        key: "query_ai_usage",
        label: "AI usage events",
        status: "pass",
        message: `${value.total.toLocaleString()} stored events`,
        ms,
      })
    } catch (e) {
      checks.push({
        key: "query_ai_usage",
        label: "AI usage events",
        status: "fail",
        message: e instanceof Error ? e.message : "AI usage query failed",
      })
    }

    // 4) API self-check (admin/dashboard)
    try {
      const origin = new URL(request.url).origin
      const cookie = request.headers.get("cookie") ?? ""
      const { ms, value: ok } = await time(async () => {
        const res = await fetch(`${origin}/api/admin/dashboard`, {
          headers: { cookie },
          cache: "no-store",
        })
        return res.ok
      })
      checks.push({
        key: "api_admin_dashboard",
        label: "Admin dashboard API",
        status: ok ? "pass" : "fail",
        message: ok ? "Responding" : "Failed response",
        ms,
      })
    } catch (e) {
      checks.push({
        key: "api_admin_dashboard",
        label: "Admin dashboard API",
        status: "fail",
        message: e instanceof Error ? e.message : "API self-check failed",
      })
    }

    const overall =
      checks.some((c) => c.status === "fail") ? "degraded" : checks.some((c) => c.status === "warn") ? "warning" : "healthy"

    const checkedAt = new Date().toISOString()
    const signature = JSON.stringify(checks.map((c) => [c.key, c.status]))
    const passCount = checks.filter((c) => c.status === "pass").length
    const warnCount = checks.filter((c) => c.status === "warn").length
    const failCount = checks.filter((c) => c.status === "fail").length

    const THREE_MIN_MS = 3 * 60 * 1000
    try {
      await getDb()
      const last = await AdminStatusHistory.findOne()
        .sort({ createdAt: -1 })
        .select("createdAt signature")
        .lean() as { createdAt: Date; signature: string } | null
      const elapsed = last ? Date.now() - new Date(last.createdAt).getTime() : Infinity
      const changed = !last || last.signature !== signature
      if (changed || elapsed >= THREE_MIN_MS) {
        await AdminStatusHistory.create({
          overall,
          signature,
          passCount,
          warnCount,
          failCount,
          checks: checks.map((c) => ({
            key: c.key,
            label: c.label,
            status: c.status,
            message: c.message.length > 400 ? `${c.message.slice(0, 397)}…` : c.message,
            ms: c.ms,
          })),
          recordedByEmail: authRes.email,
        })
      }
    } catch (e) {
      console.warn("[api/admin/status] history persist", e)
    }

    let history: Array<{
      id: string
      checkedAt: string
      overall: string
      passCount: number
      warnCount: number
      failCount: number
      checks: Array<{ key: string; label: string; status: string; message: string; ms?: number }>
    }> = []
    try {
      await getDb()
      const rows = await AdminStatusHistory.find().sort({ createdAt: -1 }).limit(50).lean()
      history = rows.map((row) => ({
        id: String(row._id),
        checkedAt: new Date(row.createdAt as Date).toISOString(),
        overall: row.overall as string,
        passCount: row.passCount,
        warnCount: row.warnCount,
        failCount: row.failCount,
        checks: row.checks as Array<{ key: string; label: string; status: string; message: string; ms?: number }>,
      }))
    } catch (e) {
      console.warn("[api/admin/status] history load", e)
    }

    return NextResponse.json({
      data: {
        overall,
        checkedAt,
        checks,
        history,
      },
    })
  } catch (error) {
    console.error("[api/admin/status GET]", error)
    return NextResponse.json({ error: "Failed to run status checks" }, { status: 500 })
  }
}

