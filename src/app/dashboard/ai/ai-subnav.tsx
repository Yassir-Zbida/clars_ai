"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const LINKS = [
  { href: "/dashboard/ai", label: "Chat", end: true },
  { href: "/dashboard/ai/email", label: "Email" },
  { href: "/dashboard/ai/reports", label: "Reports" },
] as const

export function AiSubnav() {
  const pathname = usePathname()

  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-input bg-muted/20 p-1">
      {LINKS.map((item) => {
        const active = "end" in item && item.end ? pathname === item.href : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}
