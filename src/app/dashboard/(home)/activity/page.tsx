"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"

type ActivityKind = "interaction" | "payment" | "contact" | "project" | "invoice" | "expense"

type ActivityItem = {
  id: string
  kind: ActivityKind
  title: string
  subtitle: string | null
  at: string
  href: string
}

const KIND_CONFIG: Record<ActivityKind, { label: string; icon: string; bg: string; color: string }> = {
  interaction: { label: "Activity",  icon: "ri-chat-check-line",    bg: "bg-blue-500/10",    color: "text-blue-500"    },
  payment:     { label: "Payment",   icon: "ri-money-euro-box-line", bg: "bg-emerald-500/10", color: "text-emerald-500" },
  contact:     { label: "Contact",   icon: "ri-user-add-line",       bg: "bg-violet-500/10",  color: "text-violet-500"  },
  project:     { label: "Project",   icon: "ri-folder-line",         bg: "bg-amber-500/10",   color: "text-amber-500"   },
  invoice:     { label: "Billing",   icon: "ri-file-text-line",      bg: "bg-primary/10",     color: "text-primary"     },
  expense:     { label: "Expense",   icon: "ri-receipt-line",        bg: "bg-red-500/10",     color: "text-red-500"     },
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
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

export default function ActivityPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard", "activity"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/activity?limit=60", { credentials: "include" })
      if (!res.ok) throw new Error("activity")
      const json = (await res.json()) as { data: ActivityItem[] }
      return json.data
    },
  })

  const rows = data ?? []

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-8 pt-0 lg:px-6">

      {/* header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Newest events first · unified timeline across contacts, projects, billing, and touchpoints.
        </p>
        <Link
          href="/dashboard/insights"
          className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
        >
          <i className="ri-sparkling-2-line text-sm text-violet-400" />
          Smart insights
          <i className="ri-arrow-right-line text-xs opacity-60" />
        </Link>
      </div>

      {/* main card */}
      <div className="rounded-2xl border border-input bg-card shadow-sm">

        {/* card header */}
        <div className="flex items-center justify-between gap-3 border-b border-input px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
              <i className="ri-time-line text-sm text-primary" />
            </span>
            <div>
              <p className="text-sm font-semibold leading-none">Recent events</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Showing up to 60 items</p>
            </div>
          </div>
          {!isLoading && !isError && rows.length > 0 && (
            <span className="rounded-full border border-input bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {rows.length}
            </span>
          )}
        </div>

        {/* body */}
        {isLoading ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <i className="ri-loader-4-line animate-spin text-xl text-primary" />
            </span>
            <p className="text-sm text-muted-foreground">Loading activity…</p>
          </div>
        ) : isError ? (
          <div className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
            <i className="ri-error-warning-line text-destructive" />
            Unable to load the feed.
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <span className="flex size-10 items-center justify-center rounded-xl bg-muted">
              <i className="ri-time-line text-xl text-muted-foreground" />
            </span>
            <p className="text-sm font-medium text-muted-foreground">No activity yet</p>
            <p className="max-w-xs text-xs text-muted-foreground/70">
              Add contacts, log interactions, or create an invoice to populate this feed.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-input">
            {rows.map((item) => {
              const cfg = KIND_CONFIG[item.kind]
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="group flex items-start gap-3 px-5 py-3.5 transition hover:bg-muted/40"
                  >
                    <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${cfg.bg}`}>
                      <i className={`${cfg.icon} text-sm ${cfg.color}`} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                          {cfg.label}
                        </span>
                        <time className="text-[10px] text-muted-foreground/60" dateTime={item.at}>
                          {new Date(item.at).toLocaleString()}
                        </time>
                      </div>
                      <p className="truncate text-sm font-medium text-foreground group-hover:underline underline-offset-4">
                        {item.title}
                      </p>
                      {item.subtitle && (
                        <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground/50 pt-1">
                      {timeAgo(item.at)}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
