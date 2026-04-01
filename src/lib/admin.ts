/**
 * Admin dashboard access. Override with comma-separated `ADMIN_EMAILS` (lowercase).
 * If unset, defaults to `admin@clars.ai`.
 */
function adminEmailSet(): Set<string> {
  const raw = process.env.ADMIN_EMAILS?.trim()
  if (raw) {
    return new Set(
      raw
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
    )
  }
  return new Set(["admin@clars.ai"])
}

export function isAdminEmail(email?: string | null) {
  if (!email) return false
  return adminEmailSet().has(email.trim().toLowerCase())
}
