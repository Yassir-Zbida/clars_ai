"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

import { useAdminSidebarMode } from "@/hooks/use-admin-sidebar-mode"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { BellIcon, XIcon } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Searchable pages list ──────────────────────────────────────────────────

const NAV_PAGES = [
  { label: "Dashboard",         href: "/dashboard",                       icon: "ri-dashboard-line",         cat: "Pages" },
  { label: "Contacts",          href: "/dashboard/clients",               icon: "ri-group-line",             cat: "Pages" },
  { label: "Projects",          href: "/dashboard/projects",              icon: "ri-folder-line",            cat: "Pages" },
  { label: "Finance Overview",  href: "/dashboard/finance",               icon: "ri-wallet-3-line",          cat: "Pages" },
  { label: "Invoices",          href: "/dashboard/invoices",              icon: "ri-file-list-3-line",       cat: "Pages" },
  { label: "Quotes",            href: "/dashboard/invoices?type=quote",   icon: "ri-receipt-line",           cat: "Pages" },
  { label: "Payments",          href: "/dashboard/payments",              icon: "ri-money-dollar-circle-line",cat: "Pages" },
  { label: "Expenses",          href: "/dashboard/expenses",              icon: "ri-price-tag-3-line",       cat: "Pages" },
  { label: "Analytics",         href: "/dashboard/analytics",             icon: "ri-bar-chart-2-line",       cat: "Pages" },
  { label: "Revenue Analytics", href: "/dashboard/analytics/revenue",     icon: "ri-line-chart-line",        cat: "Pages" },
  { label: "Client Analysis",   href: "/dashboard/analytics/clients",     icon: "ri-pie-chart-line",         cat: "Pages" },
  { label: "Productivity",      href: "/dashboard/analytics/productivity",icon: "ri-tools-line",             cat: "Pages" },
  { label: "Forecast",          href: "/dashboard/analytics/forecast",    icon: "ri-rocket-line",            cat: "Pages" },
  { label: "Admin Overview",    href: "/dashboard/admin",                  icon: "ri-shield-keyhole-line",    cat: "Admin" },
  { label: "System Status",     href: "/dashboard/admin/status",           icon: "ri-pulse-line",             cat: "Admin" },
  { label: "Manage Users",      href: "/dashboard/admin/users",            icon: "ri-user-settings-line",     cat: "Admin" },
  { label: "Logs & Errors",     href: "/dashboard/admin/logs",             icon: "ri-bug-line",               cat: "Admin" },
  { label: "Survey Center",     href: "/dashboard/admin/surveys",          icon: "ri-survey-line",            cat: "Admin" },
  { label: "AI Analytics",      href: "/dashboard/admin/ai-analytics",     icon: "ri-cpu-line",               cat: "Admin" },
  { label: "Admin Reports",     href: "/dashboard/admin/reports",          icon: "ri-file-chart-line",        cat: "Admin" },
  { label: "AI Chat",           href: "/dashboard/ai",                    icon: "ri-sparkling-line",         cat: "Pages" },
  { label: "Email Generator",   href: "/dashboard/ai/email",              icon: "ri-mail-ai-line",           cat: "Pages" },
  { label: "Reports Generator", href: "/dashboard/ai/reports",            icon: "ri-file-chart-line",        cat: "Pages" },
  { label: "Settings",          href: "/dashboard/settings",              icon: "ri-settings-3-line",        cat: "Pages" },
  { label: "Billing",           href: "/dashboard/billing",               icon: "ri-bank-card-line",         cat: "Pages" },
  { label: "Help",              href: "/dashboard/help",                  icon: "ri-question-line",          cat: "Pages" },
]

// ─── Search ─────────────────────────────────────────────────────────────────

type SearchResult = { label: string; href: string; icon: string; cat: string; sub?: string }

function useDebounce<T>(value: T, ms: number): T {
  const [d, setD] = React.useState(value)
  React.useEffect(() => { const t = setTimeout(() => setD(value), ms); return () => clearTimeout(t) }, [value, ms])
  return d
}

