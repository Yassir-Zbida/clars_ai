"use client"

import { FormEvent, useState } from "react"
import { CopyIcon, Loader2, SparklesIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

import { MessageBody } from "../message-body"

export default function AiEmailPage() {
  const [purpose, setPurpose] = useState("")
  const [tone, setTone] = useState<"professional" | "friendly" | "short">("professional")
  const [contactName, setContactName] = useState("")
  const [company, setCompany] = useState("")
  const [extraContext, setExtraContext] = useState("")
  const [output, setOutput] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

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
    toast.success("Copied to clipboard")
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-input">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <SparklesIcon className="size-4 text-violet-400" />
            Email generator
          </CardTitle>
          <CardDescription className="text-xs">
            Describe the goal; we&apos;ll draft a subject line and body. Refine in your inbox after copying.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <Label htmlFor="purpose">Purpose *</Label>
              <textarea
                id="purpose"
                required
                className="mt-1 flex min-h-[100px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                placeholder="e.g. Follow up after demo, propose next meeting, send invoice reminder…"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Tone</Label>
                <Select
                  value={tone}
                  onValueChange={(v) =>
                    typeof v === "string" && ["professional", "friendly", "short"].includes(v) && setTone(v as typeof tone)
                  }
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="short">Short</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="contactName">Recipient name</Label>
                <Input
                  id="contactName"
                  className="mt-1"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="company">Company</Label>
              <Input id="company" className="mt-1" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <Label htmlFor="extra">Extra context</Label>
              <textarea
                id="extra"
                className="mt-1 flex min-h-[72px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                value={extraContext}
                onChange={(e) => setExtraContext(e.target.value)}
                placeholder="Dates, pricing, links, constraints…"
              />
            </div>
            {warning ? <p className="text-xs text-amber-600 dark:text-amber-400">{warning}</p> : null}
            <Button type="submit" disabled={pending || !purpose.trim()} className="gap-1">
              {pending ? <Loader2 className="size-4 animate-spin" /> : <SparklesIcon className="size-4" />}
              Generate
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-input">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-sm">Draft</CardTitle>
            <CardDescription className="text-xs">Review before sending externally</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs" disabled={!output} onClick={copy}>
            <CopyIcon className="size-3.5" />
            Copy
          </Button>
        </CardHeader>
        <CardContent>
          {!output ? (
            <p className="text-sm text-muted-foreground">Generated email will appear here.</p>
          ) : (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
              <MessageBody text={output} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
