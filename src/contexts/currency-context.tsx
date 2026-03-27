"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"

const LS_KEY = "clars_account_currency"

export const CURRENCY_OPTIONS = [
  { code: "USD", name: "US Dollar",          symbol: "$"   },
  { code: "EUR", name: "Euro",               symbol: "€"   },
  { code: "GBP", name: "British Pound",      symbol: "£"   },
  { code: "CAD", name: "Canadian Dollar",    symbol: "CA$" },
  { code: "AUD", name: "Australian Dollar",  symbol: "A$"  },
  { code: "JPY", name: "Japanese Yen",       symbol: "¥"   },
  { code: "CHF", name: "Swiss Franc",        symbol: "CHF" },
  { code: "CNY", name: "Chinese Yuan",       symbol: "¥"   },
  { code: "AED", name: "UAE Dirham",         symbol: "AED" },
  { code: "SAR", name: "Saudi Riyal",        symbol: "SAR" },
  { code: "MAD", name: "Moroccan Dirham",    symbol: "MAD" },
  { code: "TND", name: "Tunisian Dinar",     symbol: "TND" },
  { code: "INR", name: "Indian Rupee",       symbol: "₹"   },
  { code: "BRL", name: "Brazilian Real",     symbol: "R$"  },
  { code: "MXN", name: "Mexican Peso",       symbol: "MX$" },
  { code: "SGD", name: "Singapore Dollar",   symbol: "S$"  },
  { code: "SEK", name: "Swedish Krona",      symbol: "SEK" },
  { code: "NOK", name: "Norwegian Krone",    symbol: "NOK" },
  { code: "DKK", name: "Danish Krone",       symbol: "DKK" },
  { code: "TRY", name: "Turkish Lira",       symbol: "₺"   },
  { code: "PLN", name: "Polish Złoty",       symbol: "zł"  },
  { code: "ZAR", name: "South African Rand", symbol: "R"   },
  { code: "HKD", name: "Hong Kong Dollar",   symbol: "HK$" },
  { code: "KWD", name: "Kuwaiti Dinar",      symbol: "KWD" },
  { code: "QAR", name: "Qatari Riyal",       symbol: "QAR" },
] as const

export type CurrencyCode = (typeof CURRENCY_OPTIONS)[number]["code"]

interface CurrencyContextValue {
  currency: string
  setCurrency: (code: string) => Promise<void>
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: "USD",
  setCurrency: async () => {},
})

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(LS_KEY) ?? "USD"
    }
    return "USD"
  })

  // Hydrate from server on mount
  useEffect(() => {
    fetch("/api/user/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const c = (json as { data?: { defaultCurrency?: string } } | null)?.data?.defaultCurrency
        if (c) {
          setCurrencyState(c)
          localStorage.setItem(LS_KEY, c)
        }
      })
      .catch(() => {})
  }, [])

  const setCurrency = useCallback(async (code: string) => {
    setCurrencyState(code)
    localStorage.setItem(LS_KEY, code)
    await fetch("/api/user/me", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultCurrency: code }),
    }).catch(() => {})
  }, [])

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  return useContext(CurrencyContext)
}
