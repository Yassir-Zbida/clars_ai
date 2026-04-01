import type * as React from "react"

export type BadgeTone = "success" | "danger" | "warning" | "ai" | "info"

export type SectionId =
  | "dashboard"
  | "clients"
  | "projects"
  | "finance"
  | "analytics"
  | "admin"
  | "admin-overview"
  | "admin-status"
  | "admin-users"
  | "admin-logs"
  | "admin-surveys"
  | "admin-ai-analytics"
  | "admin-reports"
  | "ai"
  | "settings"
  | "billing"
  | "help"

export interface NavItem {
  label: string
  href: string
  badge?: { label: string; tone: BadgeTone }
}

export interface NavSection {
  id: SectionId
  label: string
  href?: string
  icon: React.ReactNode
  badge?: { label: string; tone: BadgeTone }
  items: NavItem[]
}
