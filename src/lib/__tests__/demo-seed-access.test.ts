import {
  canUserSeedDemo,
  isDemoSeedRouteEnabled,
  parseDemoSeedAllowlist,
} from "../demo-seed-access"

describe("parseDemoSeedAllowlist", () => {
  const prev = process.env.DEMO_SEED_ALLOWED_EMAILS

  afterEach(() => {
    if (prev === undefined) delete process.env.DEMO_SEED_ALLOWED_EMAILS
    else process.env.DEMO_SEED_ALLOWED_EMAILS = prev
  })

  it("returns empty set when unset", () => {
    delete process.env.DEMO_SEED_ALLOWED_EMAILS
    expect(parseDemoSeedAllowlist().size).toBe(0)
  })

  it("parses comma-separated normalised emails", () => {
    process.env.DEMO_SEED_ALLOWED_EMAILS = " One@test.com , two@test.com "
    const s = parseDemoSeedAllowlist()
    expect(s.has("one@test.com")).toBe(true)
    expect(s.has("two@test.com")).toBe(true)
  })
})

describe("isDemoSeedRouteEnabled", () => {
  const prevNode = process.env.NODE_ENV
  const prevFlag = process.env.DEMO_SEED_ENABLED

  afterEach(() => {
    process.env.NODE_ENV = prevNode
    if (prevFlag === undefined) delete process.env.DEMO_SEED_ENABLED
    else process.env.DEMO_SEED_ENABLED = prevFlag
  })

  it("is true when not in production", () => {
    process.env.NODE_ENV = "test"
    delete process.env.DEMO_SEED_ENABLED
    expect(isDemoSeedRouteEnabled()).toBe(true)
  })

  it("in production requires DEMO_SEED_ENABLED=true", () => {
    process.env.NODE_ENV = "production"
    delete process.env.DEMO_SEED_ENABLED
    expect(isDemoSeedRouteEnabled()).toBe(false)
    process.env.DEMO_SEED_ENABLED = "true"
    expect(isDemoSeedRouteEnabled()).toBe(true)
  })
})

describe("canUserSeedDemo", () => {
  const prevNode = process.env.NODE_ENV
  const prevFlag = process.env.DEMO_SEED_ENABLED
  const prevAllow = process.env.DEMO_SEED_ALLOWED_EMAILS

  afterEach(() => {
    process.env.NODE_ENV = prevNode
    if (prevFlag === undefined) delete process.env.DEMO_SEED_ENABLED
    else process.env.DEMO_SEED_ENABLED = prevFlag
    if (prevAllow === undefined) delete process.env.DEMO_SEED_ALLOWED_EMAILS
    else process.env.DEMO_SEED_ALLOWED_EMAILS = prevAllow
  })

  it("in production with seed off denies everyone", () => {
    process.env.NODE_ENV = "production"
    delete process.env.DEMO_SEED_ENABLED
    process.env.DEMO_SEED_ALLOWED_EMAILS = "a@b.com"
    expect(canUserSeedDemo("a@b.com")).toBe(false)
  })

  it("in non-production with empty allowlist allows any non-empty email", () => {
    process.env.NODE_ENV = "test"
    delete process.env.DEMO_SEED_ALLOWED_EMAILS
    expect(canUserSeedDemo("anyone@x.com")).toBe(true)
  })

  it("with allowlist only listed emails may seed", () => {
    process.env.NODE_ENV = "test"
    process.env.DEMO_SEED_ALLOWED_EMAILS = "allowed@x.com"
    expect(canUserSeedDemo("allowed@x.com")).toBe(true)
    expect(canUserSeedDemo("other@x.com")).toBe(false)
  })
})
