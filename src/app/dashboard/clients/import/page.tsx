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
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { DownloadIcon, UploadIcon } from "lucide-react"

function useClientsCsv() {
  const { data } = trpc.clients.list.useQuery()

  return useMemo(() => {
    const list = data ?? []
    if (list.length === 0) return ""

    const headers = ["Name", "Email", "Company", "Health Score", "Created At"]
    const rows = list.map((c) => [
      c.name ?? "",
      c.email ?? "",
      c.company ?? "",
      c.healthScore != null ? String(c.healthScore) : "",
      c.createdAt ? new Date(c.createdAt).toISOString() : "",
    ])

    return [headers, ...rows]
      .map((row) =>
        row
          .map((value) => {
            const v = value.replace(/"/g, '""')
            return `"${v}"`
          })
          .join(","),
      )
      .join("\n")
  }, [data])
}

export default function ClientsImportExportPage() {
  const csv = useClientsCsv()

  const handleExport = () => {
    if (!csv) return
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", "clients-export.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

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
              Import / Export
            </h1>
            <Badge
              variant="outline"
              className="border-border/70 bg-muted/40 text-[11px] font-medium"
            >
              CSV first
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground md:text-sm">
            Bring your existing client data into clars.ai or export everything for backup in one click.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-xl border-border/60 bg-card/60">
          <CardHeader className="space-y-1 pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UploadIcon className="size-3.5" />
              </span>
              Import from CSV
            </CardTitle>
            <CardDescription className="text-xs">
              Quickly migrate clients from spreadsheets or other CRMs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="space-y-2">
              <div className="font-medium text-muted-foreground">
                Step 1 · Prepare your file
              </div>
              <p className="text-[11px] text-muted-foreground">
                Use the column headers:{" "}
                <span className="font-mono text-[11px]">
                  Name, Email, Company, Health Score, Created At
                </span>
                . Extra columns will be ignored for now.
              </p>
            </div>
            <Separator className="border-border/60" />
            <div className="space-y-2">
              <div className="font-medium text-muted-foreground">
                Step 2 · Upload CSV
              </div>
              <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border/70 bg-muted/40 p-3">
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    disabled
                    className="h-8 cursor-not-allowed text-[11px] opacity-60"
                  />
                  <Button size="sm" variant="outline" disabled>
                    Upload
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  File upload is coming soon. For now, you can share data with
                  us directly and we&apos;ll import it for you.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/60 bg-card/60">
          <CardHeader className="space-y-1 pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                <DownloadIcon className="size-3.5" />
              </span>
              Export all clients
            </CardTitle>
            <CardDescription className="text-xs">
              Download a clean CSV of every client in your workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <p className="text-[11px] text-muted-foreground">
              Exports include the same fields used for imports, so you can
              round-trip data between clars.ai and your other tools.
            </p>
            <div className="rounded-lg border border-border/60 bg-muted/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    clients-export.csv
                  </span>
                  <span className="text-[10px] text-muted-foreground/80">
                    UTF‑8, comma‑separated, quoted values
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={handleExport}
                  disabled={!csv}
                  className="gap-1.5 text-xs"
                >
                  <DownloadIcon className="size-3.5" />
                  Export
                </Button>
              </div>
              {!csv && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  You don&apos;t have any clients yet. Once you add some, you&apos;ll
                  be able to export them from here.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
  )
}