"use client"

import Link from "next/link"
import { BellIcon, FileTextIcon, GitBranchIcon } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const CARDS = [
  {
    href: "/dashboard/automation/reminders",
    title: "Smart reminders",
    desc: "See upcoming and overdue contact follow-ups based on next follow-up dates.",
    Icon: BellIcon,
  },
  {
    href: "/dashboard/automation/workflows",
    title: "Workflows",
    desc: "Define trigger → action pairs (in-app, templates). Rules are stored for future automation runs.",
    Icon: GitBranchIcon,
  },
  {
    href: "/dashboard/automation/templates",
    title: "Templates",
    desc: "Snippets for email, LinkedIn, SMS, and notes with merge-friendly placeholders.",
    Icon: FileTextIcon,
  },
] as const

export default function AutomationOverviewPage() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {CARDS.map(({ href, title, desc, Icon }) => (
        <Card key={href} className="border-input">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Icon className="size-4 text-amber-400" />
              {title}
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed">{desc}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={href} className={cn(buttonVariants({ size: "sm" }), "h-8 text-xs")}>
              Open
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
