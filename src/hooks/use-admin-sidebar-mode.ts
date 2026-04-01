"use client"

import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"

import { isAdminEmail } from "@/lib/admin"

/**
 * Avoid sidebar flash on refresh: session is undefined while `loading`, so we’d briefly show the
 * full user nav. If the URL is already under `/dashboard/admin`, assume admin layout until session resolves.
 */
export function useAdminSidebarMode() {
  const { data: session, status } = useSession()
  const pathname = usePathname() ?? ""
  const confirmedAdmin = isAdminEmail(session?.user?.email)
  const onAdminRoute = pathname.startsWith("/dashboard/admin")
  const optimisticAdmin = status === "loading" && onAdminRoute

  return { adminMode: confirmedAdmin || optimisticAdmin }
}
