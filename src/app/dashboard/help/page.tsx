"use client"

import Link from "next/link"
import { BookOpenIcon, KeyboardIcon, LifeBuoyIcon, ArrowRightIcon } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const CHANGELOG = [
  {
    version: "Mar 2026",
    items: [
      "Settings: profile name editing + demo data seed",
      "Finance: invoices, quotes, payments, expenses",
      "Analytics overview with revenue & expense charts",
      "AI Assistant (chat, email drafts, reports)",
      "Automation: reminders, workflows, message templates",
      "Client pipeline, segments, and import",
    ],
  },
]

const WHERE_TO_WORK = [
  { label: "Contacts", desc: "pipeline, follow-ups, interactions", href: "/dashboard/clients" },
  { label: "Projects", desc: "track work and progress per client", href: "/dashboard/projects" },
  { label: "Finance", desc: "bill clients, record payments, expenses", href: "/dashboard/finance" },
  { label: "Analytics", desc: "revenue, forecasts, productivity", href: "/dashboard/analytics" },
  { label: "AI Assistant", desc: "chat, email drafts, reports", href: "/dashboard/ai" },
  { label: "Automation", desc: "reminders, workflows, templates", href: "/dashboard/automation" },
]

const SHORTCUTS = [
  { keys: ["⌘", "K"], desc: "Focus sidebar search", action: () => document.getElementById("sidebar-search-input")?.focus() },
]

export default function HelpPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-8 pt-0 lg:px-6 lg:pt-0">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Help</h1>
        <p className="text-xs text-muted-foreground">Shortcuts, where to work, and recent product notes.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Shortcuts */}
        <Card className="border-input">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <KeyboardIcon className="size-4 text-muted-foreground" />
              Shortcuts
            </CardTitle>
            <CardDescription className="text-xs">Click a shortcut or press the keys.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {SHORTCUTS.map(({ keys, desc, action }) => (
              <button
                key={desc}
                type="button"
                onClick={action}
                className="flex w-full items-center justify-between rounded-lg border border-input bg-muted/20 px-3 py-2 text-xs transition-colors hover:bg-muted/40"
              >
                <span className="text-muted-foreground">{desc}</span>
                <span className="flex items-center gap-1">
                  {keys.map((k) => (
                    <kbd key={k} className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-foreground shadow-sm">
                      {k}
                    </kbd>
                  ))}
                </span>
              </button>
            ))}
            <p className="pt-1 text-[11px] text-muted-foreground">
              Use the sidebar to jump between any section quickly.
            </p>
          </CardContent>
        </Card>

        {/* Where to work */}
        <Card className="border-input">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <BookOpenIcon className="size-4 text-muted-foreground" />
              Where to work
            </CardTitle>
            <CardDescription className="text-xs">Click any section to go there directly.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {WHERE_TO_WORK.map(({ label, desc, href }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center justify-between rounded-lg border border-input bg-muted/20 px-3 py-2 text-xs transition-colors hover:bg-muted/40"
              >
                <span>
                  <span className="font-medium text-foreground">{label}</span>
                  <span className="ml-1.5 text-muted-foreground">— {desc}</span>
                </span>
                <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            ))}
            <div className="pt-1">
              <Link href="/dashboard/settings" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs")}>
                Account settings
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Support */}
      <Card className="border-input">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <LifeBuoyIcon className="size-4 text-muted-foreground" />
            Support
          </CardTitle>
          <CardDescription className="text-xs">Get help or report an issue.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Have a question or found a bug? Reach out directly and we&apos;ll get back to you.
          </p>
          <a
            href="mailto:support@clars.ai"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0 h-8 text-xs")}
          >
            Contact support
          </a>
        </CardContent>
      </Card>

      {/* Changelog */}
      <Card className="border-input">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Changelog</CardTitle>
          <CardDescription className="text-xs">High-level shipped capabilities.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {CHANGELOG.map((block) => (
            <div key={block.version}>
              <p className="text-xs font-semibold text-foreground">{block.version}</p>
              <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
                {block.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 size-1 shrink-0 rounded-full bg-primary/60" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
