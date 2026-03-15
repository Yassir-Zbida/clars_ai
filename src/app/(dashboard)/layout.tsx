import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard-shell"
import { Providers } from "@/app/providers"
import { TRPCReactProvider } from "@/trpc/client"

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
        <DashboardShell
          user={{
            name: session.user.name ?? null,
            email: session.user.email ?? null,
            image: session.user.image ?? null,
          }}
        >
          {children}
        </DashboardShell>
      </TRPCReactProvider>
    </Providers>
  )
}
