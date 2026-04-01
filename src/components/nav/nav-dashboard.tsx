"use client"

import { DASHBOARD_HOME_LINKS } from "@/lib/dashboard-home-nav"
import { Ri } from "@/components/nav/sidebar-ri"
import type { NavItem, NavSection } from "@/components/nav/sidebar-nav-types"
import { SectionGroup } from "@/components/nav/sidebar-section-group"

function homeLinksToNavItems(): NavItem[] {
  return DASHBOARD_HOME_LINKS.map((link) => ({
    label: link.label,
    href: link.href,
  }))
}

const DASHBOARD_SECTION: NavSection = {
  id: "dashboard",
  label: "Dashboard",
  icon: <Ri name="home-5-line" />,
  items: homeLinksToNavItems(),
}

/** First sidebar block: Dashboard (Overview, Smart Insights, Activity). */
export function NavDashboardSection() {
  return (
    <>
      <div className="mb-0.5 px-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/60">
          Workspace
        </span>
      </div>
      <SectionGroup sections={[DASHBOARD_SECTION]} defaultOpenFirst />
    </>
  )
}
