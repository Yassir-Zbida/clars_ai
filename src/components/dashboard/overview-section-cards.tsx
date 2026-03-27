"use client"

import Link from "next/link"
import { formatCents } from "@/lib/money"
import { useCurrency } from "@/contexts/currency-context"
import type { AnalyticsOverviewData } from "@/components/dashboard/types"

function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null
  return Math.round(((current - previous) / previous) * 1000) / 10
}

function openProjectCount(projectsByStatus: Record<string, number>) {
  const keys = ["ACTIVE", "ON_HOLD", "DRAFT"] as const
  return keys.reduce((s, k) => s + (projectsByStatus[k] ?? 0), 0)
}

interface StatCardProps {
  icon: string
  iconBg: string
  iconColor: string
  label: string
  value: string
  badge?: React.ReactNode
  footer: React.ReactNode
  href: string
}

function StatCard({ icon, iconBg, iconColor, label, value, badge, footer, href }: StatCardProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-2xl border border-input bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30"
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <i className={`${icon} text-lg ${iconColor}`} />
        </span>
        {badge}
      </div>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
      </div>
      <div className="mt-auto border-t border-input pt-3 text-xs text-muted-foreground">{footer}</div>
    </Link>
  )
}

export function OverviewSectionCards({ data }: { data: AnalyticsOverviewData }) {
  const { currency } = useCurrency()
  const fmt = (cents: number) => formatCents(cents, currency)
  const { finance, productivity, revenueExpenseSeries, projectsByStatus } = data
  const series = revenueExpenseSeries
  const lastMonth = series.length >= 2 ? series[series.length - 1] : null
  const prevMonth = series.length >= 2 ? series[series.length - 2] : null
  const revMom = lastMonth && prevMonth ? pctChange(lastMonth.revenueCents, prevMonth.revenueCents) : null

  const unpaidInvoices = Object.entries(finance.statusBreakdown).reduce((s, [st, n]) => {
    if (st === "PAID" || st === "CANCELLED" || st === "DRAFT") return s
    return s + n
  }, 0)

  const openProjects = openProjectCount(projectsByStatus)

  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {/* Revenue */}
      <StatCard
        href="/dashboard/finance"
        icon="ri-money-euro-circle-line"
        iconBg="bg-emerald-500/10"
        iconColor="text-emerald-600 dark:text-emerald-400"
        label="Collected revenue (MTD)"
        value={fmt(finance.revenueMtdCents)}
        badge={
          revMom !== null ? (
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums ${
              revMom >= 0
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
            }`}>
              <i className={revMom >= 0 ? "ri-trending-up-line" : "ri-trending-down-line"} />
              {revMom >= 0 ? "+" : ""}{revMom}%
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-input px-2 py-0.5 text-[11px] text-muted-foreground">
              This month
            </span>
          )
        }
        footer={
          <>
            Net after expenses:{" "}
            <span className="font-medium text-foreground">{fmt(finance.netMtdCents)}</span>
            <span className="ml-1 opacity-60">from recorded payments</span>
          </>
        }
      />

      {/* Contacts */}
      <StatCard
        href="/dashboard/clients"
        icon="ri-group-line"
        iconBg="bg-blue-500/10"
        iconColor="text-blue-600 dark:text-blue-400"
        label="Contacts"
        value={String(productivity.totalClients)}
        badge={
          <span className="inline-flex items-center gap-1 rounded-full border border-input px-2 py-0.5 text-[11px] text-muted-foreground">
            <i className="ri-user-line text-xs" />
            CRM
          </span>
        }
        footer={
          <>
            <span className="font-medium text-foreground">{productivity.pipelineContacts}</span> in active pipeline
            <span className="mx-1 opacity-40">·</span>
            <span>{openProjects} open projects</span>
          </>
        }
      />

      {/* Outstanding */}
      <StatCard
        href="/dashboard/invoices"
        icon="ri-file-text-line"
        iconBg={finance.overdueCents > 0 ? "bg-amber-500/10" : "bg-violet-500/10"}
        iconColor={finance.overdueCents > 0 ? "text-amber-600 dark:text-amber-400" : "text-violet-600 dark:text-violet-400"}
        label="Outstanding on invoices"
        value={fmt(finance.outstandingCents)}
        badge={
          finance.overdueCents > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
              <i className="ri-error-warning-line" />
              Overdue {fmt(finance.overdueCents)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-input px-2 py-0.5 text-[11px] text-muted-foreground">
              <i className="ri-bank-card-line text-xs" />
              {unpaidInvoices} open
            </span>
          )
        }
        footer={
          <>
            <span className="font-medium text-foreground">{finance.invoiceCount}</span> total
            <span className="mx-1 opacity-40">·</span>
            <span className={unpaidInvoices > 0 ? "text-amber-600 dark:text-amber-400" : ""}>{unpaidInvoices} unpaid</span>
          </>
        }
      />

      {/* Activity */}
      <StatCard
        href="/dashboard/activity"
        icon="ri-pulse-line"
        iconBg="bg-primary/10"
        iconColor="text-primary"
        label="Activity (30 days)"
        value={String(productivity.interactionsLast30Days)}
        badge={
          <span className="inline-flex items-center gap-1 rounded-full border border-input px-2 py-0.5 text-[11px] text-muted-foreground">
            <i className="ri-checkbox-circle-line text-xs text-emerald-500" />
            Logged
          </span>
        }
        footer={
          <>
            <span className="font-medium text-foreground">Interactions &amp; touchpoints</span>
            <br />
            <span className="opacity-70">Keep logging calls, emails &amp; meetings</span>
          </>
        }
      />
    </div>
  )
}
