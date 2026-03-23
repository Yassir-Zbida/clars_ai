import type * as React from "react"

export type BadgeTone = "success" | "danger" | "warning" | "ai" | "info"

export type SectionId =
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
