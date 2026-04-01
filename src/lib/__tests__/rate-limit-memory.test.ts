import { clientIpFromRequest, consumeSignupAttempt } from "../rate-limit-memory"

describe("clientIpFromRequest", () => {
  it("uses first x-forwarded-for hop", () => {
    const r = new Request("http://localhost/", {
      headers: { "x-forwarded-for": "203.0.113.1, 10.0.0.1" },
    })
    expect(clientIpFromRequest(r)).toBe("203.0.113.1")
  })

  it("falls back to x-real-ip then unknown", () => {
    const real = new Request("http://localhost/", {
      headers: { "x-real-ip": "198.51.100.2" },
    })
    expect(clientIpFromRequest(real)).toBe("198.51.100.2")
    expect(clientIpFromRequest(new Request("http://localhost/"))).toBe("unknown")
  })
})

describe("consumeSignupAttempt", () => {
  it("allows requests under the IP cap", () => {
    const ip = `ip:test-${Math.random()}`
    const r = consumeSignupAttempt(ip, `email:a-${Math.random()}@t.com`, {
      maxPerIp: 3,
      maxPerEmail: 10,
      windowMs: 60_000,
    })
    expect(r.ok).toBe(true)
  })

  it("returns 429 after IP budget is exhausted", () => {
    const ip = `ip:cap-${Math.random()}`
    const opts = { maxPerIp: 2, maxPerEmail: 10, windowMs: 60_000 }
    expect(consumeSignupAttempt(ip, `email:1-${Math.random()}@x.com`, opts).ok).toBe(true)
    expect(consumeSignupAttempt(ip, `email:2-${Math.random()}@x.com`, opts).ok).toBe(true)
    const last = consumeSignupAttempt(ip, `email:3-${Math.random()}@x.com`, opts)
    expect(last.ok).toBe(false)
    if (!last.ok) expect(last.retryAfterSec).toBeGreaterThan(0)
  })
})
