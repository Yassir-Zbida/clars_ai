"use client"

import * as React from "react"
import { useSession } from "next-auth/react"

import { ClientLogCollector } from "@/components/client-log-collector"
import { installApiFetchLogger } from "@/lib/api-fetch-log"
import { setClientLogSendAllowed } from "@/lib/client-logger"

/**
 * Runs for the whole app: wires API fetch logging, session gating for outbound logs,
 * and the navigation / click / error collector. Must sit under SessionProvider.
 */
export function AppDiagnostics() {
  const { status } = useSession()

  React.useLayoutEffect(() => {
    installApiFetchLogger()
    // Only submit telemetry for established sessions — avoids 401 spam on /login before NextAuth finishes.
    setClientLogSendAllowed(status === "authenticated")
  }, [status])

  return <ClientLogCollector />
}
