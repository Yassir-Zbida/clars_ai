"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import NextImage from "next/image"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { getDicebearUrl } from "@/lib/dicebear"
import {
  ArrowUpIcon,
  BarChart3Icon,
  CheckIcon,
  CopyIcon,
  CreditCardIcon,
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
import { useAiSurfacePageView } from "./use-ai-surface-view"
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
  | { type: "create_task"; data: { projectName: string; title: string; priority?: string } }
  | { type: "edit_client"; data: { clientName: string; patch: Record<string, unknown> } }
  | { type: "archive_client"; data: { clientName: string } }
  | { type: "edit_project"; data: { projectName: string; patch: Record<string, unknown> } }
  | { type: "delete_project"; data: { projectName: string } }
  | { type: "edit_task"; data: { projectName: string; taskTitle: string; patch: Record<string, unknown> } }
  | { type: "delete_task"; data: { projectName: string; taskTitle: string } }
  | { type: "edit_contact"; data: { clientName: string; contactName: string; patch: Record<string, unknown> } }
  | { type: "delete_contact"; data: { clientName: string; contactName: string } }
  | {
      type: "create_invoice"
      data: {
        clientName: string
        documentType?: "INVOICE" | "QUOTE"
        dueDate: string
        currency?: string
        taxRatePercent?: number
        title?: string
        notes?: string
        lineItems?: Array<{ description: string; quantity?: number; unitAmountCents: number }>
        amountCents?: number
        projectName?: string
      }
    }
  | { type: "edit_invoice"; data: { invoiceNumberOrId: string; patch: Record<string, unknown> } }
  | { type: "delete_invoice"; data: { invoiceNumberOrId: string } }
  | {
      type: "record_invoice_payment"
      data: { invoiceNumberOrId: string; amountCents: number; method?: string; reference?: string; paidAt?: string }
    }
  | {
      type: "create_expense"
      data: {
        vendor?: string
        category?: string
        status?: string
        amountCents: number
        currency?: string
        incurredAt?: string
        notes?: string
        receiptUrl?: string
        clientName?: string
        projectName?: string
      }
    }
  | { type: "edit_expense"; data: { expenseId: string; patch: Record<string, unknown> } }
  | { type: "delete_expense"; data: { expenseId: string } }
  | { type: "get_analytics_overview"; data: Record<string, never> }
  | { type: "admin_get_dashboard"; data: Record<string, never> }
  | { type: "admin_run_status_checks"; data: Record<string, never> }
  | { type: "admin_clear_logs"; data: { scope: "all" | "filtered"; filters?: Record<string, unknown> } }
  | { type: "admin_user_update"; data: { userEmailOrId: string; patch: { action: "DEACTIVATE" | "ACTIVATE" } } }
  | { type: "admin_user_delete_permanently"; data: { userEmailOrId: string } }
  | { type: "admin_report_create"; data: { name: string; schedule: string; destination?: string; status?: "active" | "draft" } }
  | { type: "admin_report_update"; data: { reportId: string; patch: Record<string, unknown> } }
  | { type: "admin_report_delete"; data: { reportId: string } }
  | { type: "admin_report_run"; data: { reportId: string } }
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

function normName(s: string) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
}

function pickPatch(patch: Record<string, unknown>, allowed: string[]) {
  const out: Record<string, unknown> = {}
  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) out[k] = patch[k]
  }
  return out
}

function parseAction(raw: string): { text: string; action: ActionPayload | null } {
  const match = raw.match(/<action>([\s\S]*?)<\/action>/i)
  if (!match) return { text: raw, action: null }
  try {
    const text = raw.replace(/<action>[\s\S]*?<\/action>/gi, "").trim()
    // Guard: never store empty content — Zod schema requires min(1)
    return { text: text || "✓", action: JSON.parse(match[1]) as ActionPayload }
  }
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
  { icon: "ri-sparkling-2-line", label: "Weekly priorities", sub: "Focus your week", fill: "What should I prioritize this week across clients and projects?" },
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
    <div className="relative flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full">
      <NextImage
        src={getDicebearUrl(seed || initials)}
        alt={initials}
        fill
        className="object-cover"
        sizes="28px"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }}
      />
    </div>
  )
}

