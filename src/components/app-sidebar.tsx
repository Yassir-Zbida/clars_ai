"use client"

import * as React from "react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  LayoutDashboardIcon,
  Users2Icon,
  FolderKanbanIcon,
  ReceiptTextIcon,
  CreditCardIcon,
  SparklesIcon,
  BarChart3Icon,
  FileChartColumnIcon,
  LayoutTemplateIcon,
  Settings2Icon,
  CircleHelpIcon,
} from "lucide-react"

const data = {
  user: {
    name: "Clars.ai",
    email: "you@clars.ai",
    avatar: "/logo.svg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboardIcon />,
    },
    {
      title: "Clients",
      url: "/dashboard/clients",
      icon: <Users2Icon />,
    },
    {
      title: "Projects",
      url: "/dashboard/projects",
      icon: <FolderKanbanIcon />,
    },
    {
      title: "Invoices",
      url: "/dashboard/invoices",
      icon: <ReceiptTextIcon />,
    },
    {
      title: "Payments",
      url: "/dashboard/payments",
      icon: <CreditCardIcon />,
    },
  ],
  navTools: [
    {
      name: "AI Assistant",
      url: "/dashboard/ai",
      icon: <SparklesIcon />,
    },
    {
      name: "Analytics",
      url: "/dashboard/analytics",
      icon: <BarChart3Icon />,
    },
    {
      name: "Reports",
      url: "/dashboard/reports",
      icon: <FileChartColumnIcon />,
    },
    {
      name: "Templates",
      url: "/dashboard/templates",
      icon: <LayoutTemplateIcon />,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: <Settings2Icon />,
    },
    {
      title: "Get Help",
      url: "/dashboard/help",
      icon: <CircleHelpIcon />,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:!p-1.5"
              render={<a href="/dashboard" />}
            >
              <SparklesIcon className="!size-5 text-primary" />
              <span className="text-base font-semibold">Clars.ai</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.navTools} label="Tools" />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
