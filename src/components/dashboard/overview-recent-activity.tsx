"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"

import type { ActivityItem } from "@/app/api/dashboard/activity/route"

const KIND_CONFIG: Record<ActivityItem["kind"], { icon: string; bg: string; color: string; label: string }> = {
  interaction: { icon: "ri-chat-check-line",     bg: "bg-blue-500/10",    color: "text-blue-500",    label: "Activity"  },
  payment:     { icon: "ri-money-euro-box-line",  bg: "bg-emerald-500/10", color: "text-emerald-500", label: "Payment"   },
  contact:     { icon: "ri-user-line",            bg: "bg-violet-500/10",  color: "text-violet-500",  label: "Contact"   },
  project:     { icon: "ri-folder-line",          bg: "bg-amber-500/10",   color: "text-amber-500",   label: "Project"   },
  invoice:     { icon: "ri-file-text-line",       bg: "bg-primary/10",     color: "text-primary",     label: "Invoice"   },
  expense:     { icon: "ri-receipt-line",         bg: "bg-red-500/10",     color: "text-red-500",     label: "Expense"   },
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export function OverviewRecentActivity() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard", "activity", "overview"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/activity?limit=8", { credentials: "include" })
      if (!res.ok) throw new Error("activity")
      const json = (await res.json()) as { data: ActivityItem[] }
      return json.data
    },
  })

  const rows = data ?? []

  return (
    <div className="mx-4 rounded-2xl border border-input bg-card shadow-sm lg:mx-6">
      {/* header */}
      <div className="flex items-center justify-between gap-3 border-b border-input px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
            <i className="ri-time-line text-sm text-primary" />
          </span>
          <div>
            <p className="text-sm font-semibold leading-none">Recent activity</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Latest updates across your workspace</p>
          </div>
        </div>
        <Link
          href="/dashboard/activity"
          className="inline-flex items-center gap-1 rounded-lg border border-input px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
        >
          Full feed
          <i className="ri-arrow-right-line text-xs opacity-60" />
        </Link>
      </div>

      {/* body */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
          <i className="ri-loader-4-line animate-spin text-base text-primary" />
          Loading activity…
        </div>
      ) : isError ? (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          <i className="ri-error-warning-line mr-1.5 text-destructive" />
          Could not load recent activity.
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
          <span className="flex size-10 items-center justify-center rounded-xl bg-muted">
            <i className="ri-time-line text-xl text-muted-foreground" />
          </span>
          <p className="text-sm font-medium text-muted-foreground">No events yet</p>
          <p className="text-xs text-muted-foreground/70">Add a contact or log an interaction to see activity here.</p>
        </div>
      ) : (
        <ul className="divide-y divide-input">
          {rows.map((item) => {
            const cfg = KIND_CONFIG[item.kind]
            return (
              <li key={item.id} className="group flex items-start gap-3 px-5 py-3 transition hover:bg-muted/40">
                <span className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg ${cfg.bg}`}>
                  <i className={`${cfg.icon} text-sm ${cfg.color}`} />
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={item.href}
                    className="block truncate text-sm font-medium text-foreground underline-offset-4 group-hover:underline"
                  >
                    {item.title}
                  </Link>
                  {item.subtitle && (
                    <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <span className="inline-block rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {cfg.label}
                  </span>
                  <p className="mt-0.5 text-[10px] text-muted-foreground/60">{timeAgo(item.at)}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
