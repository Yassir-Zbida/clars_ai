"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { AlertTriangleIcon, ArrowRightIcon, LightbulbIcon, Loader2, SparklesIcon, TrendingUpIcon } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type InsightsPayload = {
  generatedAt: string
  alerts: Array<{
    id: string
    severity: "danger" | "warning" | "info"
    title: string
    body: string
    href: string
  }>
  highlights: Array<{
    id: string
    label: string
    value: string
    hint: string
    href: string
    tone?: "positive" | "neutral" | "negative"
  }>
  suggestions: Array<{ id: string; title: string; body: string; href: string }>
  meta: { interactionsLast30Days: number; totalContacts: number }
}

export default function InsightsPage() {
  const { data, isLoading, isError, dataUpdatedAt } = useQuery({
    queryKey: ["dashboard", "insights"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/insights", { credentials: "include" })
      if (!res.ok) throw new Error("insights")
      const json = (await res.json()) as { data: InsightsPayload }
      return json.data
    },
  })

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-8 pt-0 lg:px-6 lg:pt-0">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <SparklesIcon className="size-6 text-violet-400" />
          Smart Insights
        </h1>
        <p className="text-xs text-muted-foreground">
          Rule-based signals from your CRM and finance data—priorities, risks, and next steps.
        </p>
        {dataUpdatedAt ? (
          <p className="text-[10px] text-muted-foreground/80">
            Updated {new Date(dataUpdatedAt).toLocaleString()}
          </p>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex min-h-[200px] items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" />
          Generating insights…
        </div>
      ) : isError || !data ? (
        <p className="text-sm text-muted-foreground">Could not load insights. Try again shortly.</p>
      ) : (
        <>
          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Alerts</h2>
            {data.alerts.length === 0 ? (
              <Card className="border-emerald-500/20 bg-emerald-500/5">
                <CardContent className="flex items-center gap-3 py-4 text-sm">
                  <TrendingUpIcon className="size-5 shrink-0 text-emerald-400" />
                  <span>No critical alerts right now. Keep logging activity and invoices stay current.</span>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {data.alerts.map((a) => (
                  <Card
                    key={a.id}
                    className={cn(
                      "border",
                      a.severity === "danger" && "border-red-500/30 bg-red-500/5",
                      a.severity === "warning" && "border-amber-500/30 bg-amber-500/5",
                      a.severity === "info" && "border-blue-500/25 bg-blue-500/5"
                    )}
                  >
                    <CardHeader className="pb-1">
                      <div className="flex items-start gap-2">
                        <AlertTriangleIcon
                          className={cn(
                            "mt-0.5 size-4 shrink-0",
                            a.severity === "danger" && "text-red-400",
                            a.severity === "warning" && "text-amber-400",
                            a.severity === "info" && "text-blue-400"
                          )}
                        />
                        <CardTitle className="text-sm">{a.title}</CardTitle>
                      </div>
                      <CardDescription className="pl-6 text-xs leading-relaxed">{a.body}</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-6 pt-0">
                      <Link href={a.href} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-7 text-xs")}>
                        Take action
                        <ArrowRightIcon className="ml-1 size-3" />
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Highlights</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {data.highlights.map((h) => (
                <Card
                  key={h.id}
                  className={cn(
                    "border-input",
                    h.tone === "positive" && "border-emerald-500/20 bg-emerald-500/5",
                    h.tone === "negative" && "border-red-500/20 bg-red-500/5"
                  )}
                >
                  <CardHeader className="pb-1">
                    <CardTitle className="text-xs font-medium text-muted-foreground">{h.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-xl font-semibold tracking-tight">{h.value}</p>
                    <p className="text-[11px] text-muted-foreground">{h.hint}</p>
                    <Link href={h.href} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 px-0 text-xs")}>
                      Open
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Suggestions</h2>
            {data.suggestions.length === 0 ? (
              <p className="text-xs text-muted-foreground">You&apos;re on track—no extra suggestions for now.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {data.suggestions.map((s) => (
                  <Card key={s.id} className="border-input">
                    <CardHeader className="pb-1">
                      <div className="flex items-center gap-2">
                        <LightbulbIcon className="size-4 text-amber-400" />
                        <CardTitle className="text-sm">{s.title}</CardTitle>
                      </div>
                      <CardDescription className="text-xs leading-relaxed">{s.body}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Link href={s.href} className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "h-7 text-xs")}>
                        Go
                        <ArrowRightIcon className="ml-1 size-3" />
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <Card className="border-dashed border-muted-foreground/30 bg-muted/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Workspace pulse</CardTitle>
              <CardDescription className="text-xs">
                {data.meta.interactionsLast30Days} interactions logged · {data.meta.totalContacts} contacts
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Link href="/dashboard/activity" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs")}>
                View activity feed
              </Link>
              <Link href="/dashboard/analytics" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs")}>
                Open analytics
              </Link>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
