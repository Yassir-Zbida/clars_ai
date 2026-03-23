"use client"

import { FormEvent, useRef, useState } from "react"
import { Loader2, SendIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

import { MessageBody } from "./message-body"

type Role = "user" | "assistant"

type Msg = { role: Role; content: string }

const WELCOME: Msg = {
  role: "assistant",
  content:
    "Hi — I'm **Clars AI**, your CRM copilot. Ask about **contacts**, **invoices**, **projects**, or how to use the app.\n\n" +
    "If no API key is set, you'll get **offline tips** instead of a live model.",
}

export default function AiChatPage() {
  const [history, setHistory] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [pending, setPending] = useState(false)
  const [lastWarning, setLastWarning] = useState<string | null>(null)
  const [lastModel, setLastModel] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const display: Msg[] = [WELCOME, ...history]

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || pending) return
    setInput("")
    setLastWarning(null)
    const nextHistory: Msg[] = [...history, { role: "user", content: text }]
    setHistory(nextHistory)
    setPending(true)

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextHistory }),
      })
      if (!res.ok) throw new Error("chat failed")
      const json = (await res.json()) as {
        data: { content: string; mock?: boolean; model?: string; warning?: string }
      }
      setHistory((h) => [...h, { role: "assistant", content: json.data.content }])
      if (json.data.warning) setLastWarning(json.data.warning)
      setLastModel(json.data.model && !json.data.mock ? json.data.model : null)
    } catch {
      setHistory((h) => [
        ...h,
        {
          role: "assistant",
          content: "Something went wrong. Check your connection and try again.",
        },
      ])
    } finally {
      setPending(false)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {(lastWarning || lastModel) && (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-[11px] text-muted-foreground">
          {lastModel ? <span className="mr-2 text-emerald-400">Model: {lastModel}</span> : null}
          {lastWarning}
        </div>
      )}

      <Card className="min-h-[420px] border-input">
        <CardContent className="flex max-h-[min(70vh,560px)] flex-col gap-3 overflow-y-auto p-4">
          {display.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "ml-auto max-w-[min(100%,520px)] rounded-2xl bg-primary/15 px-4 py-2.5"
                  : "mr-auto max-w-[min(100%,620px)] rounded-2xl border border-border/60 bg-muted/30 px-4 py-2.5"
              }
            >
              {m.role === "user" ? (
                <p className="whitespace-pre-wrap text-sm">{m.content}</p>
              ) : (
                <MessageBody text={m.content} />
              )}
            </div>
          ))}
          {pending ? (
            <div className="mr-auto flex items-center gap-2 rounded-2xl border border-dashed border-border px-4 py-3 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Thinking…
            </div>
          ) : null}
          <div ref={bottomRef} />
        </CardContent>
      </Card>

      <form onSubmit={onSubmit} className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about your CRM…"
          className="text-sm"
          disabled={pending}
          autoComplete="off"
        />
        <Button type="submit" disabled={pending || !input.trim()} className="shrink-0 gap-1">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <SendIcon className="size-4" />}
          Send
        </Button>
      </form>
    </div>
  )
}
