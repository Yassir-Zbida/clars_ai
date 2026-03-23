"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

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
import { BellIcon } from "lucide-react"

const data = {
  user: {
    name: "Clars.ai",
    email: "you@clars.ai",
    avatar: "",
  },
}

function SidebarSearchRow() {
  const router = useRouter()

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

  return (
    <div className="flex items-center gap-2">
      <SidebarInput
        id="sidebar-search-input"
        type="search"
        placeholder="Search…"
        className="h-8 min-w-0 flex-1 rounded-md text-xs bg-sidebar"
      />
      <DropdownMenu>
        <DropdownMenuTrigger className="flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none">
          <i className="ri-add-line text-sm" />
          New
          <i className="ri-arrow-down-s-line text-sm" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="end" className="w-44">
          <DropdownMenuItem onClick={() => router.push("/dashboard/clients")}>
            <i className="ri-user-add-line mr-2" />
            Contact
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/dashboard/projects")}>
            <i className="ri-folder-add-line mr-2" />
            Project
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/dashboard/invoices")}>
            <i className="ri-file-add-line mr-2" />
            New invoice
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/dashboard/invoices?type=quote")}>
            <i className="ri-receipt-line mr-2" />
            New quote
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="flex flex-row items-center justify-between gap-2 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:!p-1.5"
              render={<a href="/dashboard" />}
              tooltip="Workspace home"
            >
              <img src="/logo.svg" alt="Clars.ai" className="h-7 w-auto" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <button
          type="button"
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          aria-label="Notifications"
        >
          <BellIcon className="size-4" />
        </button>
      </SidebarHeader>

      <SidebarContent className="overflow-y-auto">
        <div className="p-2">
          <SidebarSearchRow />
        </div>
        <NavMain />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
