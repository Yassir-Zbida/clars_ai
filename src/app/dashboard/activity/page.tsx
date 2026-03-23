"use client"

import type { LucideIcon } from "lucide-react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import {
  BanknoteIcon,
  FileTextIcon,
  FolderKanbanIcon,
  Loader2,
  MessageSquareIcon,
  ReceiptIcon,
  UserPlusIcon,
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ActivityKind = "interaction" | "payment" | "contact" | "project" | "invoice" | "expense"

type ActivityItem = {
  id: string
  kind: ActivityKind
  title: string
  subtitle: string | null
  at: string
  href: string
}

const KIND_META: Record<ActivityKind, { label: string; Icon: LucideIcon }> = {
  interaction: { label: "Activity", Icon: MessageSquareIcon },
  payment: { label: "Payment", Icon: BanknoteIcon },
  contact: { label: "Contact", Icon: UserPlusIcon },
  project: { label: "Project", Icon: FolderKanbanIcon },
  invoice: { label: "Billing", Icon: FileTextIcon },
  expense: { label: "Expense", Icon: ReceiptIcon },
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
    <div className="flex flex-1 flex-col gap-4 px-4 pb-8 pt-0 lg:px-6 lg:pt-0">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Activity feed</h1>
          <p className="text-xs text-muted-foreground">
            A unified timeline of contacts, projects, billing, and logged touchpoints.
          </p>
        </div>
        <Link href="/dashboard/insights" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 w-fit text-xs")}>
          Smart insights
        </Link>
      </div>

      <Card className="border-input">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recent events</CardTitle>
          <CardDescription className="text-xs">Newest first · last 60 items</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-5 animate-spin" />
              Loading activity…
            </div>
          ) : isError ? (
            <p className="text-sm text-muted-foreground">Unable to load the feed.</p>
          ) : rows.length === 0 ? (
            <div className="space-y-2 py-6 text-center text-sm text-muted-foreground">
              <p>No activity yet.</p>
              <p className="text-xs">Add contacts, log interactions, or create an invoice to populate this feed.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((item) => {
                const meta = KIND_META[item.kind]
                const Icon = meta.Icon
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="flex gap-3 py-3 transition-colors hover:bg-muted/30 sm:gap-4 sm:rounded-lg sm:px-2"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted/80">
                        <Icon className="size-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {meta.label}
                          </span>
                          <time className="text-[10px] text-muted-foreground" dateTime={item.at}>
                            {new Date(item.at).toLocaleString()}
                          </time>
                        </div>
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        {item.subtitle ? (
                          <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                        ) : null}
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
