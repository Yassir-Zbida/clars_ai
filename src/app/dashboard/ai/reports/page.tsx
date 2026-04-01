"use client"

import { FormEvent, useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

import { MessageBody } from "../message-body"
import { useAiSurfacePageView } from "../use-ai-surface-view"

const AUDIENCES = [
  { value: "executive", label: "Executive summary", desc: "High-level KPIs and decisions", icon: "ri-briefcase-4-line" },
  { value: "team", label: "Internal team", desc: "Operational detail and tasks", icon: "ri-group-line" },
  { value: "client", label: "Client-facing", desc: "Sanitized, professional view", icon: "ri-user-star-line" },
] as const

type Audience = (typeof AUDIENCES)[number]["value"]

export default function AiReportsPage() {
  useAiSurfacePageView("reports")
  const [audience, setAudience] = useState<Audience>("executive")
  const [focus, setFocus] = useState("")
  const [output, setOutput] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [copied, setCopied] = useState(false)

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
        body: JSON.stringify({ audience, focus: focus.trim() || undefined }),
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
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success("Copied to clipboard")
  }

  const activeAudience = AUDIENCES.find((a) => a.value === audience)!

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      {/* ── Config card ── */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-input bg-card shadow-sm">
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-input px-5 py-3.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
            <i className="ri-bar-chart-box-line text-sm text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">Report generator</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Turns your CRM snapshot into a narrative</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-5 px-5 py-4">
          {/* Audience selector — visual cards */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">Audience</Label>
            <div className="grid gap-2">
              {AUDIENCES.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => setAudience(a.value)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all",
                    audience === a.value
                      ? "border-primary/40 bg-primary/5 shadow-sm shadow-primary/10"
                      : "border-input bg-background hover:border-input hover:bg-muted/40"
                  )}
                >
                  <div className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                    audience === a.value ? "bg-primary/15" : "bg-muted"
                  )}>
                    <i className={cn(a.icon, "text-sm", audience === a.value ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div className="min-w-0">
                    <p className={cn("text-xs font-medium", audience === a.value ? "text-foreground" : "text-foreground/80")}>{a.label}</p>
                    <p className="text-[11px] text-muted-foreground">{a.desc}</p>
                  </div>
                  <div className={cn(
                    "ml-auto size-4 shrink-0 rounded-full border-2 transition-colors",
                    audience === a.value ? "border-primary bg-primary" : "border-input"
                  )}>
                    {audience === a.value && (
                      <div className="flex size-full items-center justify-center">
                        <div className="size-1.5 rounded-full bg-primary-foreground" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Focus */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="focus" className="text-xs font-medium">
              Focus <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <textarea
              id="focus"
              rows={3}
              className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm leading-relaxed outline-none transition-shadow placeholder:text-muted-foreground/60 focus:border-primary/40 focus:shadow-md focus:shadow-primary/5"
              placeholder="e.g. Emphasize cash collection and overdue risk…"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
            />
          </div>

          {warning && (
            <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
              {warning}
            </p>
          )}

          <Button
            type="submit"
            disabled={pending}
            className="mt-auto gap-1.5 self-start rounded-xl"
          >
            {pending
              ? <Loader2 className="size-4 animate-spin" />
              : <i className="ri-sparkling-2-line text-sm" />}
            Generate report
          </Button>
        </form>
      </div>

      {/* ── Output card ── */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-input bg-card shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-input px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-muted">
              <i className="ri-file-text-line text-sm text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-none">Output</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Paste into Docs, Notion, or your inbox</p>
            </div>
          </div>
          <button
            type="button"
            disabled={!output}
            onClick={copy}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border border-input px-2.5 py-1.5 text-xs font-medium transition-colors",
              output
                ? "text-foreground hover:bg-muted"
                : "cursor-not-allowed text-muted-foreground/40"
            )}
          >
            <i className={cn("text-sm", copied ? "ri-check-line text-emerald-500" : "ri-file-copy-line")} />
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!output ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl border border-dashed border-input bg-muted/30">
                <i className="ri-bar-chart-2-line text-xl text-muted-foreground/40" />
              </div>
              <p className="text-sm text-muted-foreground">
                Select an audience and hit <strong>Generate report</strong>
              </p>
              <div className="mt-1 flex items-center gap-1.5 rounded-lg bg-muted/40 px-3 py-1.5">
                <i className={cn(activeAudience.icon, "text-sm text-muted-foreground")} />
                <span className="text-xs text-muted-foreground">{activeAudience.label}</span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-input bg-muted/20 px-4 py-4">
              <MessageBody text={output} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
