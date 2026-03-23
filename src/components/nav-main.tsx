"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

/* ─── Remix Icon helper ──────────────────────────────────────── */
function Ri({ name, className }: { name: string; className?: string }) {
  return (
    <i
      className={`ri-${name} text-base leading-none ${className ?? ""}`}
      aria-hidden
    />
  )
}

/* ─── Types ──────────────────────────────────────────────────── */
type BadgeTone = "success" | "danger" | "warning" | "ai" | "info"

type SectionId =
  | "dashboard"
  | "clients"
  | "projects"
  | "finance"
  | "analytics"
  | "ai"
  | "automation"
  | "settings"
  | "billing"
  | "help"

interface NavItem {
  label: string
  href: string
  badge?: { label: string; tone: BadgeTone }
}

interface NavSection {
  id: SectionId
  label: string
  href?: string
  icon: React.ReactNode
  badge?: { label: string; tone: BadgeTone }
  items: NavItem[]
}

/* ─── Navigation data ────────────────────────────────────────── */
const MAIN_SECTIONS: NavSection[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <Ri name="home-5-line" />,
    items: [
      { label: "Overview", href: "/dashboard" },
      { label: "Smart Insights", href: "/dashboard/insights", badge: { label: "AI", tone: "ai" } },
      { label: "Activity Feed", href: "/dashboard/activity" },
    ],
  },
  {
    id: "clients",
    label: "Contacts",
    href: "/dashboard/clients",
    icon: <Ri name="group-line" />,
    badge: { label: "24", tone: "info" },
    items: [],
  },
  {
    id: "projects",
    label: "Projects",
    href: "/dashboard/projects",
    icon: <Ri name="folder-line" />,
    badge: { label: "3", tone: "warning" },
    items: [],
  },
  {
    id: "finance",
    label: "Finance",
    icon: <Ri name="wallet-3-line" />,
    badge: { label: "3", tone: "danger" },
    items: [
      { label: "Overview", href: "/dashboard/finance" },
      { label: "Invoices", href: "/dashboard/invoices", badge: { label: "3 unpaid", tone: "danger" } },
      { label: "Quotes", href: "/dashboard/invoices?type=quote" },
      { label: "Payments", href: "/dashboard/payments" },
      { label: "Expenses", href: "/dashboard/expenses" },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: <Ri name="bar-chart-line" />,
    items: [
      { label: "Overview", href: "/dashboard/analytics" },
      { label: "Revenue", href: "/dashboard/analytics/revenue" },
      { label: "Client Analysis", href: "/dashboard/analytics/clients" },
      { label: "Productivity", href: "/dashboard/analytics/productivity" },
      { label: "Forecast", href: "/dashboard/analytics/forecast", badge: { label: "AI", tone: "ai" } },
    ],
  },
]

const AI_SECTIONS: NavSection[] = [
  {
    id: "ai",
    label: "AI Assistant",
    icon: <Ri name="sparkling-line" />,
    badge: { label: "Beta", tone: "ai" },
    items: [
      { label: "Chat", href: "/dashboard/ai" },
      { label: "Email Generator", href: "/dashboard/ai/email" },
      { label: "Reports Generator", href: "/dashboard/ai/reports" },
    ],
  },
  {
    id: "automation",
    label: "Automation",
    icon: <Ri name="flashlight-line" />,
    items: [
      { label: "Overview", href: "/dashboard/automation" },
      { label: "Smart Reminders", href: "/dashboard/automation/reminders" },
      { label: "Workflows", href: "/dashboard/automation/workflows" },
      { label: "Templates", href: "/dashboard/automation/templates" },
    ],
  },
]

/** Single-link sections only — no empty placeholder routes. */
const SYSTEM_SECTIONS: NavSection[] = [
  {
    id: "settings",
    label: "Settings",
    href: "/dashboard/settings",
    icon: <Ri name="settings-3-line" />,
    items: [],
  },
  {
    id: "billing",
    label: "Billing",
    href: "/dashboard/billing",
    icon: <Ri name="bank-card-line" />,
    items: [],
  },
]

const SUPPORT_SECTIONS: NavSection[] = [
  {
    id: "help",
    label: "Help",
    href: "/dashboard/help",
    icon: <Ri name="question-line" />,
    items: [],
  },
]

/* ─── Badge utility ──────────────────────────────────────────── */
function badgeToneClasses(tone: BadgeTone) {
  switch (tone) {
    case "danger": return "bg-red-500/15 text-red-400"
    case "warning": return "bg-amber-500/15 text-amber-400"
    case "ai": return "bg-violet-500/15 text-violet-400"
    case "info": return "bg-blue-500/15 text-blue-400"
    case "success":
    default:
      return "bg-emerald-500/15 text-emerald-400"
  }
}


/* ─── Divider ────────────────────────────────────────────────── */
function SidebarDivider() {
  return <div className="mx-2 my-1.5 h-px bg-sidebar-border/60" />
}

