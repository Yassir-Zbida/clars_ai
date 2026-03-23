"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import type { BadgeTone, NavSection } from "@/components/nav/sidebar-nav-types"

export function badgeToneClasses(tone: BadgeTone) {
  switch (tone) {
    case "danger":
      return "bg-red-500/15 text-red-400"
    case "warning":
      return "bg-amber-500/15 text-amber-400"
    case "ai":
      return "bg-violet-500/15 text-violet-400"
    case "info":
      return "bg-blue-500/15 text-blue-400"
    case "success":
    default:
      return "bg-emerald-500/15 text-emerald-400"
  }
}

export function SidebarDivider() {
  return <div className="mx-2 my-1.5 h-px bg-sidebar-border/60" />
}

export function SectionGroup({
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
                      : "text-sidebar-foreground hover:text-foreground",
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
                              : "h-[30px] rounded-md text-sidebar-foreground/90 hover:text-foreground"
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
