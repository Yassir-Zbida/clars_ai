/** Format integer cents as major currency (e.g. EUR). */
export function formatCents(cents: number, currency = "EUR", locale?: string) {
  const safe = Number.isFinite(cents) ? cents : 0
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.length === 3 ? currency : "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safe / 100)
  } catch {
    return `${(safe / 100).toFixed(2)} ${currency}`
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
