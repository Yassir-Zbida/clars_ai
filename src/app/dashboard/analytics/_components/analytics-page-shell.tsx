"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** KPI tile — matches analytics overview: `rounded-2xl border border-input bg-card`, optional success/danger tone. */
export function KpiCard({
  title,
  value,
  hint,
  icon,
  iconBg,
  iconColor,
  tone = "default",
  footer,
}: {
  title: string
  value: string
  hint: string
  icon: string
  iconBg: string
  iconColor: string
  tone?: "default" | "success" | "danger"
  footer?: ReactNode
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-4 shadow-sm",
        tone === "danger" ? "border-red-500/20 bg-red-500/5" : tone === "success" ? "border-emerald-500/20 bg-emerald-500/5" : "border-input"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          {footer ? <div className="mt-2">{footer}</div> : null}
        </div>
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", iconBg)}>
          <i className={cn(icon, iconColor, "text-lg leading-none")} />
        </span>
      </div>
    </div>
  )
}

/** Section card matching Finance/Contacts: `rounded-2xl border border-input bg-card shadow-sm`. */
export function SectionCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-input bg-card shadow-sm", className)}>
      {children}
    </div>
  )
}

/** Section header row matching Finance pattern: icon + title + optional description + optional action. */
export function SectionHeader({
  icon,
  iconBg = "bg-blue-500/10",
  iconColor = "text-blue-500",
  title,
  description,
  action,
  divider = true,
}: {
  icon: string
  iconBg?: string
  iconColor?: string
  title: ReactNode
  description?: string
  action?: ReactNode
  /** When false, no bottom border (e.g. header card sits above sibling tiles). */
  divider?: boolean
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 px-5 py-3.5",
        divider && "border-b border-input"
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", iconBg)}>
          <i className={cn(icon, iconColor, "text-sm")} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-none">{title}</p>
          {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

/** Spinner for loading states — matches Finance/Contacts. */
export function AnalyticsLoading({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 py-8">
      <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
        <i className="ri-loader-4-line animate-spin text-xl text-primary" />
      </span>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

/** Error state. */
export function AnalyticsError({ message }: { message: string }) {
  return (
    <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 py-8 text-center">
      <i className="ri-error-warning-line text-2xl text-destructive" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
