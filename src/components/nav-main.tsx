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
type BadgeTone = "lime" | "red" | "amber" | "violet" | "sky"

type SectionId =
  | "dashboard"
  | "clients"
  | "projects"
  | "finance"
  | "analytics"
  | "ai"
  | "automation"
  | "settings"
  | "security"
  | "billing"
  | "help"
  | "changelog"

interface NavItem {
  label: string
  href: string
  badge?: { label: string; tone: BadgeTone }
}

interface NavSection {
  id: SectionId
  label: string
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
      { label: "Smart Insights", href: "/dashboard/insights", badge: { label: "AI", tone: "lime" } },
      { label: "Activity Feed", href: "/dashboard/activity" },
    ],
  },
  {
    id: "clients",
    label: "Clients",
    icon: <Ri name="group-line" />,
    badge: { label: "24", tone: "lime" },
    items: [
      { label: "All Clients", href: "/dashboard/clients" },
      { label: "Pipeline", href: "/dashboard/clients/pipeline" },
      { label: "Segments", href: "/dashboard/clients/segments" },
      { label: "Import / Export", href: "/dashboard/clients/import" },
    ],
  },
  {
    id: "projects",
    label: "Projects",
    icon: <Ri name="folder-line" />,
    badge: { label: "3", tone: "amber" },
    items: [
      { label: "All Projects", href: "/dashboard/projects" },
      { label: "Kanban View", href: "/dashboard/projects/kanban" },
      { label: "Calendar", href: "/dashboard/projects/calendar" },
      { label: "Time Tracking", href: "/dashboard/projects/time" },
      { label: "Reports", href: "/dashboard/projects/reports" },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    icon: <Ri name="wallet-3-line" />,
    badge: { label: "3", tone: "red" },
    items: [
      { label: "Overview", href: "/dashboard/finance" },
      { label: "Invoices", href: "/dashboard/invoices", badge: { label: "3 unpaid", tone: "red" } },
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
      { label: "Revenue", href: "/dashboard/analytics/revenue" },
      { label: "Client Analysis", href: "/dashboard/analytics/clients" },
      { label: "Productivity", href: "/dashboard/analytics/productivity" },
      { label: "Forecast", href: "/dashboard/analytics/forecast", badge: { label: "AI", tone: "lime" } },
    ],
  },
]

const AI_SECTIONS: NavSection[] = [
  {
    id: "ai",
    label: "AI Assistant",
    icon: <Ri name="sparkling-line" />,
    badge: { label: "Beta", tone: "violet" },
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
      { label: "Smart Reminders", href: "/dashboard/automation/reminders" },
      { label: "Workflows", href: "/dashboard/automation/workflows" },
      { label: "Templates", href: "/dashboard/automation/templates" },
    ],
  },
]

const SYSTEM_SECTIONS: NavSection[] = [
  {
    id: "settings",
    label: "Settings",
    icon: <Ri name="settings-3-line" />,
    items: [
      { label: "Profile", href: "/dashboard/settings/profile" },
      { label: "Company Info", href: "/dashboard/settings/company" },
      { label: "Branding", href: "/dashboard/settings/branding" },
      { label: "Notifications", href: "/dashboard/settings/notifications" },
      { label: "Integrations", href: "/dashboard/settings/integrations" },
    ],
  },
  {
    id: "security",
    label: "Security",
    icon: <Ri name="shield-line" />,
    items: [
      { label: "Password & Auth", href: "/dashboard/settings/security" },
      { label: "Two-Factor Auth", href: "/dashboard/settings/security/2fa" },
      { label: "Sessions", href: "/dashboard/settings/security/sessions" },
    ],
  },
  {
    id: "billing",
    label: "Billing",
    icon: <Ri name="bank-card-line" />,
    items: [
      { label: "Plan & Usage", href: "/dashboard/billing" },
      { label: "Upgrade", href: "/dashboard/billing/upgrade" },
      { label: "Subscription Invoices", href: "/dashboard/billing/invoices" },
    ],
  },
]

const SUPPORT_SECTIONS: NavSection[] = [
  {
    id: "help",
    label: "Help Center",
    icon: <Ri name="question-line" />,
    items: [
      { label: "Documentation", href: "/dashboard/help/docs" },
      { label: "Tutorials", href: "/dashboard/help/tutorials" },
      { label: "Contact Support", href: "/dashboard/help/contact" },
    ],
  },
  {
    id: "changelog",
    label: "Changelog",
    icon: <Ri name="rocket-line" />,
    badge: { label: "New", tone: "lime" },
    items: [
      { label: "New Features", href: "/dashboard/changelog" },
      { label: "Updates", href: "/dashboard/changelog/updates" },
    ],
  },
]

/* ─── Badge utility ──────────────────────────────────────────── */
function badgeToneClasses(tone: BadgeTone) {
  switch (tone) {
    case "red":    return "bg-red-500/15 text-red-400"
    case "amber":  return "bg-amber-500/15 text-amber-400"
    case "violet": return "bg-violet-500/15 text-violet-400"
    case "sky":    return "bg-sky-500/15 text-sky-400"
    case "lime":
    default:       return "bg-lime-500/15 text-lime-400"
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
        const anyChildActive = section.items.some((item) => isActiveHref(item.href))

        return (
          <div key={section.id} className="space-y-0.5">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="sm"
                  className={[
                    "h-[34px] justify-between rounded-md px-2 text-xs",
                    anyChildActive
                      ? "bg-primary/15 font-medium text-primary"
                      : "text-sidebar-foreground/75 hover:text-sidebar-foreground",
                  ].join(" ")}
                  onClick={() => toggleSection(section.id)}
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
                    <i
                      className={[
                        "ri-arrow-down-s-line text-base leading-none transition-transform duration-200",
                        isOpen ? "rotate-180" : "rotate-0",
                      ].join(" ")}
                      aria-hidden
                    />
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>

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
                            ? "h-[30px] rounded-md font-medium text-primary"
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
        <SectionGroup sections={SUPPORT_SECTIONS} defaultOpen={false} />

      </SidebarGroupContent>
    </SidebarGroup>
  )
}