function SidebarSearchRow({ isAdminMode }: { isAdminMode: boolean }) {
  const router = useRouter()
  const [query, setQuery] = React.useState("")
  const [liveResults, setLiveResults] = React.useState<SearchResult[]>([])
  const [open, setOpen] = React.useState(false)
  const [activeIdx, setActiveIdx] = React.useState(0)
  const dq = useDebounce(query, 220)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // ⌘K focus shortcut
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        document.getElementById("sidebar-search-input")?.focus()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  // Close on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Static filter
  const allowedPages = React.useMemo(
    () => NAV_PAGES.filter((p) => (isAdminMode ? p.cat === "Admin" : p.cat !== "Admin")),
    [isAdminMode]
  )

  const pageResults = React.useMemo<SearchResult[]>(() => {
    if (!dq.trim()) return []
    const q = dq.toLowerCase()
    return allowedPages.filter((p) => p.label.toLowerCase().includes(q))
  }, [dq, allowedPages])

  // Live API search for contacts + projects
  React.useEffect(() => {
    if (isAdminMode) { setLiveResults([]); return }
    if (dq.trim().length < 2) { setLiveResults([]); return }
    let cancelled = false
    Promise.all([
      fetch(`/api/clients?search=${encodeURIComponent(dq)}&limit=5`, { credentials: "include" }).then((r) => r.ok ? r.json() : { data: [] }),
      fetch(`/api/projects?search=${encodeURIComponent(dq)}&limit=5`, { credentials: "include" }).then((r) => r.ok ? r.json() : { data: [] }),
    ]).then(([clients, projects]) => {
      if (cancelled) return
      const results: SearchResult[] = [
        ...(clients.data ?? []).map((c: { id?: string; _id?: string; fullName?: string; company?: string }) => ({
          label: c.fullName ?? "Contact",
          href:  `/dashboard/clients/${c.id ?? c._id}`,
          icon:  "ri-user-line",
          cat:   "Contacts",
          sub:   c.company || undefined,
        })),
        ...(projects.data ?? []).map((p: { id?: string; _id?: string; name?: string; status?: string }) => ({
          label: p.name ?? "Project",
          href:  `/dashboard/projects/${p.id ?? p._id}`,
          icon:  "ri-folder-open-line",
          cat:   "Projects",
          sub:   p.status || undefined,
        })),
      ]
      setLiveResults(results)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [dq, isAdminMode])

  const allResults = React.useMemo(() => [...pageResults, ...liveResults], [pageResults, liveResults])

  React.useEffect(() => { setActiveIdx(0) }, [allResults])

  function go(href: string) {
    router.push(href)
    setQuery("")
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || !allResults.length) return
    if (e.key === "ArrowDown")  { e.preventDefault(); setActiveIdx((i) => (i + 1) % allResults.length) }
    if (e.key === "ArrowUp")    { e.preventDefault(); setActiveIdx((i) => (i - 1 + allResults.length) % allResults.length) }
    if (e.key === "Enter")      { e.preventDefault(); if (allResults[activeIdx]) go(allResults[activeIdx].href) }
    if (e.key === "Escape")     { setQuery(""); setOpen(false) }
  }

  // Group results by category
  const grouped = React.useMemo(() => {
    const map: Record<string, SearchResult[]> = {}
    allResults.forEach((r) => { (map[r.cat] ??= []).push(r) })
    return Object.entries(map)
  }, [allResults])

  return (
    <div ref={containerRef} className="relative flex items-center gap-2">
      <div className="relative flex-1 min-w-0">
        <SidebarInput
          id="sidebar-search-input"
          type="search"
          placeholder="Search…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => query && setOpen(true)}
          onKeyDown={onKeyDown}
          className="h-8 min-w-0 flex-1 rounded-md text-xs bg-sidebar pr-7"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(""); setOpen(false) }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-3" />
          </button>
        )}
      </div>

      {!isAdminMode && (
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none">
            <i className="ri-add-line text-sm" />
            New
            <i className="ri-arrow-down-s-line text-sm" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="end" className="w-44">
            <DropdownMenuItem onClick={() => router.push("/dashboard/clients")}>
              <i className="ri-user-add-line mr-2" />Contact
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/dashboard/projects")}>
              <i className="ri-folder-add-line mr-2" />Project
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/dashboard/invoices")}>
              <i className="ri-file-add-line mr-2" />New invoice
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/dashboard/invoices?type=quote")}>
              <i className="ri-receipt-line mr-2" />New quote
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Search results dropdown */}
      {open && allResults.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-xl border border-input bg-popover shadow-lg">
          {grouped.map(([cat, items]) => (
            <div key={cat}>
              <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{cat}</p>
              {items.map((r, i) => {
                const globalIdx = allResults.indexOf(r)
                return (
                  <button
                    key={r.href}
                    type="button"
                    onMouseEnter={() => setActiveIdx(globalIdx)}
                    onClick={() => go(r.href)}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-xs transition-colors",
                      globalIdx === activeIdx ? "bg-muted" : "hover:bg-muted/60"
                    )}
                  >
                    <i className={cn(r.icon, "shrink-0 text-sm text-muted-foreground")} />
                    <span className="min-w-0 flex-1 truncate font-medium">{r.label}</span>
                    {r.sub && <span className="shrink-0 text-[10px] text-muted-foreground capitalize">{r.sub.toLowerCase()}</span>}
                  </button>
                )
              })}
            </div>
          ))}
          <p className="border-t border-input px-3 py-1.5 text-[11px] text-muted-foreground/70">
            ↑↓ navigate · Enter to open · Esc to close
          </p>
        </div>
      )}

      {open && query.trim().length >= 2 && allResults.length === 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-xl border border-input bg-popover px-3 py-4 text-center text-xs text-muted-foreground shadow-lg">
          No results for &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  )
}

