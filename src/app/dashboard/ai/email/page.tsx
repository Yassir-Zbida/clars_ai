"use client"

import { FormEvent, useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

import { MessageBody } from "../message-body"
import { useAiSurfacePageView } from "../use-ai-surface-view"

const TONES = [
  { value: "professional", label: "Professional", desc: "Formal and business-appropriate" },
  { value: "friendly", label: "Friendly", desc: "Warm and approachable" },
  { value: "short", label: "Concise", desc: "Brief, straight to the point" },
] as const

type Tone = (typeof TONES)[number]["value"]

export default function AiEmailPage() {
  useAiSurfacePageView("email")
  const [purpose, setPurpose] = useState("")
  const [tone, setTone] = useState<Tone>("professional")
  const [contactName, setContactName] = useState("")
  const [company, setCompany] = useState("")
  const [extraContext, setExtraContext] = useState("")
  const [output, setOutput] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [copied, setCopied] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!purpose.trim() || pending) return
    setPending(true)
    setWarning(null)
    try {
      const res = await fetch("/api/ai/email", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose: purpose.trim(),
          tone,
          contactName: contactName.trim() || undefined,
          company: company.trim() || undefined,
          extraContext: extraContext.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error("failed")
      const json = (await res.json()) as { data: { content: string; warning?: string } }
      setOutput(json.data.content)
      if (json.data.warning) setWarning(json.data.warning)
    } catch {
      toast.error("Could not generate email")
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

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      {/* ── Form card ── */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-input bg-card shadow-sm">
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-input px-5 py-3.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
            <i className="ri-mail-send-line text-sm text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">Email generator</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Describe the goal — we'll draft a subject + body</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4 px-5 py-4">
          {/* Purpose */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="purpose" className="text-xs font-medium">
              Purpose <span className="text-destructive">*</span>
            </Label>
            <textarea
              id="purpose"
              required
              rows={4}
              className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm leading-relaxed outline-none transition-shadow placeholder:text-muted-foreground/60 focus:border-primary/40 focus:shadow-md focus:shadow-primary/5"
              placeholder="e.g. Follow up after demo, propose next meeting, send invoice reminder…"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </div>

          {/* Tone + Recipient */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Tone</Label>
              <Select
                value={tone}
                onValueChange={(v) => TONES.some((t) => t.value === v) && setTone(v as Tone)}
              >
                <SelectTrigger className="w-full rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contactName" className="text-xs font-medium">Recipient name</Label>
              <Input
                id="contactName"
                className="rounded-xl"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          {/* Company */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company" className="text-xs font-medium">Company</Label>
            <Input
              id="company"
              className="rounded-xl"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Optional"
            />
          </div>

          {/* Extra context */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="extra" className="text-xs font-medium">Extra context</Label>
            <textarea
              id="extra"
              rows={3}
              className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm leading-relaxed outline-none transition-shadow placeholder:text-muted-foreground/60 focus:border-primary/40 focus:shadow-md focus:shadow-primary/5"
              value={extraContext}
              onChange={(e) => setExtraContext(e.target.value)}
              placeholder="Dates, pricing, links, constraints…"
            />
          </div>

          {warning && (
            <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
              {warning}
            </p>
          )}

          <Button
            type="submit"
            disabled={pending || !purpose.trim()}
            className="mt-auto gap-1.5 self-start rounded-xl"
          >
            {pending
              ? <Loader2 className="size-4 animate-spin" />
              : <i className="ri-sparkling-2-line text-sm" />}
            Generate email
          </Button>
        </form>
      </div>

      {/* ── Draft card ── */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-input bg-card shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-input px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-muted">
              <i className="ri-draft-line text-sm text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-none">Draft</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Review before sending</p>
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

        {/* Output */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!output ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl border border-dashed border-input bg-muted/30">
                <i className="ri-mail-line text-xl text-muted-foreground/40" />
              </div>
              <p className="text-sm text-muted-foreground">
                Fill in the details and hit <strong>Generate email</strong>
              </p>
              <p className="text-xs text-muted-foreground/60">Your draft will appear here, ready to copy.</p>
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
