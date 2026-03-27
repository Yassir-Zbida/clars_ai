"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { cn } from "@/lib/utils"

type InsightsPayload = {
  generatedAt: string
  alerts: Array<{
    id: string
    severity: "danger" | "warning" | "info"
    title: string
    body: string
    href: string
  }>
  highlights: Array<{
    id: string
    label: string
    value: string
    hint: string
    href: string
    tone?: "positive" | "neutral" | "negative"
  }>
  suggestions: Array<{ id: string; title: string; body: string; href: string }>
  meta: { interactionsLast30Days: number; totalContacts: number }
}

const SEVERITY_STYLE = {
  danger:  { bg: "bg-red-500/5 border-red-500/25",    icon: "ri-error-warning-line text-red-400"  },
  warning: { bg: "bg-amber-500/5 border-amber-500/25", icon: "ri-alert-line text-amber-400"        },
  info:    { bg: "bg-blue-500/5 border-blue-500/20",   icon: "ri-information-line text-blue-400"   },
}

const TONE_STYLE = {
  positive: "border-emerald-500/25 bg-emerald-500/5",
  negative: "border-red-500/25 bg-red-500/5",
  neutral:  "border-input bg-card",
}

function SectionHeader({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-6 items-center justify-center rounded-md bg-muted">
        <i className={`${icon} text-xs text-muted-foreground`} />
      </span>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</h2>
    </div>
  )
}

export default function InsightsPage() {
  const { data, isLoading, isError, dataUpdatedAt } = useQuery({
    queryKey: ["dashboard", "insights"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/insights", { credentials: "include" })
      if (!res.ok) throw new Error("insights")
      const json = (await res.json()) as { data: InsightsPayload }
      return json.data
    },
  })

  return (
    <div className="flex flex-1 flex-col gap-5 px-4 pb-8 pt-0 lg:px-6">
      {dataUpdatedAt ? (
        <p className="text-[10px] text-muted-foreground/60">
          <i className="ri-time-line mr-1" />
          Updated {new Date(dataUpdatedAt).toLocaleString()}
        </p>
      ) : null}

      {isLoading ? (
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <i className="ri-loader-4-line animate-spin text-xl text-primary" />
          </span>
          <p className="text-sm text-muted-foreground">Generating insights…</p>
        </div>
      ) : isError || !data ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center">
          <i className="ri-error-warning-line text-2xl text-destructive" />
          <p className="text-sm text-muted-foreground">Could not load insights. Try again shortly.</p>
        </div>
      ) : (
        <>
          {/* ── Alerts ── */}
          <section className="space-y-3">
            <SectionHeader icon="ri-alarm-warning-line" label="Alerts" />
            {data.alerts.length === 0 ? (
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 px-5 py-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                  <i className="ri-shield-check-line text-base text-emerald-500" />
                </span>
                <p className="text-sm text-muted-foreground">
                  No critical alerts right now. Keep logging activity and keep invoices current.
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {data.alerts.map((a) => {
                  const s = SEVERITY_STYLE[a.severity]
                  return (
                    <div key={a.id} className={`rounded-2xl border px-5 py-4 ${s.bg}`}>
                      <div className="flex items-start gap-3">
                        <i className={`${s.icon} mt-0.5 shrink-0 text-lg`} />
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-semibold">{a.title}</p>
                          <p className="text-xs leading-relaxed text-muted-foreground">{a.body}</p>
                          <Link
                            href={a.href}
                            className="mt-2 inline-flex items-center gap-1 rounded-lg border border-input bg-card px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
                          >
                            Take action
                            <i className="ri-arrow-right-line text-xs opacity-60" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* ── Highlights ── */}
          <section className="space-y-3">
            <SectionHeader icon="ri-bar-chart-box-line" label="Highlights" />
            <div className="grid gap-3 sm:grid-cols-3">
              {data.highlights.map((h) => (
                <div
                  key={h.id}
                  className={cn(
                    "rounded-2xl border px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                    TONE_STYLE[h.tone ?? "neutral"]
                  )}
                >
                  <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{h.label}</p>
                  <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight">{h.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{h.hint}</p>
                  <Link
                    href={h.href}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary transition hover:underline"
                  >
                    Open
                    <i className="ri-arrow-right-line text-xs" />
                  </Link>
                </div>
              ))}
            </div>
          </section>

          {/* ── Suggestions ── */}
          <section className="space-y-3">
            <SectionHeader icon="ri-lightbulb-line" label="Suggestions" />
            {data.suggestions.length === 0 ? (
              <div className="rounded-2xl border border-input bg-card px-5 py-4">
                <p className="text-sm text-muted-foreground">You&apos;re on track — no extra suggestions for now.</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {data.suggestions.map((s) => (
                  <div key={s.id} className="rounded-2xl border border-input bg-card px-5 py-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10">
                        <i className="ri-lightbulb-flash-line text-sm text-amber-500" />
                      </span>
                      <p className="text-sm font-semibold">{s.title}</p>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{s.body}</p>
                    <Link
                      href={s.href}
                      className="mt-3 inline-flex items-center gap-1 rounded-lg border border-input bg-muted px-3 py-1.5 text-xs font-medium transition hover:bg-muted/80"
                    >
                      Go
                      <i className="ri-arrow-right-line text-xs opacity-60" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Workspace pulse ── */}
          <div className="rounded-2xl border border-input bg-card px-5 py-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
                <i className="ri-pulse-line text-sm text-primary" />
              </span>
              <p className="text-sm font-semibold">Workspace pulse</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.meta.interactionsLast30Days} interactions logged · {data.meta.totalContacts} contacts
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/dashboard/activity"
                className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
              >
                <i className="ri-time-line text-xs" />
                View activity feed
              </Link>
              <Link
                href="/dashboard/analytics"
                className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
              >
                <i className="ri-bar-chart-2-line text-xs" />
                Open analytics
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
