"use client"

import { SessionProvider } from "next-auth/react"

import { AppDiagnostics } from "@/components/app-diagnostics"
import { CurrencyProvider } from "@/contexts/currency-context"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AppDiagnostics />
      <CurrencyProvider>{children}</CurrencyProvider>
    </SessionProvider>
  )
}
