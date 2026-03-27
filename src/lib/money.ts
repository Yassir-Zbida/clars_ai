/** Format integer cents as major currency (e.g. USD → $1,000.00). */
export function formatCents(cents: number, currency = "USD", locale = "en-US") {
  const safe = Number.isFinite(cents) ? cents : 0
  const cur  = currency.length === 3 ? currency : "USD"
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: cur,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safe / 100)
  } catch {
    return `${(safe / 100).toFixed(2)} ${cur}`
  }
}

/** Parse user-entered decimal amount to integer cents (half-up). */
export function parseMajorToCents(value: string): number | null {
  const t = value.trim().replace(",", ".")
  if (!t) return null
  const n = Number(t)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}
