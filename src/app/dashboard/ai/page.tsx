"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { getDicebearUrl } from "@/lib/dicebear"
import {
  ArrowUpIcon,
  CheckIcon,
  CopyIcon,
  FolderPlusIcon,
  HistoryIcon,
  ImageIcon,
  Loader2,
  NavigationIcon,
  PencilLineIcon,
  TrashIcon,
  UserPlusIcon,
  XIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { MessageBody } from "./message-body"
import { toast } from "sonner"

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "user" | "assistant"
type ImageAttachment = { dataUrl: string; name: string }
type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }

type ActionPayload =
  | { type: "create_client"; data: { fullName: string; company?: string; email?: string } }
  | { type: "create_project"; data: { name: string; description?: string; priority?: string } }
  | { type: "navigate"; data: { path: string; label: string } }

type Msg = {
  id: string
  role: Role
  content: string
  images?: ImageAttachment[]
  ts: string
  action?: ActionPayload
  actionStatus?: "idle" | "loading" | "done" | "error" | "cancelled"
}

type Conversation = {
  id: string
  title: string
  messages: Msg[]
  createdAt: string
  updatedAt: string
}

// ─── Persistence ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "clars-ai-history"

function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return []
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Conversation[] }
  catch { return [] }
}

function persist(convs: Conversation[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(convs.slice(0, 50))) } catch {}
}

// ─── Utils ────────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2)

function parseAction(raw: string): { text: string; action: ActionPayload | null } {
  const match = raw.match(/<action>([\s\S]*?)<\/action>/i)
  if (!match) return { text: raw, action: null }
  try { return { text: raw.replace(/<action>[\s\S]*?<\/action>/gi, "").trim(), action: JSON.parse(match[1]) as ActionPayload } }
  catch { return { text: raw, action: null } }
}

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, 1120 / Math.max(img.width, img.height))
        const canvas = document.createElement("canvas")
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL("image/jpeg", 0.82))
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

function relativeDate(iso: string) {
  const d = new Date(iso)
  const days = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  return d.toLocaleDateString([], { month: "short", day: "numeric" })
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60000) return "just now"
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

const getInitials = (name?: string | null) =>
  (name ?? "U").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()

function deriveTitle(msgs: Msg[]) {
  const first = msgs.find((m) => m.role === "user")?.content ?? ""
  return first.length > 52 ? first.slice(0, 52) + "…" : first || "New conversation"
}

function groupedByDate(convs: Conversation[]) {
  const map: Record<string, Conversation[]> = {}
  convs.forEach((c) => {
    const k = relativeDate(c.updatedAt)
    ;(map[k] ??= []).push(c)
  })
  return Object.entries(map)
}

// ─── Quick prompts ────────────────────────────────────────────────────────────

const QUICK = [
  { icon: "ri-user-add-line", label: "Add a client", sub: "Create a new contact", fill: "Add a new client named " },
  { icon: "ri-folder-add-line", label: "New project", sub: "Set up a project", fill: "Create a new project called " },
  { icon: "ri-file-warning-line", label: "Overdue invoices", sub: "See what's unpaid", fill: "Which of my invoices are overdue and what should I do?" },
  { icon: "ri-bar-chart-2-line", label: "Revenue snapshot", sub: "Key financial metrics", fill: "Give me a summary of my revenue and key financial metrics." },
  { icon: "ri-compass-3-line", label: "How to use Clars", sub: "Quick app overview", fill: "Give me a quick overview of how to use Clars CRM." },
  { icon: "ri-sparkling-2-line", label: "Automation ideas", sub: "Save time on tasks", fill: "What automation workflows would help my freelance business?" },
]

// ─── Atoms ────────────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-[3px] py-0.5">
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-[6px] rounded-full bg-foreground/20 animate-bounce"
          style={{ animationDelay: `${i * 140}ms`, animationDuration: "900ms" }} />
      ))}
    </span>
  )
}

function UserAvatar({ initials, seed }: { initials: string; seed: string }) {
  return (
    <div className="flex size-7 shrink-0 items-center justify-center rounded-full overflow-hidden">
      <img
        src={getDicebearUrl(seed || initials)}
        alt={initials}
        className="size-full object-cover"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }}
      />
    </div>
  )
}

function AiAvatar() {
  return (
    <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-input bg-card">
      <img src="/favicon.svg" alt="" className="size-4" />
    </div>
  )
}

function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  return (
    <button type="button"
      onClick={() => {
        navigator.clipboard.writeText(text)
        setDone(true)
        setTimeout(() => setDone(false), 1800)
        toast.success("Copied to clipboard")
      }}
      className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground opacity-0 transition hover:bg-muted group-hover/msg:opacity-100"
    >
      {done ? <CheckIcon className="size-3 text-emerald-500" /> : <CopyIcon className="size-3" />}
      {done ? "Copied" : "Copy"}
    </button>
  )
}

