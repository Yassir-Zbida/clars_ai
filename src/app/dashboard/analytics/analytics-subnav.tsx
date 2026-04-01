"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const LINKS = [
  { href: "/dashboard/analytics", label: "Overview", end: true },
  { href: "/dashboard/analytics/revenue", label: "Revenue" },
  { href: "/dashboard/analytics/clients", label: "Contacts" },
  { href: "/dashboard/analytics/productivity", label: "Productivity" },
  { href: "/dashboard/analytics/forecast", label: "Forecast", badge: "AI" },
] as const

export function AnalyticsSubnav() {
  const pathname = usePathname()

  return (
    <div className="flex flex-wrap gap-1.5">
      {LINKS.map((item) => {
        const active =
          "end" in item && item.end ? pathname === item.href : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition",
              active
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-input bg-card text-foreground hover:bg-muted"
            )}
          >
            {item.label}
            {"badge" in item && item.badge ? (
              <span className="rounded-full bg-violet-500/15 px-1.5 text-[10px] font-medium text-violet-600 dark:text-violet-400">
                {item.badge}
              </span>
            ) : null}
          </Link>
        )
      })}
    </div>
  )
}
