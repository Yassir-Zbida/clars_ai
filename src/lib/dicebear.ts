/**
 * Returns a DiceBear avatar URL for a given seed (name, email, id, etc.)
 * Uses the "notionists-neutral" style — CC0 1.0, gender-neutral illustrated look.
 * Background is baked into the SVG as a soft blue tint of the app's primary (#497dcb).
 * Docs: https://www.dicebear.com/how-to-use/http-api/
 */
export function getDicebearUrl(
  seed: string,
  style: string = "notionists-neutral",
  size: number = 64,
): string {
  const s = encodeURIComponent(seed.trim() || "user")
  // dbeafe ≈ Tailwind blue-100, a soft visible tint of the #497dcb primary
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${s}&size=${size}&backgroundColor[]=dbeafe`
}
