import { metaWithinSize, sanitizeClientLogMeta } from "../client-log-sanitize"

describe("sanitizeClientLogMeta", () => {
  it("drops sensitive keys", () => {
    const out = sanitizeClientLogMeta({
      ok: true,
      password: "secret",
      api_key: "k",
      nested: { Authorization: "bearer" },
    }) as Record<string, unknown>
    expect(out.ok).toBe(true)
    expect(out.password).toBeUndefined()
    expect(out.api_key).toBeUndefined()
    expect((out.nested as Record<string, unknown>).Authorization).toBeUndefined()
  })

  it("truncates long strings", () => {
    const long = "x".repeat(300)
    const out = sanitizeClientLogMeta({ msg: long }) as { msg: string }
    expect(out.msg.length).toBeLessThanOrEqual(241)
    expect(out.msg.endsWith("…")).toBe(true)
  })

  it("caps array length and recursion depth", () => {
    const arr = Array.from({ length: 30 }, (_, i) => i)
    const out = sanitizeClientLogMeta({ arr }) as { arr: unknown[] }
    expect(out.arr.length).toBe(24)
  })
})

describe("metaWithinSize", () => {
  it("returns meta unchanged when under limit", () => {
    const m = { a: 1 }
    expect(metaWithinSize(m, 1000)).toEqual(m)
  })

  it("returns truncated preview when over limit", () => {
    const huge = { x: "y".repeat(500) }
    const out = metaWithinSize(huge, 80) as { _truncated?: boolean; preview?: string }
    expect(out._truncated).toBe(true)
    expect(typeof out.preview).toBe("string")
  })
})
