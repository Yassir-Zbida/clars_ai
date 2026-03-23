"use client"

import Link from "next/link"
import { BookOpenIcon, KeyboardIcon, LifeBuoyIcon } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const CHANGELOG = [
  { version: "Mar 2025", items: ["Finance: invoices, payments, expenses", "Analytics overview", "AI Assistant (chat, email, reports)", "Automation: reminders, workflows, templates", "Simplified Settings, Billing, Help"] },
]

export default function HelpPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-8 pt-0 lg:px-6 lg:pt-0">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Help</h1>
        <p className="text-xs text-muted-foreground">Shortcuts, where to work, and recent product notes.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-input">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <KeyboardIcon className="size-4 text-muted-foreground" />
              Shortcuts
            </CardTitle>
            <CardDescription className="text-xs">From the sidebar search field.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘</kbd>{" "}
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">K</kbd> — focus
              search (when implemented)
            </p>
            <p>Use the sidebar to jump to Contacts, Projects, Finance, Analytics, AI, and Automation.</p>
          </CardContent>
        </Card>

        <Card className="border-input">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <BookOpenIcon className="size-4 text-muted-foreground" />
              Where to work
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <ul className="list-inside list-disc space-y-1">
              <li>
                <strong className="text-foreground">Contacts</strong> — pipeline, follow-ups, interactions
              </li>
              <li>
                <strong className="text-foreground">Finance</strong> — bill clients, record payments, expenses
              </li>
              <li>
                <strong className="text-foreground">Insights & Activity</strong> — priorities and timeline
              </li>
            </ul>
            <Link href="/dashboard/settings" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-2 inline-flex h-8 text-xs")}>
              Account settings
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="border-input">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <LifeBuoyIcon className="size-4 text-muted-foreground" />
            Support
          </CardTitle>
          <CardDescription className="text-xs">No separate docs or ticket DB in this build.</CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          <p>
            For production, point this block at your support email or help desk. Configure AI keys in{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">.env</code> for live assistant replies.
          </p>
        </CardContent>
      </Card>

      <Card className="border-input">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Changelog</CardTitle>
          <CardDescription className="text-xs">High-level shipped capabilities (not stored in the database).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {CHANGELOG.map((block) => (
            <div key={block.version}>
              <p className="text-xs font-semibold text-foreground">{block.version}</p>
              <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