/* ─── Reusable section group ─────────────────────────────────── */
function SectionGroup({
  sections,
  defaultOpen = false,
  defaultOpenFirst = false,
}: {
  sections: NavSection[]
  defaultOpen?: boolean
  defaultOpenFirst?: boolean
}) {
  const pathname = usePathname()

  const initialState = React.useMemo(() => {
    const state: Record<string, boolean> = {}
    sections.forEach((s, idx) => {
      const anyChildActive = s.items.some((item) => {
        if (!pathname) return false
        const cleanHref = item.href.split("?")[0]
        if (cleanHref === "/dashboard") return pathname === "/dashboard"
        return pathname.startsWith(cleanHref)
      })
      const isFirst = defaultOpenFirst && idx === 0
      state[s.id] = anyChildActive || defaultOpen || isFirst
    })
    return state
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>(initialState)

  const toggleSection = (id: string) =>
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }))

  const isActiveHref = (href: string) => {
    if (!pathname) return false
    const cleanHref = href.split("?")[0]
    if (cleanHref === "/dashboard") return pathname === "/dashboard"
    return pathname.startsWith(cleanHref)
  }

  return (
    <>
      {sections.map((section) => {
        const isOpen = openSections[section.id]
        const anyChildActive =
          (section.href ? isActiveHref(section.href) : false) ||
          section.items.some((item) => isActiveHref(item.href))
        const isSingleLink = Boolean(section.href) && section.items.length === 0

        return (
          <div key={section.id} className="space-y-0.5">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="sm"
                  className={[
                    "h-[34px] justify-between rounded-md px-2 text-xs",
                    anyChildActive
                      ? "bg-primary/10 font-medium text-[#6b9fd4]"
                      : "text-sidebar-foreground/75 hover:text-sidebar-foreground",
                  ].join(" ")}
                  {...(isSingleLink ? { render: <a href={section.href!} /> } : { onClick: () => toggleSection(section.id) })}
                >
                  <span className="flex items-center gap-2">
                    {section.icon}
                    <span>{section.label}</span>
                  </span>
                  <span className="ml-auto flex items-center gap-1.5">
                    {section.badge && (
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-1.5 text-[10px] font-medium",
                          badgeToneClasses(section.badge.tone),
                        ].join(" ")}
                      >
                        {section.badge.label}
                      </span>
                    )}
                    {!isSingleLink && (
                      <i
                        className={[
                          "ri-arrow-down-s-line text-base leading-none transition-transform duration-200",
                          isOpen ? "rotate-180" : "rotate-0",
                        ].join(" ")}
                        aria-hidden
                      />
                    )}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>

            {!isSingleLink && (
              <div
                className={[
                  "overflow-hidden transition-[max-height,opacity] duration-200 ease-out",
                  isOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0",
                ].join(" ")}
              >
                <SidebarMenuSub className="gap-0.5 py-0.5">
                  {section.items.map((item) => {
                    const active = isActiveHref(item.href)
                    return (
                      <SidebarMenuSubItem key={item.href}>
                        <SidebarMenuSubButton
                          href={item.href}
                          size="sm"
                          isActive={active}
                          className={
                            active
                              ? "h-[30px] rounded-md bg-primary/10 font-medium text-[#6b9fd4]"
                              : "h-[30px] rounded-md text-sidebar-foreground/65 hover:text-sidebar-foreground"
                          }
                        >
                          <span>{item.label}</span>
                          {item.badge && (
                            <span
                              className={[
                                "ml-auto inline-flex items-center rounded-full px-1.5 text-[10px] font-medium",
                                badgeToneClasses(item.badge.tone),
                              ].join(" ")}
                            >
                              {item.badge.label}
                            </span>
                          )}
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    )
                  })}
                </SidebarMenuSub>
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}

/* ─── Main export ────────────────────────────────────────────── */
export function NavMain() {
  return (
    <SidebarGroup className="p-2 pt-0">
      <SidebarGroupContent className="flex flex-col gap-0.5">

        {/* ── Main Navigation ────────────────────────────────── */}
        <SectionGroup sections={MAIN_SECTIONS} defaultOpenFirst={true} />

        <SidebarDivider />

        {/* ── AI Zone ────────────────────────────────────────── */}
        <div className="mb-0.5 px-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/35">
            AI Zone
          </span>
        </div>
        <SectionGroup sections={AI_SECTIONS} defaultOpen={false} />

        <SidebarDivider />

        {/* ── System ─────────────────────────────────────────── */}
        <div className="mb-0.5 px-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/35">
            System
          </span>
        </div>
        <SectionGroup sections={SYSTEM_SECTIONS} defaultOpen={false} />

        <SidebarDivider />

        {/* ── Support ────────────────────────────────────────── */}
        <div className="mb-0.5 px-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/35">
            Support
          </span>
        </div>
        <SectionGroup sections={SUPPORT_SECTIONS} defaultOpen={false} />

      </SidebarGroupContent>
    </SidebarGroup>
  )
}
