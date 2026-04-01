"use client"

import Link from "next/link"
import { ArrowRightIcon, BookOpenIcon, KeyboardIcon, LifeBuoyIcon } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const CHANGELOG = [
  {
    version: "Mar 2026",
    items: [
      "Settings: profile name editing + demo data seed",
      "Finance: invoices, quotes, payments, expenses",
      "Analytics overview with revenue & expense charts",
      "AI Assistant (chat, email drafts, reports)",
      "Client pipeline, segments, and import",
    ],
  },
]

const WHERE_TO_WORK = [
  { label: "Contacts",     desc: "pipeline, follow-ups, interactions",      href: "/dashboard/clients",   icon: "ri-contacts-line",       iconBg: "bg-blue-500/10",   iconColor: "text-blue-500"   },
  { label: "Projects",     desc: "track work and progress per client",       href: "/dashboard/projects",  icon: "ri-folder-line",         iconBg: "bg-violet-500/10", iconColor: "text-violet-500" },
  { label: "Finance",      desc: "bill clients, record payments, expenses",  href: "/dashboard/finance",   icon: "ri-line-chart-line",     iconBg: "bg-emerald-500/10",iconColor: "text-emerald-600"},
  { label: "Analytics",    desc: "revenue, forecasts, productivity",         href: "/dashboard/analytics", icon: "ri-bar-chart-2-line",    iconBg: "bg-amber-500/10",  iconColor: "text-amber-500"  },
  { label: "AI Assistant", desc: "chat, email drafts, reports",              href: "/dashboard/ai",        icon: "ri-sparkling-line",      iconBg: "bg-primary/10",    iconColor: "text-primary"    },
]

const SHORTCUTS = [
  { keys: ["⌘", "K"], desc: "Focus sidebar search", action: () => document.getElementById("sidebar-search-input")?.focus() },
]

/* ── Shared section primitives ─────────────────────────────────── */
function SectionCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-input bg-card shadow-sm", className)}>
      {children}
    </div>
  )
}

function SectionHeader({
  icon, iconBg = "bg-primary/10", iconColor = "text-primary", title, description,
}: {
  icon: string; iconBg?: string; iconColor?: string; title: string; description?: string
}) {
  return (
    <div className="flex items-center gap-2.5 border-b border-input px-5 py-3.5">
      <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", iconBg)}>
        <i className={cn(icon, iconColor, "text-sm")} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-none">{title}</p>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>
    </div>
  )
}

export default function HelpPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-8 pt-0 lg:px-6">

      {/* Page header */}
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <i className="ri-question-line text-lg text-primary" />
        </span>
        <div>
          <h1 className="text-base font-semibold leading-none tracking-tight">Help</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Shortcuts, where to work, and recent product notes</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">

        {/* Shortcuts */}
        <SectionCard>
          <SectionHeader
            icon="ri-keyboard-line"
            iconBg="bg-muted"
            iconColor="text-muted-foreground"
            title="Shortcuts"
            description="Click a shortcut or press the keys"
          />
          <div className="space-y-2 px-5 py-4">
            {SHORTCUTS.map(({ keys, desc, action }) => (
              <button
                key={desc}
                type="button"
                onClick={action}
                className="flex w-full items-center justify-between rounded-xl border border-input bg-muted/20 px-3 py-2.5 text-xs transition-colors hover:bg-muted/40"
              >
                <span className="flex items-center gap-1.5">
                  <KeyboardIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">{desc}</span>
                </span>
                <span className="flex items-center gap-1">
                  {keys.map((k) => (
                    <kbd key={k} className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-foreground shadow-sm">
                      {k}
                    </kbd>
                  ))}
                </span>
              </button>
            ))}
            <p className="pt-1 text-xs text-muted-foreground">
              Use the sidebar to jump between any section quickly.
            </p>
          </div>
        </SectionCard>

        {/* Where to work */}
        <SectionCard>
          <SectionHeader
            icon="ri-map-pin-line"
            iconBg="bg-blue-500/10"
            iconColor="text-blue-500"
            title="Where to work"
            description="Click any section to go there directly"
          />
          <div className="space-y-1.5 px-5 py-4">
            {WHERE_TO_WORK.map(({ label, desc, href, icon, iconBg, iconColor }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center justify-between rounded-xl border border-input bg-muted/20 px-3 py-2.5 text-xs transition-colors hover:bg-muted/40"
              >
                <span className="flex items-center gap-2.5">
                  <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-lg", iconBg)}>
                    <i className={cn(icon, iconColor, "text-xs")} />
                  </span>
                  <span>
                    <span className="font-medium text-foreground">{label}</span>
                    <span className="ml-1.5 text-muted-foreground">— {desc}</span>
                  </span>
                </span>
                <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            ))}
            <div className="pt-2">
              <Link href="/dashboard/settings" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs")}>
                <i className="ri-settings-3-line mr-1.5 text-sm" />
                Account settings
              </Link>
            </div>
          </div>
        </SectionCard>

      </div>

      {/* Support */}
      <SectionCard>
        <SectionHeader
          icon="ri-customer-service-2-line"
          iconBg="bg-emerald-500/10"
          iconColor="text-emerald-600"
          title="Support"
          description="Get help or report an issue"
        />
        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Have a question or found a bug? Reach out directly and we&apos;ll get back to you.
          </p>
          <a
            href="mailto:support@clars.ai"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0 h-8 text-xs")}
          >
            <LifeBuoyIcon className="mr-1.5 size-3.5" />
            Contact support
          </a>
        </div>
      </SectionCard>

      {/* Changelog */}
      <SectionCard>
        <SectionHeader
          icon="ri-git-commit-line"
          iconBg="bg-violet-500/10"
          iconColor="text-violet-500"
          title="Changelog"
          description="High-level shipped capabilities"
        />
        <div className="space-y-4 px-5 py-4">
          {CHANGELOG.map((block) => (
            <div key={block.version}>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  {block.version}
                </span>
              </div>
              <ul className="mt-2.5 space-y-1.5 text-xs text-muted-foreground">
                {block.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary/60" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </SectionCard>

    </div>
  )
}
