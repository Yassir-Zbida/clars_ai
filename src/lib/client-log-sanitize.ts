/** Strip sensitive keys and shrink values for stored client log metadata. */
export function sanitizeClientLogMeta(input: unknown, depth = 0): unknown {
  if (depth > 4) return "[max-depth]"
  if (input === null || input === undefined) return input
  if (typeof input === "string") return input.length > 240 ? `${input.slice(0, 240)}…` : input
  if (typeof input === "number" || typeof input === "boolean") return input
  if (Array.isArray(input)) return input.slice(0, 24).map((x) => sanitizeClientLogMeta(x, depth + 1))
  if (typeof input !== "object") return String(input).slice(0, 120)

  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (/password|token|secret|authorization|cookie|apikey|api_key/i.test(k)) continue
    const key = k.slice(0, 80)
    out[key] = sanitizeClientLogMeta(v, depth + 1)
  }
  return out
}

export function metaWithinSize(meta: unknown, maxChars: number): unknown {
  try {
    const s = JSON.stringify(meta)
    if (s.length <= maxChars) return meta
    return { _truncated: true, preview: s.slice(0, maxChars - 40) + "…" }
  } catch {
    return { _error: "unserializable" }
  }
}