// ─── Action card ──────────────────────────────────────────────────────────────

function ActionCard({ action, status, onConfirm, onCancel }: {
  action: ActionPayload; status: Msg["actionStatus"]
  onConfirm: () => void; onCancel: () => void
}) {
  if (status === "done") return <p className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600"><CheckIcon className="size-3" /> Done</p>
  if (status === "cancelled") return <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><XIcon className="size-3" /> Cancelled</p>

  const loading = status === "loading"
  const Icon = action.type === "create_client" ? UserPlusIcon : action.type === "create_project" ? FolderPlusIcon : NavigationIcon
  const label =
    action.type === "create_client" ? `Create client — ${action.data.fullName}`
    : action.type === "create_project" ? `Create project — ${action.data.name}`
    : `Go to ${(action as { type: "navigate"; data: { label: string } }).data.label}`

  return (
    <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3">
      <div className="flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15"><Icon className="size-3.5 text-primary" /></div>
        <p className="text-xs font-medium">{label}</p>
      </div>
      {status === "error" && <p className="mt-2 text-xs text-destructive">Failed — please try manually.</p>}
      <div className="mt-2.5 flex gap-2">
        <Button size="sm" className="h-7 gap-1 text-xs" disabled={loading} onClick={onConfirm}>
          {loading ? <Loader2 className="size-3 animate-spin" /> : <CheckIcon className="size-3" />}
          {loading ? "Running…" : "Confirm"}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={loading} onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}

// ─── History panel ────────────────────────────────────────────────────────────

function HistoryPanel({ convs, activeId, onSelect, onDelete }: {
  convs: Conversation[]; activeId: string
  onSelect: (c: Conversation) => void; onDelete: (id: string) => void
}) {
  const groups = groupedByDate(convs)
  return (
    <div className="flex w-60 shrink-0 flex-col border-r border-input">
      <div className="flex h-9 items-center border-b border-input px-3">
        <p className="text-xs font-semibold text-muted-foreground">Recent chats</p>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {convs.length === 0
          ? <p className="px-3 py-8 text-center text-xs text-muted-foreground">No history yet</p>
          : groups.map(([label, items]) => (
            <div key={label}>
              <p className="px-3 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">{label}</p>
              {items.map((c) => (
                <div key={c.id}
                  onClick={() => onSelect(c)}
                  className={cn(
                    "group/item relative mx-1 mb-px flex cursor-pointer rounded-lg px-2.5 py-2 transition-colors",
                    c.id === activeId ? "bg-primary/10" : "hover:bg-muted/60"
                  )}
                >
                  <div className="min-w-0 flex-1 pr-5">
                    <p className="truncate text-xs font-medium leading-snug">{c.title}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{c.messages.length} msg · {relativeDate(c.updatedAt)}</p>
                  </div>
                  <button type="button"
                    onClick={(e) => { e.stopPropagation(); onDelete(c.id) }}
                    className="absolute right-2 top-2 flex size-5 items-center justify-center rounded opacity-0 text-muted-foreground transition-opacity hover:text-destructive group-hover/item:opacity-100"
                  >
                    <TrashIcon className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          ))
        }
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AiChatPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const initials = getInitials(session?.user?.name)

  const [convId, setConvId] = useState(uid)
  const [convs, setConvs] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [pending, setPending] = useState(false)
  const [attachments, setAttachments] = useState<ImageAttachment[]>([])
  const [showHistory, setShowHistory] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setConvs(loadConversations()) }, [])

  // Auto-save on every message change
  useEffect(() => {
    if (!messages.length) return
    const conv: Conversation = {
      id: convId,
      title: deriveTitle(messages),
      messages,
      createdAt: convs.find((c) => c.id === convId)?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setConvs((prev) => { const next = [conv, ...prev.filter((c) => c.id !== convId)]; persist(next); return next })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages])

  const scrollDown = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80)

  function resizeTa() {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`
  }

  function newChat() {
    setConvId(uid())
    setMessages([])
    setInput("")
    setAttachments([])
    if (textareaRef.current) textareaRef.current.style.height = "auto"
    toast("New conversation started", { icon: <i className="ri-chat-new-line text-base" /> })
  }

  function openConv(c: Conversation) {
    setConvId(c.id)
    setMessages(c.messages)
    setShowHistory(false)
    setTimeout(scrollDown, 120)
  }

  function deleteConv(id: string) {
    setConvs((prev) => { const next = prev.filter((c) => c.id !== id); persist(next); return next })
    if (id === convId) newChat()
    toast("Conversation deleted", { icon: <i className="ri-delete-bin-line text-base" /> })
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/")).slice(0, 4)
    const compressed = await Promise.all(files.map((f) => compressImage(f).then((d) => ({ dataUrl: d, name: f.name }))))
    setAttachments((prev) => [...prev, ...compressed].slice(0, 4))
    e.target.value = ""
  }

  async function send(text: string) {
    const trimmed = text.trim()
    if ((!trimmed && !attachments.length) || pending) return
    setInput("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"
    const imgs = [...attachments]
    setAttachments([])

    const userMsg: Msg = { id: uid(), role: "user", content: trimmed, images: imgs.length ? imgs : undefined, ts: new Date().toISOString() }
    const next = [...messages, userMsg]
    setMessages(next)
    setPending(true)
    scrollDown()

    try {
      const apiMessages = next.map((m) => {
        if (m.role === "user" && m.images?.length) {
          const parts: ContentPart[] = []
          if (m.content) parts.push({ type: "text", text: m.content })
          m.images.forEach((img) => parts.push({ type: "image_url", image_url: { url: img.dataUrl } }))
          return { role: m.role, content: parts }
        }
        return { role: m.role, content: m.content }
      })
      const res = await fetch("/api/ai/chat", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: apiMessages }) })
      if (!res.ok) throw new Error()
      const json = (await res.json()) as { data: { content: string } }
      const { text: txt, action } = parseAction(json.data.content)
      setMessages((p) => [...p, { id: uid(), role: "assistant", content: txt, ts: new Date().toISOString(), action: action ?? undefined, actionStatus: action ? "idle" : undefined }])
    } catch {
      setMessages((p) => [...p, { id: uid(), role: "assistant", content: "Something went wrong. Please try again.", ts: new Date().toISOString() }])
      toast.error("Failed to get a response. Please try again.")
    } finally {
      setPending(false)
      scrollDown()
    }
  }

  async function execAction(msgId: string, action: ActionPayload) {
    setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "loading" } : m))
    try {
      if (action.type === "navigate") {
        router.push(action.data.path)
        setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "done" } : m))
        toast.success(`Navigating to ${action.data.label}…`)
        return
      }
      if (action.type === "create_client") {
        const res = await fetch("/api/clients", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: action.data.fullName, company: action.data.company || undefined, type: action.data.company ? "COMPANY" : "INDIVIDUAL", status: "LEAD", currency: "USD" }) })
        if (!res.ok) throw new Error()
        const { data } = (await res.json()) as { data?: { id?: string } }
        setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "done" } : m))
        setMessages((p) => [...p, { id: uid(), role: "assistant" as Role, content: `✅ **${action.data.fullName}** added.${data?.id ? ` [View →](/dashboard/clients/${data.id})` : ""}`, ts: new Date().toISOString() }])
        toast.success(`Contact "${action.data.fullName}" created`)
        scrollDown(); return
      }
      if (action.type === "create_project") {
        const res = await fetch("/api/projects", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: action.data.name, description: action.data.description || undefined, status: "DRAFT", priority: action.data.priority ?? "MEDIUM" }) })
        if (!res.ok) throw new Error()
        const { data } = (await res.json()) as { data?: { id?: string } }
        setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "done" } : m))
        setMessages((p) => [...p, { id: uid(), role: "assistant" as Role, content: `✅ Project **${action.data.name}** created.${data?.id ? ` [View →](/dashboard/projects/${data.id})` : ""}`, ts: new Date().toISOString() }])
        toast.success(`Project "${action.data.name}" created`)
        scrollDown(); return
      }
    } catch {
      setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "error" } : m))
      toast.error("Action failed — please try manually.")
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-1 overflow-hidden rounded-2xl border border-input bg-card shadow-sm">

      {/* ── History sidebar ── */}
      {showHistory && (
        <HistoryPanel convs={convs} activeId={convId} onSelect={openConv} onDelete={deleteConv} />
      )}

      {/* ── Main column ── */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* Toolbar — minimal, no brand repetition */}
        <div className="flex h-9 items-center justify-between border-b border-input px-3">
          <button
            type="button"
            title="Chat history"
            onClick={() => setShowHistory((v) => !v)}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs transition-colors",
              showHistory
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <HistoryIcon className="size-3.5" />
            History
            {convs.length > 0 && (
              <span className="rounded-full bg-muted-foreground/20 px-1.5 py-px text-[10px] font-medium tabular-nums">
                {convs.length}
              </span>
            )}
          </button>

          <button
            type="button"
            title="New chat"
            onClick={newChat}
            className="flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <PencilLineIcon className="size-3.5" />
            New chat
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {isEmpty ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center gap-6 px-4 py-14 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl border border-input bg-card shadow-sm">
                <img src="/favicon.svg" alt="" className="size-8" />
              </div>
              <div>
                <h2 className="text-base font-semibold">How can I help you today?</h2>
                <p className="mt-1 text-xs text-muted-foreground max-w-xs mx-auto">
                  Ask anything about your CRM — or let me take actions for you.
                </p>
              </div>
              <div className="grid w-full max-w-xl grid-cols-2 gap-2 sm:grid-cols-3">
                {QUICK.map(({ icon, label, sub, fill }) => (
                  <button key={label} type="button"
                    onClick={() => { setInput(fill); textareaRef.current?.focus(); resizeTa() }}
                    className="flex flex-col items-start gap-1.5 rounded-xl border border-input bg-background px-3 py-3 text-left text-xs transition-all hover:border-primary/30 hover:bg-primary/[0.04] hover:shadow-sm"
                  >
                    <i className={`${icon} text-base text-primary`} />
                    <span className="font-medium text-foreground">{label}</span>
                    <span className="text-muted-foreground">{sub}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Conversation */
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
              {messages.map((msg) =>
                msg.role === "user" ? (
                  /* User */
                  <div key={msg.id} className="flex items-start justify-end gap-2.5">
                    <div className="max-w-[78%]">
                      {msg.images?.length ? (
                        <div className="mb-2 flex flex-wrap justify-end gap-2">
                          {msg.images.map((img, i) => (
                            <img key={i} src={img.dataUrl} alt={img.name} className="h-28 max-w-[180px] rounded-xl border border-input object-cover" />
                          ))}
                        </div>
                      ) : null}
                      {msg.content && (
                        <div className="rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        </div>
                      )}
                      <p className="mt-1 text-right text-[10px] text-muted-foreground/60">{relativeTime(msg.ts)}</p>
                    </div>
                    <UserAvatar initials={initials} seed={session?.user?.name || session?.user?.email || initials} />
                  </div>
                ) : (
                  /* Assistant */
                  <div key={msg.id} className="group/msg flex items-start gap-2.5">
                    <AiAvatar />
                    <div className="min-w-0 flex-1">
                      <MessageBody text={msg.content} />
                      {msg.action && msg.actionStatus !== undefined && (
                        <ActionCard
                          action={msg.action}
                          status={msg.actionStatus}
                          onConfirm={() => execAction(msg.id, msg.action!)}
                          onCancel={() => {
                            setMessages((p) => p.map((m) => m.id === msg.id ? { ...m, actionStatus: "cancelled" } : m))
                            toast("Action cancelled", { icon: <i className="ri-arrow-go-back-line text-base" /> })
                          }}
                        />
                      )}
                      <div className="mt-1 flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground/50">{relativeTime(msg.ts)}</span>
                        <CopyBtn text={msg.content} />
                      </div>
                    </div>
                  </div>
                )
              )}

              {pending && (
                <div className="flex items-start gap-2.5">
                  <AiAvatar />
                  <div className="pt-1"><TypingDots /></div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-input px-4 py-3">
          {/* Image previews */}
          {attachments.length > 0 && (
            <div className="mx-auto mb-2 flex max-w-2xl flex-wrap gap-2">
              {attachments.map((img, i) => (
                <div key={i} className="relative">
                  <img src={img.dataUrl} alt={img.name} className="h-14 w-14 rounded-lg border border-input object-cover" />
                  <button type="button"
                    onClick={() => setAttachments((p) => p.filter((_, idx) => idx !== i))}
                    className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-foreground text-background"
                  >
                    <XIcon className="size-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={(e: FormEvent) => { e.preventDefault(); send(input) }}
            className="mx-auto flex max-w-2xl flex-col rounded-2xl border border-input bg-background shadow-sm transition-shadow focus-within:shadow-md focus-within:shadow-primary/5 focus-within:border-primary/35"
          >
            <textarea
              ref={textareaRef}
              value={input}
              rows={1}
              onChange={(e) => { setInput(e.target.value); resizeTa() }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input) } }}
              placeholder="Ask anything…"
              disabled={pending}
              autoComplete="off"
              className="w-full resize-none bg-transparent px-4 pt-3 pb-1 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/60"
            />
            <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
              <div className="flex items-center gap-0.5">
                <button type="button" title="Attach image" onClick={() => fileRef.current?.click()}
                  className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <ImageIcon className="size-4" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
                <span className="ml-1 text-[10px] text-muted-foreground/40">Shift+Enter for new line</span>
              </div>
              <Button type="submit" size="icon" disabled={pending || (!input.trim() && !attachments.length)} className="size-7 rounded-xl">
                {pending ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowUpIcon className="size-3.5" />}
              </Button>
            </div>
          </form>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground/40">
            Always review actions before confirming
          </p>
        </div>

      </div>
    </div>
  )
}
