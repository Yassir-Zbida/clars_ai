"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

const STORAGE_KEY = "clars_intro_dismissed"

const QUICK_LINKS = [
  { href: "/dashboard/clients",  icon: "ri-group-line",        label: "Contacts"         },
  { href: "/dashboard/projects", icon: "ri-folder-line",       label: "Projects"         },
  { href: "/dashboard/invoices", icon: "ri-file-text-line",    label: "Invoices"         },
  { href: "/dashboard/finance",  icon: "ri-bank-card-line",    label: "Finance"          },
  { href: "/dashboard/ai",       icon: "ri-sparkling-2-line",  label: "Clars Assistant"  },
] as const

export function OverviewIntro() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(localStorage.getItem(STORAGE_KEY) !== "1")
  }, [])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1")
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="relative overflow-hidden rounded-2xl border border-input bg-card px-6 py-5 shadow-sm">
      {/* subtle background accent */}
      <div className="pointer-events-none absolute right-0 top-0 h-full w-64 bg-gradient-to-l from-primary/5 to-transparent" />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        {/* left — heading */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
              <i className="ri-layout-grid-line text-sm text-primary" />
            </span>
            <h2 className="text-base font-semibold tracking-tight">Welcome to Clars.ai</h2>
          </div>
          <p className="max-w-xl text-sm text-muted-foreground leading-relaxed">
            Your workspace for{" "}
            <strong className="font-medium text-foreground">contacts</strong>,{" "}
            <strong className="font-medium text-foreground">projects</strong>,{" "}
            <strong className="font-medium text-foreground">invoicing &amp; payments</strong>, and{" "}
            <strong className="font-medium text-foreground">AI-assisted insights</strong>.
            Track pipeline health, cash flow, and activity — all in one place.
          </p>
        </div>

        {/* right — actions */}
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/dashboard/insights"
            className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-xs transition hover:bg-muted"
          >
            <i className="ri-sparkling-2-line text-sm text-violet-400" />
            Smart insights
            <i className="ri-arrow-right-line text-xs opacity-60" />
          </Link>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss banner"
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <i className="ri-close-line text-base" />
          </button>
        </div>
      </div>

      {/* quick-access strip */}
      <div className="relative mt-4 flex flex-wrap gap-2">
        {QUICK_LINKS.map(({ href, icon, label }) => (
          <Link
            key={href}
            href={href}
            className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-muted/50 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted hover:border-primary/30"
          >
            <i className={`${icon} text-sm text-muted-foreground`} />
            {label}
          </Link>
        ))}
      </div>
    </div>
  )
}
