"use client"

import { FormEvent, useState } from "react"
import { CopyIcon, FileBarChartIcon, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

import { MessageBody } from "../message-body"

export default function AiReportsPage() {
  const [audience, setAudience] = useState<"executive" | "team" | "client">("executive")
  const [focus, setFocus] = useState("")
  const [output, setOutput] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (pending) return
    setPending(true)
    setWarning(null)
    try {
      const res = await fetch("/api/ai/reports", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience,
          focus: focus.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error("failed")
      const json = (await res.json()) as { data: { content: string; warning?: string } }
      setOutput(json.data.content)
      if (json.data.warning) setWarning(json.data.warning)
    } catch {
      toast.error("Could not generate report")
    } finally {
      setPending(false)
    }
  }

  function copy() {
    if (!output) return
    void navigator.clipboard.writeText(output)
    toast.success("Copied to clipboard")
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-input">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileBarChartIcon className="size-4 text-violet-400" />
            Reports generator
          </CardTitle>
          <CardDescription className="text-xs">
            Pulls your Analytics overview snapshot (finance, contacts, projects) and turns it into a narrative. Without an
            API key, you still get a structured data outline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <Label>Audience</Label>
              <Select
                value={audience}
                onValueChange={(v) =>
                  typeof v === "string" &&
                  ["executive", "team", "client"].includes(v) &&
                  setAudience(v as typeof audience)
                }
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="executive">Executive summary</SelectItem>
                  <SelectItem value="team">Internal team</SelectItem>
                  <SelectItem value="client">Client-facing (sanitized)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="focus">Focus (optional)</Label>
              <textarea
                id="focus"
                className="mt-1 flex min-h-[88px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                placeholder="e.g. Emphasize cash collection and overdue risk…"
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
              />
            </div>
            {warning ? <p className="text-xs text-amber-600 dark:text-amber-400">{warning}</p> : null}
            <Button type="submit" disabled={pending} className="gap-1">
              {pending ? <Loader2 className="size-4 animate-spin" /> : <FileBarChartIcon className="size-4" />}
              Generate report
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-input">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-sm">Output</CardTitle>
            <CardDescription className="text-xs">Markdown-style text — paste into Docs or Notion</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs" disabled={!output} onClick={copy}>
            <CopyIcon className="size-3.5" />
            Copy
          </Button>
        </CardHeader>
        <CardContent>
          {!output ? (
            <p className="text-sm text-muted-foreground">Run generate to see the report.</p>
          ) : (
            <div className="max-h-[min(70vh,640px)] overflow-y-auto rounded-lg border border-border/60 bg-muted/20 p-4">
              <MessageBody text={output} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
