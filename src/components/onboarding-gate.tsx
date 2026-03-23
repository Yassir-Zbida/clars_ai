"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"

const SURVEY_PATH = "/dashboard/survey"

/**
 * Sends users who must complete onboarding to `/dashboard/survey` unless they are already there.
 */
export function OnboardingGate() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (pathname === SURVEY_PATH || pathname?.startsWith(`${SURVEY_PATH}/`)) {
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/user/me", { cache: "no-store" })
        if (!res.ok || cancelled) return
        const json = (await res.json()) as { data?: { needsOnboardingSurvey?: boolean } }
        if (json?.data?.needsOnboardingSurvey) {
          router.replace(SURVEY_PATH)
        }
      } catch {
        // ignore
      }
    })()

    return () => {
      cancelled = true
    }
  }, [pathname, router])

  return null
}
