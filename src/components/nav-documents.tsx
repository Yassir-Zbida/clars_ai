"use client"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavDocuments({
  items,
  label = "Tools",
}: {
  items: {
    name: string
    url: string
    icon: React.ReactNode
  }[]
  label?: string
}) {
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden p-2 pt-0">
      <SidebarGroupLabel className="h-7 px-2 text-xs">{label}</SidebarGroupLabel>
      <SidebarMenu className="gap-0.5">
        {items.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton
              size="sm"
              className="h-[34px]"
              render={<a href={item.url} />}
            >
              {item.icon}
              <span>{item.name}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
