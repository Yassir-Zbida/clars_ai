"use client"

import {
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import { NavDashboardSection } from "@/components/nav/nav-dashboard"
import { Ri } from "@/components/nav/sidebar-ri"
import type { NavSection } from "@/components/nav/sidebar-nav-types"
import { SectionGroup, SidebarDivider } from "@/components/nav/sidebar-section-group"

const MAIN_SECTIONS: NavSection[] = [
  {
    id: "clients",
    label: "Contacts",
    href: "/dashboard/clients",
    icon: <Ri name="group-line" />,
    items: [],
  },
  {
    id: "projects",
    label: "Projects",
    href: "/dashboard/projects",
    icon: <Ri name="folder-line" />,
    items: [],
  },
  {
    id: "finance",
    label: "Finance",
    icon: <Ri name="wallet-3-line" />,
    items: [
      { label: "Overview", href: "/dashboard/finance" },
      { label: "Invoices", href: "/dashboard/invoices" },
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
      { label: "Forecast", href: "/dashboard/analytics/forecast" },
    ],
  },
]

const AI_SECTIONS: NavSection[] = [
  {
    id: "ai",
    label: "Clars Assistant",
    icon: <Ri name="sparkling-line" />,
    items: [
      { label: "Chat", href: "/dashboard/ai" },
      { label: "Email Generator", href: "/dashboard/ai/email" },
      { label: "Reports Generator", href: "/dashboard/ai/reports" },
    ],
  },
]

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

export function NavMain() {
  return (
    <SidebarGroup className="p-2 pt-0">
      <SidebarGroupContent className="flex flex-col gap-0.5">
        {/* Clars Assistant — first */}
        <SectionGroup sections={AI_SECTIONS} defaultOpen={false} />

        <SidebarDivider />

        <NavDashboardSection />

        <SidebarDivider />

        <SectionGroup sections={MAIN_SECTIONS} defaultOpen={false} />

        <SidebarDivider />

        <div className="mb-0.5 px-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/60">
            System
          </span>
        </div>
        <SectionGroup sections={SYSTEM_SECTIONS} defaultOpen={false} />

        <SidebarDivider />

        <div className="mb-0.5 px-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/60">
            Support
          </span>
        </div>
        <SectionGroup sections={SUPPORT_SECTIONS} defaultOpen={false} />
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
