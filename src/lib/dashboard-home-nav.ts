/** Single source of truth for Overview · Insights · Activity (sidebar + top subnav). */
export type DashboardHomeLink = {
  href: string
  label: string
  /** When true, only exact pathname match counts as active (e.g. `/dashboard`). */
  end?: boolean
}

export const DASHBOARD_HOME_LINKS: DashboardHomeLink[] = [
  { href: "/dashboard", label: "Overview", end: true },
  { href: "/dashboard/insights", label: "Smart Insights" },
  { href: "/dashboard/activity", label: "Activity feed" },
]