// ─── Notifications ───────────────────────────────────────────────────────────

type Notif = {
  id: string
  icon: string
  iconBg: string
  iconColor: string
  title: string
  sub: string
  href: string
  urgent?: boolean
}

const SEEN_KEY = "clars-notif-seen"

function useNotifications() {
  const [notifs, setNotifs] = React.useState<Notif[]>([])
  const [loading, setLoading] = React.useState(true)
  const [lastSeen, setLastSeen] = React.useState<number>(() => {
    if (typeof window === "undefined") return 0
    return Number(localStorage.getItem(SEEN_KEY) ?? 0)
  })

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [invRes, cliRes] = await Promise.all([
          fetch("/api/invoices?limit=50&documentType=INVOICE", { credentials: "include" }),
          fetch("/api/clients?limit=50", { credentials: "include" }),
        ])
        const [invJson, cliJson] = await Promise.all([
          invRes.ok ? invRes.json() : { data: [] },
          cliRes.ok ? cliRes.json() : { data: [] },
        ])
        if (cancelled) return

        const now = Date.now()
        const items: Notif[] = []

        // Overdue invoices
        for (const inv of (invJson.data ?? []) as Array<{ id?: string; _id?: string; number?: string; status?: string; dueDate?: string; amountCents?: number; currency?: string; clientName?: string }>) {
          if (!["SENT", "PARTIALLY_PAID"].includes(inv.status ?? "")) continue
          if (!inv.dueDate) continue
          if (new Date(inv.dueDate).getTime() > now) continue
          const clientLabel = inv.clientName ?? "client"
          const days = Math.floor((now - new Date(inv.dueDate).getTime()) / 86400000)
          const daysLabel = days === 0 ? "due today" : `${days}d overdue`
          items.push({
            id: `inv-${inv.id ?? inv._id}`,
            icon: "ri-file-warning-line",
            iconBg: "bg-red-500/10",
            iconColor: "text-red-500",
            title: `Invoice ${inv.number ?? ""} overdue`,
            sub: `${clientLabel} · ${daysLabel}`,
            href: `/dashboard/invoices`,
            urgent: true,
          })
        }

        // Upcoming follow-ups (next 7 days)
        const sevenDays = now + 7 * 86400000
        for (const cli of (cliJson.data ?? []) as Array<{ id?: string; _id?: string; fullName?: string; nextFollowUpAt?: string }>) {
          if (!cli.nextFollowUpAt) continue
          const t = new Date(cli.nextFollowUpAt).getTime()
          if (t < now || t > sevenDays) continue
          const daysUntil = Math.floor((t - now) / 86400000)
          items.push({
            id: `fu-${cli.id ?? cli._id}`,
            icon: "ri-calendar-check-line",
            iconBg: "bg-blue-500/10",
            iconColor: "text-blue-500",
            title: `Follow-up: ${cli.fullName}`,
            sub: daysUntil === 0 ? "Today" : `In ${daysUntil} day${daysUntil > 1 ? "s" : ""}`,
            href: `/dashboard/clients/${cli.id ?? cli._id}`,
          })
        }

        setNotifs(items.slice(0, 12))
      } catch { /* silent */ } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const unread = notifs.filter((n) => {
    // Treat all urgent overdue invoices as unread until user opens panel
    return n.urgent && lastSeen === 0
  }).length + notifs.filter((n) => !n.urgent).length

  function markSeen() {
    const ts = Date.now()
    localStorage.setItem(SEEN_KEY, String(ts))
    setLastSeen(ts)
  }

  return { notifs, loading, unread: Math.min(unread, 99), markSeen }
}

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const { notifs, loading, markSeen } = useNotifications()

  React.useEffect(() => { markSeen() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex w-72 flex-col rounded-xl border border-input bg-popover shadow-xl">
      <div className="flex items-center justify-between border-b border-input px-3 py-2.5">
        <p className="text-xs font-semibold">Notifications</p>
        <button type="button" onClick={onClose} className="rounded p-0.5 text-muted-foreground hover:text-foreground">
          <XIcon className="size-3.5" />
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <i className="ri-loader-4-line animate-spin text-lg text-muted-foreground" />
          </div>
        ) : notifs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-muted">
              <BellIcon className="size-4 text-muted-foreground" />
            </span>
            <p className="text-xs text-muted-foreground">You&apos;re all caught up!</p>
          </div>
        ) : (
          notifs.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => { router.push(n.href); onClose() }}
              className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/60"
            >
              <span className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg", n.iconBg)}>
                <i className={cn(n.icon, n.iconColor, "text-xs")} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold leading-snug">{n.title}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{n.sub}</p>
              </div>
              {n.urgent && <span className="mt-1 size-1.5 shrink-0 rounded-full bg-red-500" />}
            </button>
          ))
        )}
      </div>

      <div className="border-t border-input px-3 py-2">
        <button
          type="button"
          onClick={() => { router.push("/dashboard/finance"); onClose() }}
          className="text-[11px] text-primary hover:underline"
        >
          View all in Finance →
        </button>
      </div>
    </div>
  )
}

