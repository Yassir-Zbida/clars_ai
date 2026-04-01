/**
 * Who may call POST /api/dev/seed-demo and whether the route is enabled.
 */

function normalizeEmail(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase()
}

/** Comma-separated allowlist. Empty in development = any signed-in user may seed. */
export function parseDemoSeedAllowlist(): Set<string> {
  const raw = process.env.DEMO_SEED_ALLOWED_EMAILS?.trim()
  if (!raw) return new Set()
  return new Set(
    raw
      .split(",")
      .map((e) => normalizeEmail(e))
      .filter(Boolean)
  )
}

export function isDemoSeedRouteEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") return true
  return process.env.DEMO_SEED_ENABLED === "true"
}

/** Whether this email may trigger demo seed (server-side). */
export function canUserSeedDemo(email: string | null | undefined): boolean {
  if (!isDemoSeedRouteEnabled()) return false
  const allow = parseDemoSeedAllowlist()
  if (process.env.NODE_ENV !== "production" && allow.size === 0) {
    return true
  }
  const e = normalizeEmail(email)
  return e.length > 0 && allow.has(e)
}
