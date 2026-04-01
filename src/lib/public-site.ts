/**
 * Build-time public env for marketing pages (client components).
 * Set in `.env` / hosting dashboard with `NEXT_PUBLIC_*`.
 */

export type SocialKey = "x" | "linkedin" | "instagram"

const KEYS: SocialKey[] = ["x", "linkedin", "instagram"]

const ENV_KEY: Record<SocialKey, string> = {
  x: "NEXT_PUBLIC_SOCIAL_X_URL",
  linkedin: "NEXT_PUBLIC_SOCIAL_LINKEDIN_URL",
  instagram: "NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL",
}

/** Only entries with a non-empty URL (hides placeholder social links). */
export function getSocialLinks(): { key: SocialKey; href: string; label: string; icon: string }[] {
  const map: Record<SocialKey, { label: string; icon: string }> = {
    x: { label: "X / Twitter", icon: "ri-twitter-x-line" },
    linkedin: { label: "LinkedIn", icon: "ri-linkedin-line" },
    instagram: { label: "Instagram", icon: "ri-instagram-line" },
  }
  const out: { key: SocialKey; href: string; label: string; icon: string }[] = []
  for (const key of KEYS) {
    const href = process.env[ENV_KEY[key]]?.trim()
    if (href) out.push({ key, href, ...map[key] })
  }
  return out
}
