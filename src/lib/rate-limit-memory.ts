/**
 * In-process sliding-window rate limiter for low-traffic routes (e.g. signup).
 * Resets per key after `windowMs`. Not shared across serverless instances — use Redis/Upstash in production at scale.
 */

type Bucket = { count: number; resetAt: number }

function prune(map: Map<string, Bucket>, now: number) {
  map.forEach((b, k) => {
    if (b.resetAt < now) map.delete(k)
  })
}

function getBucket(map: Map<string, Bucket>, key: string, now: number, windowMs: number): Bucket {
  let b = map.get(key)
  if (!b || b.resetAt < now) {
    b = { count: 0, resetAt: now + windowMs }
    map.set(key, b)
  }
  return b
}

const ipBuckets = new Map<string, Bucket>()
const emailBuckets = new Map<string, Bucket>()

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number }

export function consumeSignupAttempt(
  ipKey: string,
  emailKey: string,
  opts?: { windowMs?: number; maxPerIp?: number; maxPerEmail?: number }
): RateLimitResult {
  const windowMs = opts?.windowMs ?? 60 * 60 * 1000
  const maxPerIp = opts?.maxPerIp ?? 15
  const maxPerEmail = opts?.maxPerEmail ?? 5
  const now = Date.now()
  prune(ipBuckets, now)
  prune(emailBuckets, now)

  const ipB = getBucket(ipBuckets, ipKey, now, windowMs)
  const emB = getBucket(emailBuckets, emailKey, now, windowMs)

  if (ipB.count >= maxPerIp) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((ipB.resetAt - now) / 1000)) }
  }
  if (emB.count >= maxPerEmail) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((emB.resetAt - now) / 1000)) }
  }

  ipB.count += 1
  emB.count += 1
  return { ok: true }
}

export function clientIpFromRequest(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for")
  if (fwd) {
    const first = fwd.split(",")[0]?.trim()
    if (first) return first
  }
  const real = request.headers.get("x-real-ip")?.trim()
  if (real) return real
  return "unknown"
}
