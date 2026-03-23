import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Providers } from "@/app/providers"
import { AppSidebar } from "@/components/app-sidebar"
import { AuthToast } from "@/components/auth-toast"
import { SiteHeader } from "@/components/site-header"
import { TRPCReactProvider } from "@/trpc/client"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <Providers>
      <TRPCReactProvider>
        <SidebarProvider
          style={
            {
              "--sidebar-width": "calc(var(--spacing) * 72)",
              "--header-height": "calc(var(--spacing) * 12)",
            } as React.CSSProperties
          }
        >
          <AuthToast />
          <AppSidebar variant="inset" />
          <SidebarInset>
            <SiteHeader />
            <div className="flex flex-1 flex-col">
              <div className="@container/main flex flex-1 flex-col gap-0">
                <div className="flex flex-1 flex-col gap-4 pt-0 pb-4 md:gap-6 md:pt-0 md:pb-6">
                  {children}
                </div>
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </TRPCReactProvider>
    </Providers>
  )
}