function AiAvatar() {
  return (
    <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-input bg-card">
      <NextImage src="/favicon.svg" alt="" width={16} height={16} className="size-4" />
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
  const [dangerText, setDangerText] = useState("")

  if (status === "done") return <p className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600"><CheckIcon className="size-3" /> Done</p>
  if (status === "cancelled") return <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><XIcon className="size-3" /> Cancelled</p>

  const isDestructive =
    action.type === "delete_project" ||
    action.type === "delete_task" ||
    action.type === "delete_contact" ||
    action.type === "archive_client" ||
    action.type === "delete_invoice" ||
    action.type === "delete_expense" ||
    action.type === "admin_clear_logs" ||
    action.type === "admin_user_delete_permanently" ||
    action.type === "admin_report_delete"

  const loading = status === "loading"
  const Icon =
    action.type === "create_client" ? UserPlusIcon
    : action.type === "create_project" ? FolderPlusIcon
    : action.type === "create_task" ? CheckIcon
    : action.type === "navigate" ? NavigationIcon
    : action.type === "get_analytics_overview" ? BarChart3Icon
    : action.type.startsWith("admin_") ? HistoryIcon
    : action.type === "create_invoice" ? FolderPlusIcon
    : action.type === "record_invoice_payment" ? CreditCardIcon
    : action.type.startsWith("edit_") ? PencilLineIcon
    : TrashIcon
  const label = (() => {
    if (action.type === "create_client") return `Create client — ${action.data.fullName}`
    if (action.type === "create_project") return `Create project — ${action.data.name}`
    if (action.type === "create_task") return `Add task "${action.data.title}" to ${action.data.projectName}`
    if (action.type === "edit_client") return `Edit client — ${action.data.clientName}`
    if (action.type === "archive_client") return `Archive client — ${action.data.clientName}`
    if (action.type === "edit_project") return `Edit project — ${action.data.projectName}`
    if (action.type === "delete_project") return `Delete project — ${action.data.projectName}`
    if (action.type === "edit_task") return `Edit task "${action.data.taskTitle}" in ${action.data.projectName}`
    if (action.type === "delete_task") return `Delete task "${action.data.taskTitle}" from ${action.data.projectName}`
    if (action.type === "edit_contact") return `Edit contact — ${action.data.contactName} (${action.data.clientName})`
    if (action.type === "delete_contact") return `Delete contact — ${action.data.contactName} (${action.data.clientName})`
    if (action.type === "create_invoice") return `Create ${action.data.documentType ?? "invoice"} — ${action.data.clientName}`
    if (action.type === "edit_invoice") return `Edit invoice — ${action.data.invoiceNumberOrId}`
    if (action.type === "delete_invoice") return `Delete invoice — ${action.data.invoiceNumberOrId}`
    if (action.type === "record_invoice_payment") return `Record payment — ${action.data.amountCents} cents on ${action.data.invoiceNumberOrId}`
    if (action.type === "create_expense") return `Create expense — ${action.data.amountCents} cents`
    if (action.type === "edit_expense") return `Edit expense — ${action.data.expenseId}`
    if (action.type === "delete_expense") return `Delete expense — ${action.data.expenseId}`
    if (action.type === "get_analytics_overview") return "Get analytics overview"
    if (action.type === "admin_get_dashboard") return "Admin: load dashboard snapshot"
    if (action.type === "admin_run_status_checks") return "Admin: run status checks"
    if (action.type === "admin_clear_logs") return `Admin: clear logs (${action.data.scope})`
    if (action.type === "admin_user_update") return `Admin: ${action.data.patch.action.toLowerCase()} user — ${action.data.userEmailOrId}`
    if (action.type === "admin_user_delete_permanently") return `Admin: permanently delete user — ${action.data.userEmailOrId}`
    if (action.type === "admin_report_create") return `Admin: create report — ${action.data.name}`
    if (action.type === "admin_report_update") return `Admin: update report — ${action.data.reportId}`
    if (action.type === "admin_report_delete") return `Admin: delete report — ${action.data.reportId}`
    if (action.type === "admin_report_run") return `Admin: run report — ${action.data.reportId}`
    return `Go to ${action.data.label}`
  })()

  const dangerOk = !isDestructive || dangerText.trim().toUpperCase() === "DELETE"

  return (
    <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3">
      <div className="flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15"><Icon className="size-3.5 text-primary" /></div>
        <p className="text-xs font-medium">{label}</p>
      </div>
      {status === "error" && <p className="mt-2 text-xs text-destructive">Failed — please try manually.</p>}
      {isDestructive && status !== "error" && (
        <div className="mt-2 rounded-lg border border-destructive/20 bg-destructive/5 px-2.5 py-2">
          <p className="text-[11px] font-medium text-destructive">This can’t be undone.</p>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              value={dangerText}
              onChange={(e) => setDangerText(e.target.value)}
              placeholder='Type "DELETE" to confirm'
              className="h-7 flex-1 rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-destructive/30"
            />
          </div>
        </div>
      )}
      <div className="mt-2.5 flex gap-2">
        <Button size="sm" className="h-7 gap-1 text-xs" disabled={loading || !dangerOk} onClick={onConfirm}>
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
  useAiSurfacePageView("chat")

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
        // Ensure content is never empty — Zod schema on the API requires min(1)
        return { role: m.role, content: m.content || "✓" }
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
      const appendAssistant = async (text: string) => {
        setMessages((p) => [...p, { id: uid(), role: "assistant" as Role, content: text, ts: new Date().toISOString() }])
        scrollDown()
      }

      const findOneByName = async <T extends { id: string; name: string },>(
        kindLabel: string,
        list: T[],
        targetName: string,
        viewHref: (id: string) => string
      ): Promise<T | null> => {
        const n = normName(targetName)
        const exact = list.filter((x) => normName(x.name) === n)
        if (exact.length === 1) return exact[0]!
        if (exact.length > 1) {
          setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "idle" } : m))
          await appendAssistant(
            `I found multiple ${kindLabel}s named **${targetName}**. Which one do you mean?\n\n` +
              exact.slice(0, 6).map((x) => `- **${x.name}** ([View →](${viewHref(x.id)}))`).join("\n")
          )
          return null
        }
        const partial = list.filter((x) => normName(x.name).includes(n) || n.includes(normName(x.name)))
        if (partial.length === 1) return partial[0]!
        if (partial.length > 1) {
          setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "idle" } : m))
          await appendAssistant(
            `I found multiple possible matches for **${targetName}**. Which ${kindLabel} do you mean?\n\n` +
              partial.slice(0, 6).map((x) => `- **${x.name}** ([View →](${viewHref(x.id)}))`).join("\n")
          )
          return null
        }
        setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "error" } : m))
        await appendAssistant(`I couldn't find a ${kindLabel} named **${targetName}**.`)
        return null
      }

      const looksLikeObjectId = (s: string) => /^[a-f\d]{24}$/i.test(String(s || "").trim())

      const resolveClientByName = async (clientName: string) => {
        const listRes = await fetch(`/api/clients?page=1&limit=200&search=${encodeURIComponent(clientName)}`, { credentials: "include" })
        if (!listRes.ok) throw new Error("Could not load clients")
        const { data: clients } = (await listRes.json()) as { data?: Array<{ id: string; fullName?: string; name?: string }> }
        const clientRows = (clients ?? []).map((c) => ({ id: c.id, name: String(c.name ?? c.fullName ?? "") }))
        return await findOneByName("client", clientRows, clientName, (id) => `/dashboard/clients/${id}`)
      }

      const resolveProjectByName = async (projectName: string) => {
        const listRes = await fetch(`/api/projects?limit=200&search=${encodeURIComponent(projectName)}`, { credentials: "include" })
        if (!listRes.ok) throw new Error("Could not load projects")
        const { data: projects } = (await listRes.json()) as { data?: Array<{ id: string; name: string }> }
        return await findOneByName("project", projects ?? [], projectName, (id) => `/dashboard/projects/${id}`)
      }

      const resolveInvoiceByNumberOrId = async (invoiceNumberOrId: string) => {
        const raw = String(invoiceNumberOrId || "").trim()
        if (looksLikeObjectId(raw)) return { id: raw, number: raw }

        const listRes = await fetch(`/api/invoices?limit=50&search=${encodeURIComponent(raw)}`, { credentials: "include" })
        if (!listRes.ok) throw new Error("Could not load invoices")
        const { data: rows } = (await listRes.json()) as { data?: Array<{ id: string; number: string }> }
        const n = normName(raw)
        const exact = (rows ?? []).filter((r) => normName(r.number) === n)
        if (exact.length === 1) return exact[0]!
        if (exact.length > 1) {
          setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "idle" } : m))
          await appendAssistant(
            `I found multiple invoices matching **${raw}**. Which one do you mean?\n\n` +
              exact.slice(0, 8).map((x) => `- **${x.number}** ([View →](/dashboard/invoices/${x.id}))`).join("\n")
          )
          return null
        }
        const partial = (rows ?? []).filter((r) => normName(r.number).includes(n) || n.includes(normName(r.number)))
        if (partial.length === 1) return partial[0]!
        if (partial.length > 1) {
          setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "idle" } : m))
          await appendAssistant(
            `I found multiple possible invoices for **${raw}**. Which one should I use?\n\n` +
              partial.slice(0, 8).map((x) => `- **${x.number}** ([View →](/dashboard/invoices/${x.id}))`).join("\n")
          )
          return null
        }
        setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "error" } : m))
        await appendAssistant(`I couldn't find an invoice matching **${raw}**.`)
        return null
      }

      const resolveAdminUserByEmailOrId = async (userEmailOrId: string) => {
        const raw = String(userEmailOrId || "").trim()
        if (looksLikeObjectId(raw)) return { id: raw, email: raw }
        const listRes = await fetch(`/api/admin/users?limit=50&search=${encodeURIComponent(raw)}`, { credentials: "include" })
        if (!listRes.ok) throw new Error("Could not load admin users")
        const { data } = (await listRes.json()) as { data?: Array<{ id: string; email: string; name: string }> }
        const exact = (data ?? []).filter((u) => normName(u.email) === normName(raw))
        if (exact.length === 1) return { id: exact[0]!.id, email: exact[0]!.email }
        if (exact.length > 1) {
          setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "idle" } : m))
          await appendAssistant(
            `I found multiple users matching **${raw}**. Which one?\n\n` +
              exact.slice(0, 8).map((u) => `- **${u.email}** (${u.name})`).join("\n")
          )
          return null
        }
        const partial = (data ?? []).filter((u) => normName(u.email).includes(normName(raw)) || normName(u.name).includes(normName(raw)))
        if (partial.length === 1) return { id: partial[0]!.id, email: partial[0]!.email }
        if (partial.length > 1) {
          setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "idle" } : m))
          await appendAssistant(
            `I found multiple possible users for **${raw}**. Which one?\n\n` +
              partial.slice(0, 8).map((u) => `- **${u.email}** (${u.name})`).join("\n")
          )
          return null
        }
        setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "error" } : m))
        await appendAssistant(`I couldn't find a user matching **${raw}**.`)
        return null
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
      if (action.type === "create_task") {
        // Find the project by name then create the task under it
        const listRes = await fetch(`/api/projects?limit=200&search=${encodeURIComponent(action.data.projectName)}`, { credentials: "include" })
        if (!listRes.ok) throw new Error("Could not load projects")
        const { data: projects } = (await listRes.json()) as { data?: Array<{ id: string; name: string }> }
        const match =
          (projects ?? []).find((p) => normName(p.name) === normName(action.data.projectName)) ??
          (projects ?? [])[0]
        if (!match) throw new Error("Project not found")
        const taskRes = await fetch(`/api/projects/${match.id}/tasks`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: action.data.title, priority: action.data.priority ?? "MEDIUM" }),
        })
        if (!taskRes.ok) throw new Error()
        setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "done" } : m))
        setMessages((p) => [...p, { id: uid(), role: "assistant" as Role, content: `✅ Task **${action.data.title}** added to project **${match.name}**. [View →](/dashboard/projects/${match.id})`, ts: new Date().toISOString() }])
        toast.success(`Task "${action.data.title}" added to "${match.name}"`)
        scrollDown(); return
      }

      if (action.type === "create_invoice") {
        const client = await resolveClientByName(action.data.clientName)
        if (!client) return
        const project =
          action.data.projectName ? await resolveProjectByName(action.data.projectName) : null
        if (action.data.projectName && !project) return

        const lineItems = (action.data.lineItems ?? []).map((li) => ({
          description: String(li.description ?? "").trim(),
          quantity: li.quantity ?? 1,
          unitAmountCents: li.unitAmountCents,
        })).filter((li) => li.description && Number.isFinite(li.unitAmountCents))

        const payload: Record<string, unknown> = {
          clientId: client.id,
          projectId: project?.id || undefined,
          documentType: action.data.documentType ?? "INVOICE",
          dueDate: action.data.dueDate,
          currency: action.data.currency ?? "EUR",
          taxRatePercent: action.data.taxRatePercent,
          title: action.data.title,
          notes: action.data.notes,
          lineItems,
        }
        if (!lineItems.length && action.data.amountCents != null) {
          payload.amountCents = action.data.amountCents
        } else if (action.data.amountCents != null) {
          payload.amountCents = action.data.amountCents
        }

        const res = await fetch("/api/invoices", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error()
        const { data } = (await res.json()) as { data?: { id?: string; number?: string } }
        setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "done" } : m))
        await appendAssistant(
          `✅ ${action.data.documentType ?? "Invoice"} **${data?.number ?? ""}** created for **${client.name}**.${data?.id ? ` [View →](/dashboard/invoices/${data.id})` : ""}`
        )
        toast.success("Invoice created")
        return
      }

      if (action.type === "edit_invoice" || action.type === "delete_invoice" || action.type === "record_invoice_payment") {
        const inv = await resolveInvoiceByNumberOrId(action.data.invoiceNumberOrId)
        if (!inv) return

        if (action.type === "delete_invoice") {
          const delRes = await fetch(`/api/invoices/${inv.id}`, { method: "DELETE", credentials: "include" })
          if (!delRes.ok) throw new Error()
          setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "done" } : m))
          await appendAssistant(`✅ Invoice **${inv.number}** deleted.`)
          toast.success("Invoice deleted")
          return
        }

        if (action.type === "record_invoice_payment") {
          const payRes = await fetch(`/api/invoices/${inv.id}/payments`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amountCents: action.data.amountCents,
              method: action.data.method || undefined,
              reference: action.data.reference || undefined,
              paidAt: action.data.paidAt || undefined,
            }),
          })
          if (!payRes.ok) throw new Error()
          setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "done" } : m))
          await appendAssistant(`✅ Payment recorded for invoice **${inv.number}**. [View →](/dashboard/invoices/${inv.id})`)
          toast.success("Payment recorded")
          return
        }

        const patchIn = action.data.patch ?? {}
        // Allow patch to specify clientName/projectName for convenience.
        const resolved: Record<string, unknown> = { ...patchIn }
        if (typeof resolved.clientName === "string") {
          const c = await resolveClientByName(resolved.clientName)
          if (!c) return
          resolved.clientId = c.id
          delete resolved.clientName
        }
        if (typeof resolved.projectName === "string") {
          const p = await resolveProjectByName(resolved.projectName)
          if (!p) return
          resolved.projectId = p.id
          delete resolved.projectName
        }

        const patch = pickPatch(resolved, [
          "clientId",
          "projectId",
          "documentType",
          "title",
          "status",
          "amountCents",
          "taxRatePercent",
          "currency",
          "dueDate",
          "issuedAt",
          "notes",
          "lineItems",
        ])
        const putRes = await fetch(`/api/invoices/${inv.id}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        })
        if (!putRes.ok) throw new Error()
        setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "done" } : m))
        await appendAssistant(`✅ Invoice **${inv.number}** updated. [View →](/dashboard/invoices/${inv.id})`)
        toast.success("Invoice updated")
        return
      }

      if (action.type === "create_expense") {
        const client =
          action.data.clientName ? await resolveClientByName(action.data.clientName) : null
        if (action.data.clientName && !client) return
        const project =
          action.data.projectName ? await resolveProjectByName(action.data.projectName) : null
        if (action.data.projectName && !project) return

        const payload: Record<string, unknown> = {
          vendor: action.data.vendor,
          category: action.data.category,
          status: action.data.status,
          amountCents: action.data.amountCents,
          currency: action.data.currency ?? "EUR",
          incurredAt: action.data.incurredAt,
          notes: action.data.notes,
          receiptUrl: action.data.receiptUrl,
          clientId: client?.id,
          projectId: project?.id,
        }

        const res = await fetch("/api/expenses", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error()
        const { data } = (await res.json()) as { data?: { id?: string } }
        setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "done" } : m))
        await appendAssistant(`✅ Expense created.${data?.id ? ` [View →](/dashboard/expenses)` : ""}`)
        toast.success("Expense created")
        return
      }

      if (action.type === "edit_expense" || action.type === "delete_expense") {
        const id = String(action.data.expenseId || "").trim()
        if (!looksLikeObjectId(id)) {
          setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "error" } : m))
          await appendAssistant("That expense id doesn't look valid.")
          return
        }

        if (action.type === "delete_expense") {
          const delRes = await fetch(`/api/expenses/${id}`, { method: "DELETE", credentials: "include" })
          if (!delRes.ok) throw new Error()
          setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "done" } : m))
          await appendAssistant("✅ Expense deleted.")
          toast.success("Expense deleted")
          return
        }

        const patch = pickPatch(action.data.patch ?? {}, [
          "vendor",
          "category",
          "status",
          "amountCents",
          "currency",
          "incurredAt",
          "notes",
          "receiptUrl",
          "clientId",
          "projectId",
        ])
        const putRes = await fetch(`/api/expenses/${id}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        })
        if (!putRes.ok) throw new Error()
        setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "done" } : m))
        await appendAssistant("✅ Expense updated.")
        toast.success("Expense updated")
        return
      }

      if (action.type === "get_analytics_overview") {
        const res = await fetch("/api/analytics/overview", { credentials: "include" })
        if (!res.ok) throw new Error()
        const json = (await res.json()) as { data?: Record<string, unknown> }
        const d = json.data ?? {}
        const revenueMtdCents = Number(d.revenueMtdCents ?? 0)
        const expensesMtdCents = Number(d.expensesMtdCents ?? 0)
        const netMtdCents = Number(d.netMtdCents ?? (revenueMtdCents - expensesMtdCents))
        const outstandingCents = Number(d.outstandingCents ?? 0)
        const overdueCents = Number(d.overdueCents ?? 0)
        const interactions30Days = Number(d.interactions30Days ?? 0)

        const fmt = (c: number) => {
          const val = (Number.isFinite(c) ? c : 0) / 100
          return val.toLocaleString(undefined, { style: "currency", currency: "EUR", maximumFractionDigits: 2 })
        }

        setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "done" } : m))
        await appendAssistant(
          `### Analytics overview\n` +
            `- **Revenue (MTD)**: ${fmt(revenueMtdCents)}\n` +
            `- **Expenses (MTD)**: ${fmt(expensesMtdCents)}\n` +
            `- **Net (MTD)**: ${fmt(netMtdCents)}\n` +
            `- **Outstanding AR**: ${fmt(outstandingCents)}\n` +
            `- **Overdue**: ${fmt(overdueCents)}\n` +
            `- **Interactions (30d)**: ${Number.isFinite(interactions30Days) ? interactions30Days : 0}\n\n` +
            `[Open Analytics →](/dashboard/analytics)`
        )
        toast.success("Analytics loaded")
        return
      }

      if (action.type === "admin_get_dashboard") {
        const res = await fetch("/api/admin/dashboard", { credentials: "include" })
        if (!res.ok) throw new Error()
        const json = (await res.json()) as { data?: Record<string, unknown> }
        setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "done" } : m))
        await appendAssistant(
          `### Admin dashboard\n\n` +
            `\`\`\`\n${JSON.stringify(json.data ?? {}, null, 2).slice(0, 4000)}\n\`\`\`\n\n` +
            `[Open Admin →](/dashboard/admin)`
        )
        toast.success("Admin dashboard loaded")
        return
      }

      if (action.type === "admin_run_status_checks") {
        const res = await fetch("/api/admin/status", { credentials: "include" })
        if (!res.ok) throw new Error()
        const json = (await res.json()) as { data?: Record<string, unknown> }
        setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "done" } : m))
        await appendAssistant(
          `### Admin status checks\n\n` +
            `\`\`\`\n${JSON.stringify(json.data ?? {}, null, 2).slice(0, 4000)}\n\`\`\`\n\n` +
            `[Open Status →](/dashboard/admin/status)`
        )
        toast.success("Status checks complete")
        return
      }

      if (action.type === "admin_clear_logs") {
        const scope = action.data.scope
        const filters = action.data.filters ?? {}
        const sp = new URLSearchParams()
        sp.set("scope", scope)
        if (scope === "filtered") {
          const type = typeof filters.type === "string" ? filters.type : undefined
          const level = typeof filters.level === "string" ? filters.level : undefined
          const userId = typeof filters.userId === "string" ? filters.userId : undefined
          const q = typeof filters.q === "string" ? filters.q : undefined
          if (type) sp.set("type", type)
          if (level) sp.set("level", level)
          if (userId) sp.set("userId", userId)
          if (q) sp.set("q", q)
        }
        const res = await fetch(`/api/admin/logs?${sp.toString()}`, { method: "DELETE", credentials: "include" })
        if (!res.ok) throw new Error()
        const json = (await res.json()) as { deletedCount?: number }
        setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "done" } : m))
        await appendAssistant(`✅ Logs cleared (${scope}). Deleted: **${json.deletedCount ?? "?"}**.`)
        toast.success("Logs cleared")
        return
      }

      if (action.type === "admin_user_update") {
        const u = await resolveAdminUserByEmailOrId(action.data.userEmailOrId)
        if (!u) return
        const res = await fetch(`/api/admin/users/${u.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: action.data.patch.action }),
        })
        if (!res.ok) throw new Error()
        setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "done" } : m))
        await appendAssistant(`✅ User updated (**${action.data.patch.action}**): **${u.email}**.`)
        toast.success("User updated")
        return
      }

      if (action.type === "admin_user_delete_permanently") {
        const u = await resolveAdminUserByEmailOrId(action.data.userEmailOrId)
        if (!u) return
        const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE", credentials: "include" })
        if (!res.ok) throw new Error()
        setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "done" } : m))
        await appendAssistant(`✅ User permanently deleted: **${u.email}**.`)
        toast.success("User deleted")
        return
      }

      if (action.type === "admin_report_create") {
        const res = await fetch("/api/admin/reports", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: action.data.name,
            schedule: action.data.schedule,
            destination: action.data.destination ?? "",
            status: action.data.status ?? "draft",
          }),
        })
        if (!res.ok) throw new Error()
        const json = (await res.json()) as { data?: { id?: string; name?: string } }
        setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "done" } : m))
        await appendAssistant(`✅ Admin report created: **${json.data?.name ?? action.data.name}**.`)
        toast.success("Report created")
        return
      }

      if (action.type === "admin_report_update" || action.type === "admin_report_delete" || action.type === "admin_report_run") {
        const reportId = String(action.data.reportId || "").trim()
        if (!looksLikeObjectId(reportId)) {
          setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "error" } : m))
          await appendAssistant("That report id doesn't look valid.")
          return
        }

        if (action.type === "admin_report_delete") {
          const res = await fetch(`/api/admin/reports/${reportId}`, { method: "DELETE", credentials: "include" })
          if (!res.ok) throw new Error()
          setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "done" } : m))
          await appendAssistant("✅ Admin report deleted.")
          toast.success("Report deleted")
          return
        }

        if (action.type === "admin_report_run") {
          const res = await fetch(`/api/admin/reports/${reportId}/run`, { method: "POST", credentials: "include" })
          if (!res.ok) throw new Error()
          setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "done" } : m))
          await appendAssistant(`✅ Admin report run complete. [Open Reports →](/dashboard/admin/reports)`)
          toast.success("Report ran")
          return
        }

        const patch = pickPatch(action.data.patch ?? {}, ["name", "schedule", "destination", "status"])
        const res = await fetch(`/api/admin/reports/${reportId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        })
        if (!res.ok) throw new Error()
        setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "done" } : m))
        await appendAssistant("✅ Admin report updated.")
        toast.success("Report updated")
        return
      }

      if (action.type === "edit_project" || action.type === "delete_project") {
        const listRes = await fetch(`/api/projects?limit=200&search=${encodeURIComponent(action.data.projectName)}`, { credentials: "include" })
        if (!listRes.ok) throw new Error("Could not load projects")
        const { data: projects } = (await listRes.json()) as { data?: Array<{ id: string; name: string }> }
        const project = await findOneByName("project", projects ?? [], action.data.projectName, (id) => `/dashboard/projects/${id}`)
        if (!project) return

        if (action.type === "delete_project") {
          const delRes = await fetch(`/api/projects/${project.id}`, { method: "DELETE", credentials: "include" })
          if (!delRes.ok) throw new Error()
          setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "done" } : m))
          await appendAssistant(`✅ Project **${project.name}** deleted.`)
          toast.success(`Project "${project.name}" deleted`)
          return
        }

        const patch = pickPatch(action.data.patch ?? {}, [
          "name",
          "description",
          "notes",
          "status",
          "priority",
          "progress",
          "startDate",
          "endDate",
          "budgetCents",
          "currency",
          "clientId",
          "assignedClientIds",
        ])
        const putRes = await fetch(`/api/projects/${project.id}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        })
        if (!putRes.ok) throw new Error()
        setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "done" } : m))
        await appendAssistant(`✅ Project **${project.name}** updated. [View →](/dashboard/projects/${project.id})`)
        toast.success(`Project "${project.name}" updated`)
        return
      }

      if (
        action.type === "edit_task" ||
        action.type === "delete_task"
      ) {
        const listRes = await fetch(`/api/projects?limit=200&search=${encodeURIComponent(action.data.projectName)}`, { credentials: "include" })
        if (!listRes.ok) throw new Error("Could not load projects")
        const { data: projects } = (await listRes.json()) as { data?: Array<{ id: string; name: string }> }
        const project = await findOneByName("project", projects ?? [], action.data.projectName, (id) => `/dashboard/projects/${id}`)
        if (!project) return

        const tasksRes = await fetch(`/api/projects/${project.id}/tasks`, { credentials: "include" })
        if (!tasksRes.ok) throw new Error("Could not load tasks")
        const { data: tasks } = (await tasksRes.json()) as { data?: Array<{ id: string; title: string }> }
        const tNorm = normName(action.data.taskTitle)
        const exact = (tasks ?? []).filter((t) => normName(t.title) === tNorm)
        const task =
          exact.length === 1 ? exact[0] :
          exact.length > 1 ? null :
          (tasks ?? []).find((t) => normName(t.title).includes(tNorm) || tNorm.includes(normName(t.title))) ?? null

        if (!task) {
          setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: exact.length > 1 ? "idle" : "error" } : m))
          if (exact.length > 1) {
            await appendAssistant(
              `I found multiple tasks titled **${action.data.taskTitle}** in **${project.name}**. Which one should I use?\n\n` +
                exact.slice(0, 8).map((x) => `- **${x.title}**`).join("\n")
            )
          } else {
            await appendAssistant(`I couldn't find a task titled **${action.data.taskTitle}** in **${project.name}**.`)
          }
          return
        }

        if (action.type === "delete_task") {
          const delRes = await fetch(`/api/projects/${project.id}/tasks/${task.id}`, { method: "DELETE", credentials: "include" })
          if (!delRes.ok) throw new Error()
          setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "done" } : m))
          await appendAssistant(`✅ Task **${task.title}** deleted from **${project.name}**. [View →](/dashboard/projects/${project.id})`)
          toast.success(`Task "${task.title}" deleted`)
          return
        }

        const patch = pickPatch(action.data.patch ?? {}, [
          "title",
          "description",
          "status",
          "priority",
          "dueDate",
          "order",
        ])
        const patchRes = await fetch(`/api/projects/${project.id}/tasks/${task.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        })
        if (!patchRes.ok) throw new Error()
        setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "done" } : m))
        await appendAssistant(`✅ Task **${task.title}** updated in **${project.name}**. [View →](/dashboard/projects/${project.id})`)
        toast.success(`Task "${task.title}" updated`)
        return
      }

      if (action.type === "edit_client" || action.type === "archive_client" || action.type === "edit_contact" || action.type === "delete_contact") {
        const listRes = await fetch(`/api/clients?page=1&limit=200&search=${encodeURIComponent(action.data.clientName)}`, { credentials: "include" })
        if (!listRes.ok) throw new Error("Could not load clients")
        const { data: clients } = (await listRes.json()) as { data?: Array<{ id: string; fullName?: string; name?: string; company?: string; email?: string }> }
        const clientRows = (clients ?? []).map((c) => ({ id: c.id, name: String(c.name ?? c.fullName ?? "") }))
        const client = await findOneByName("client", clientRows, action.data.clientName, (id) => `/dashboard/clients/${id}`)
        if (!client) return

        if (action.type === "archive_client") {
          const delRes = await fetch(`/api/clients/${client.id}`, { method: "DELETE", credentials: "include" })
          if (!delRes.ok) throw new Error()
          setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "done" } : m))
          await appendAssistant(`✅ Client **${client.name}** archived. [View →](/dashboard/clients/${client.id})`)
          toast.success(`Client "${client.name}" archived`)
          return
        }

        if (action.type === "edit_client") {
          const patch = pickPatch(action.data.patch ?? {}, [
            "fullName",
            "email",
            "phone",
            "avatarUrl",
            "company",
            "jobTitle",
            "website",
            "birthday",
            "type",
            "status",
            "source",
            "industry",
            "language",
            "country",
            "city",
            "address",
            "timezone",
            "currency",
            "defaultRate",
            "notes",
            "tags",
            "isFavorite",
            "isArchived",
            "healthScore",
            "healthLabel",
            "firstContactAt",
            "nextFollowUpAt",
          ])
          const putRes = await fetch(`/api/clients/${client.id}`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
          })
          if (!putRes.ok) throw new Error()
          setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "done" } : m))
          await appendAssistant(`✅ Client **${client.name}** updated. [View →](/dashboard/clients/${client.id})`)
          toast.success(`Client "${client.name}" updated`)
          return
        }

        // Contact edit/delete need contact resolution within client
        const clientRes = await fetch(`/api/clients/${client.id}`, { credentials: "include" })
        if (!clientRes.ok) throw new Error("Could not load client details")
        const { data: clientData } = (await clientRes.json()) as { data?: { contacts?: Array<{ id: string; fullName?: string; email?: string }> } }
        const contacts = (clientData?.contacts ?? []).map((c) => ({ id: c.id, name: String(c.fullName ?? c.email ?? "") }))
        const contact = await findOneByName("contact", contacts, action.data.contactName, () => `/dashboard/clients/${client.id}`)
        if (!contact) return

        if (action.type === "delete_contact") {
          const delRes = await fetch(`/api/clients/${client.id}/contacts/${contact.id}`, { method: "DELETE", credentials: "include" })
          if (!delRes.ok) throw new Error()
          setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "done" } : m))
          await appendAssistant(`✅ Contact **${contact.name}** removed from **${client.name}**. [View →](/dashboard/clients/${client.id})`)
          toast.success(`Contact "${contact.name}" removed`)
          return
        }

        const patch = pickPatch(action.data.patch ?? {}, [
          "fullName",
          "email",
          "phone",
          "jobTitle",
          "isPrimary",
        ])
        const putRes = await fetch(`/api/clients/${client.id}/contacts/${contact.id}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        })
        if (!putRes.ok) throw new Error()
        setMessages((p) => p.map((m) => m.id === msgId ? { ...m, actionStatus: "done" } : m))
        await appendAssistant(`✅ Contact **${contact.name}** updated for **${client.name}**. [View →](/dashboard/clients/${client.id})`)
        toast.success(`Contact "${contact.name}" updated`)
        return
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
                <NextImage src="/favicon.svg" alt="" width={32} height={32} className="size-8" />
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
                            <NextImage
                              key={i}
                              src={img.dataUrl}
                              alt={img.name}
                              width={180}
                              height={112}
                              className="h-28 max-w-[180px] rounded-xl border border-input object-cover"
                              unoptimized
                            />
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
                  <NextImage
                    src={img.dataUrl}
                    alt={img.name}
                    width={56}
                    height={56}
                    className="h-14 w-14 rounded-lg border border-input object-cover"
                    unoptimized
                  />
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
