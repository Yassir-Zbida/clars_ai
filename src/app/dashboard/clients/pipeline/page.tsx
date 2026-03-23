"use client"

import { useMemo } from "react"

import { trpc } from "@/trpc/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ArrowUpRight,
  Loader2,
  SparklesIcon,
  UsersIcon,
} from "lucide-react"

type PipelineColumnId = "lead" | "proposal" | "negotiation" | "won"

interface PipelineClient {
  id: string
  name: string
  company?: string
  email?: string
  column: PipelineColumnId
}

function derivePipeline(clients: {
  id: string
  name: string
  company?: string
  email?: string
  healthScore?: number | null
}[]): Record<PipelineColumnId, PipelineClient[]> {
  const columns: Record<PipelineColumnId, PipelineClient[]> = {
    lead: [],
    proposal: [],
    negotiation: [],
    won: [],
  }

  clients.forEach((c, index) => {
    const score = c.healthScore ?? 50
    let column: PipelineColumnId = "lead"

    if (score >= 75) column = "won"
    else if (score >= 60) column = "negotiation"
    else if (score >= 45) column = "proposal"

    columns[column].push({
      id: c.id,
      name: c.name,
      company: c.company,
      email: c.email,
      column,
    })

    // light shuffle to avoid perfectly sorted lists
    if (index % 7 === 0) {
      columns[column].reverse()
    }
  })

  return columns
}

export default function ClientsPipelinePage() {
  const { data, isLoading, isError } = trpc.clients.list.useQuery()

  const pipeline = useMemo(
    () => derivePipeline(data ?? []),
    [data],
  )

  const total = data?.length ?? 0
  const wonCount = pipeline.won.length

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
              Pipeline
            </h1>
            {total > 0 && (
              <Badge
                variant="outline"
                className="border-border/70 bg-muted/40 text-[11px] font-medium"
              >
                {total} deals
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground md:text-sm">
            A simple, AI-friendly view of where each client relationship sits right now.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs md:text-sm"
          >
            <SparklesIcon className="size-3.5" />
            Auto clean (soon)
          </Button>
          <Button size="sm" className="gap-1.5 text-xs md:text-sm">
            <ArrowUpRight className="size-3.5" />
            View insights
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        <Card className="rounded-xl border-border/60 bg-card/60">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UsersIcon className="size-3.5" />
              </span>
              Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold tracking-tight">
                {wonCount}
              </span>
              <Badge
                variant="outline"
                className="gap-1 rounded-full border-emerald-500/30 bg-emerald-500/10 px-1.5 text-[11px] text-emerald-400"
              >
                <ArrowUpRight className="size-3" />
                Won
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Clients currently in a strong, healthy state.
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-md border border-border/60 bg-muted/50 px-2 py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground/80">
                  In motion
                </div>
                <div className="mt-0.5 text-sm font-semibold">
                  {total - wonCount}
                </div>
              </div>
              <div className="rounded-md border border-border/60 bg-muted/50 px-2 py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground/80">
                  Total pipeline
                </div>
                <div className="mt-0.5 text-sm font-semibold">
                  {total}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border-border/60 bg-card/60">
        <CardHeader className="space-y-1 border-b border-border/60 pb-3">
          <CardTitle className="text-sm font-semibold">
            Relationship pipeline
          </CardTitle>
          <CardDescription className="text-xs">
            Automatically grouped by client health to give you a quick, CRM-style board.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Building your pipeline…
            </div>
          ) : isError ? (
            <div className="flex h-40 flex-col items-center justify-center gap-1 text-center text-sm text-muted-foreground">
              <p>We couldn&apos;t build your pipeline right now.</p>
              <p className="text-xs">
                Check your connection and try again in a moment.
              </p>
            </div>
          ) : total === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-1 text-center text-sm text-muted-foreground">
              <p>No clients yet.</p>
              <p className="text-xs">
                Once you add clients, we&apos;ll automatically place them into
                stages here.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-4">
              {([
                {
                  id: "lead",
                  title: "Lead",
                  toneClass: "bg-sky-500/15 text-sky-300",
                },
                {
                  id: "proposal",
                  title: "Proposal",
                  toneClass: "bg-amber-500/15 text-amber-300",
                },
                {
                  id: "negotiation",
                  title: "Negotiation",
                  toneClass: "bg-purple-500/15 text-purple-300",
                },
                {
                  id: "won",
                  title: "Won",
                  toneClass: "bg-emerald-500/15 text-emerald-300",
                },
              ] as const).map((column) => {
                const items = pipeline[column.id]

                return (
                  <div
                    key={column.id}
                    className="flex min-h-[180px] flex-col rounded-xl border border-border/60 bg-muted/40 p-2"
                  >
                    <div className="flex items-center justify-between gap-2 px-1 pb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            column.toneClass,
                          ].join(" ")}
                        >
                          {column.title}
                        </span>
                      </div>
                      <span className="rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {items.length}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-1 flex-col gap-1.5">
                      {items.length === 0 ? (
                        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border/60 bg-background/40 px-2 py-3 text-center text-[11px] text-muted-foreground">
                          No clients in this stage yet.
                        </div>
                      ) : (
                        items.map((client) => (
                          <div
                            key={client.id}
                            className="flex flex-col gap-1 rounded-lg border border-border/70 bg-background/70 px-2.5 py-2 text-xs shadow-[0_1px_0_rgba(15,23,42,0.35)]"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-[13px] font-medium">
                                {client.name}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                              <span className="truncate">
                                {client.company || client.email || "No details yet"}
                              </span>
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground/80">
                                <span className="inline-flex size-1.5 rounded-full bg-primary/80" />
                                Active
                              </span>
                            </div>
                          </div>
                        ))
                      )}
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
