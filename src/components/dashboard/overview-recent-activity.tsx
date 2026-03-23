"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { ArrowRightIcon, Loader2 } from "lucide-react"

import type { ActivityItem } from "@/app/api/dashboard/activity/route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const KIND_LABEL: Record<ActivityItem["kind"], string> = {
  interaction: "Activity",
  payment: "Payment",
  contact: "Contact",
  project: "Project",
  invoice: "Billing",
  expense: "Expense",
}

export function OverviewRecentActivity() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard", "activity", "overview"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/activity?limit=10", { credentials: "include" })
      if (!res.ok) throw new Error("activity")
      const json = (await res.json()) as { data: ActivityItem[] }
      return json.data
    },
  })

  const rows = data ?? []

  return (
    <Card className="mx-4 border-input lg:mx-6">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0 pb-2">
        <div>
          <CardTitle className="text-base">Recent activity</CardTitle>
          <CardDescription className="text-xs">
            Latest updates across your workspace—same feed as Activity, shortened for overview.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs" render={<Link href="/dashboard/activity" />}>
          Full feed
          <ArrowRightIcon className="size-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Loading…
          </div>
        ) : isError ? (
          <p className="text-muted-foreground px-6 py-4 text-sm">Could not load recent activity.</p>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground px-6 py-6 text-center text-sm">
            No events yet. Add a contact or log an interaction to see activity here.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[100px] pl-6 text-xs">Type</TableHead>
                <TableHead className="text-xs">Summary</TableHead>
                <TableHead className="hidden w-[160px] text-xs sm:table-cell">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((item) => (
                <TableRow key={item.id} className="group">
                  <TableCell className="pl-6 text-xs font-medium text-muted-foreground">
                    {KIND_LABEL[item.kind]}
                  </TableCell>
                  <TableCell className="max-w-[min(100vw,28rem)]">
                    <Link
                      href={item.href}
                      className="block truncate text-sm font-medium underline-offset-4 group-hover:underline"
                    >
                      {item.title}
                    </Link>
                    {item.subtitle ? (
                      <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                    <time dateTime={item.at}>{new Date(item.at).toLocaleString()}</time>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
