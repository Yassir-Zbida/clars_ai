export const ADMIN_EMAILS = new Set(["admin@clars.ai"])

export function isAdminEmail(email?: string | null) {
  if (!email) return false
  return ADMIN_EMAILS.has(email.trim().toLowerCase())
}
