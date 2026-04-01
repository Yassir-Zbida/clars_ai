import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { DashboardOverview } from "@/components/dashboard/dashboard-overview"
import { isAdminEmail } from "@/lib/admin"

export default async function DashboardOverviewPage() {
  const session = await auth()
  if (isAdminEmail(session?.user?.email)) {
    redirect("/dashboard/admin")
  }
  return <DashboardOverview />
}
