import { auth } from "@/auth"
import { redirect } from "next/navigation"
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
        {children}
      </TRPCReactProvider>
    </Providers>
  )
}
