"use client"

import { usePathname } from "next/navigation"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

function getPageTitle(pathname: string | null): string {
  if (!pathname) return "Overview"
  if (pathname === "/dashboard") return "Overview"
  if (pathname.startsWith("/dashboard/insights")) return "Smart Insights"
  if (pathname.startsWith("/dashboard/activity")) return "Activity feed"
  if (pathname.startsWith("/dashboard/clients/pipeline")) return "Clients · Pipeline"
  if (pathname.startsWith("/dashboard/clients/segments")) return "Clients · Segments"
  if (pathname.startsWith("/dashboard/clients/import")) return "Clients · Import / Export"
  if (pathname.startsWith("/dashboard/clients")) return "All clients"
  if (pathname === "/dashboard/admin") return "Admin · Overview"
  if (pathname.startsWith("/dashboard/admin/users")) return "Admin · Manage users"
  if (pathname.startsWith("/dashboard/admin/status")) return "Admin · System status"
  if (pathname.startsWith("/dashboard/admin/logs")) return "Admin · Logs and errors"
  if (pathname.startsWith("/dashboard/admin/surveys")) return "Admin · Survey center"
  if (pathname.startsWith("/dashboard/admin/ai-analytics")) return "Admin · AI analytics"
  if (pathname.startsWith("/dashboard/admin/reports")) return "Admin · Reports"
  return "Overview"
}

export function SiteHeader() {
  const pathname = usePathname()
  const title = getPageTitle(pathname)

  return (
    <header className="flex h-[var(--header-height)] shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-[var(--header-height)]">
      <div className="flex w-full items-center justify-between gap-2 px-4 lg:gap-2 lg:px-6">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 h-4 data-vertical:self-auto"
          />
          <h1 className="text-base font-medium">{title}</h1>
        </div>

      </div>
    </header>
  )
}
