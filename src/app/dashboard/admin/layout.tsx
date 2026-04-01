import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { isAdminEmail } from "@/lib/admin"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!isAdminEmail(session?.user?.email)) {
    redirect("/dashboard")
  }

  return <div className="flex flex-1 flex-col gap-4 px-4 pb-2 pt-0 lg:px-6">{children}</div>
}