function BellButton() {
  const [open, setOpen] = React.useState(false)
  const [panelPos, setPanelPos] = React.useState<{ top: number; left: number } | null>(null)
  const { unread, markSeen } = useNotifications()
  const btnRef = React.useRef<HTMLButtonElement>(null)
  const panelRef = React.useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => { setMounted(true) }, [])

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        panelRef.current && !panelRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  function openPanel() {
    if (open) { setOpen(false); return }
    const rect = btnRef.current?.getBoundingClientRect()
    if (rect) setPanelPos({ top: rect.bottom + 6, left: rect.left })
    setOpen(true)
    markSeen()
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label="Notifications"
        onClick={openPanel}
        className="relative flex size-8 shrink-0 items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <BellIcon className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-[14px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold leading-[14px] text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {mounted && open && panelPos && createPortal(
        <div
          ref={panelRef}
          style={{ position: "fixed", top: panelPos.top, left: panelPos.left, zIndex: 9999 }}
        >
          <NotificationPanel onClose={() => setOpen(false)} />
        </div>,
        document.body
      )}
    </>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession()
  const { adminMode } = useAdminSidebarMode()
  const homeHref = adminMode ? "/dashboard/admin" : "/dashboard"
  const user = {
    name: session?.user?.name ?? "User",
    email: session?.user?.email ?? "",
    avatar: session?.user?.image ?? "",
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="flex flex-row items-center justify-between gap-2 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:!p-1.5"
              render={<a href={homeHref} />}
              tooltip="Workspace home"
            >
              <img src="/logo.svg" alt="Clars.ai" className="h-7 w-auto" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {!adminMode && <BellButton />}
      </SidebarHeader>

      <SidebarContent className="overflow-y-auto">
        <div className="p-2">
          <SidebarSearchRow isAdminMode={adminMode} />
        </div>
        <NavMain />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
