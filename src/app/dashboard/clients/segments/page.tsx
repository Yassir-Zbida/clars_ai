"use client"

import { useMemo } from "react"

import { trpc } from "@/trpc/client"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Loader2, TargetIcon, UsersIcon } from "lucide-react"

type SegmentId =
  | "new-this-month"
  | "high-health"
  | "needs-email"
  | "no-company"
  | "archived"

interface SegmentDefinition {
  id: SegmentId
  label: string
  description: string
  tone:
    | "primary"
    | "emerald"
    | "amber"
    | "sky"
    | "slate"
}

const SEGMENTS: SegmentDefinition[] = [
  {
    id: "new-this-month",
    label: "New this month",
    description: "Clients created in the last 30 days.",
    tone: "primary",
  },
  {
    id: "high-health",
    label: "High health score",
    description: "Relationships with a health score above 70.",
    tone: "emerald",
  },
  {
    id: "needs-email",
    label: "Missing email",
    description: "Clients with no email on file yet.",
    tone: "amber",
  },
  {
    id: "no-company",
    label: "Freelance / unknown company",
    description: "Individuals without a company set.",
    tone: "sky",
  },
  {
    id: "archived",
    label: "Soft-deleted (coming soon)",
    description: "Will show archived clients once available.",
    tone: "slate",
  },
]

export default function ClientSegmentsPage() {
  const { data, isLoading, isError } = trpc.clients.list.useQuery()
  const list = data ?? []

  const stats = useMemo(() => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    let newThisMonth = 0
    let highHealth = 0
    let needsEmail = 0
    let noCompany = 0

    for (const c of list) {
      if (c.createdAt && new Date(c.createdAt) >= thirtyDaysAgo) {
        newThisMonth++
      }
      if ((c.healthScore ?? 0) >= 70) {
        highHealth++
      }
      if (!c.email) {
        needsEmail++
      }
      if (!c.company) {
        noCompany++
      }
    }

    return {
      total: list.length,
      newThisMonth,
      highHealth,
      needsEmail,
      noCompany,
    }
  }, [list])

  return (
      <div className="flex flex-1 flex-col gap-4 px-4 pb-2 pt-0 lg:px-6 lg:pt-0">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-xs font-medium text-muted-foreground">
            <span className="inline-flex size-1.5 rounded-full bg-primary" />
            Clients
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight md:text-xl">
              Segments
            </h1>
            {stats.total > 0 && (
              <Badge
                variant="outline"
                className="border-border/70 bg-muted/40 text-[11px] font-medium"
              >
                {stats.total} clients
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground md:text-sm">
            Smart, reusable groupings so you can target the right clients with one click.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-xl border-border/60 bg-card/60">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UsersIcon className="size-3.5" />
              </span>
              Audience overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold tracking-tight">
                {stats.total}
              </span>
              <span className="text-[11px] text-muted-foreground">
                total clients
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-md border border-border/60 bg-muted/50 px-2 py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground/80">
                  New this month
                </div>
                <div className="mt-0.5 text-sm font-semibold">
                  {stats.newThisMonth}
                </div>
              </div>
              <div className="rounded-md border border-border/60 bg-muted/50 px-2 py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground/80">
                  High health
                </div>
                <div className="mt-0.5 text-sm font-semibold">
                  {stats.highHealth}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/60 bg-card/60 md:col-span-2">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                <TargetIcon className="size-3.5" />
              </span>
              How segments work
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>
              Segments are dynamic: as your data updates, clients move in and out automatically.
              You can use these slices later for campaigns, follow-ups, and reporting.
            </p>
            <p>
              Today, segments are powered by your client records. As you connect email, invoices,
              and other channels, we&apos;ll enrich these with AI-driven tags and scores.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border-border/60 bg-card/60">
        <CardHeader className="space-y-1 border-b border-border/60 pb-3">
          <CardTitle className="text-sm font-semibold">
            Default segments
          </CardTitle>
          <CardDescription className="text-xs">
            Built on your existing clients. Custom segments will be available soon.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Calculating segments…
            </div>
          ) : isError ? (
            <div className="flex h-32 flex-col items-center justify-center gap-1 text-center text-sm text-muted-foreground">
              <p>We couldn&apos;t load segments right now.</p>
              <p className="text-xs">
                Please refresh or try again in a few moments.
              </p>
            </div>
          ) : SEGMENTS.length === 0 ? null : (
            <div className="grid gap-3 md:grid-cols-2">
              {SEGMENTS.map((segment) => {
                let count = 0
                if (segment.id === "new-this-month") {
                  count = stats.newThisMonth
                } else if (segment.id === "high-health") {
                  count = stats.highHealth
                } else if (segment.id === "needs-email") {
                  count = stats.needsEmail
                } else if (segment.id === "no-company") {
                  count = stats.noCompany
                } else if (segment.id === "archived") {
                  count = 0
                }

                const toneClass =
                  segment.tone === "primary"
                    ? "bg-primary/10 text-primary"
                    : segment.tone === "emerald"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : segment.tone === "amber"
                        ? "bg-amber-500/15 text-amber-300"
                        : segment.tone === "sky"
                          ? "bg-sky-500/15 text-sky-300"
                          : "bg-slate-500/20 text-slate-300"

                return (
                  <div
                    key={segment.id}
                    className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/40 p-3 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            toneClass,
                          ].join(" ")}
                        >
                          {segment.label}
                        </span>
                      </div>
                      <span className="rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {count} matches
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {segment.description}
                    </p>
                    <Separator className="my-1 border-border/60" />
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground/80">
                      <span>
                        Definition driven by{" "}
                        <span className="font-medium text-foreground">
                          client fields
                        </span>
                        .
                      </span>
                      <span className="hidden rounded-full border border-dashed border-border/70 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground md:inline-flex">
                        Soon: save &amp; sync
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
  )
}
