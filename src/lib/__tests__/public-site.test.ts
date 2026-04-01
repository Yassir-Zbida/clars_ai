import { getSocialLinks } from "../public-site"

describe("getSocialLinks", () => {
  const keys = [
    "NEXT_PUBLIC_SOCIAL_X_URL",
    "NEXT_PUBLIC_SOCIAL_LINKEDIN_URL",
    "NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL",
  ] as const
  const snapshot: Partial<Record<(typeof keys)[number], string | undefined>> = {}

  beforeEach(() => {
    for (const k of keys) {
      snapshot[k] = process.env[k]
      delete process.env[k]
    }
  })

  afterEach(() => {
    for (const k of keys) {
      const v = snapshot[k]
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  })

  it("returns no links when env is unset", () => {
    expect(getSocialLinks()).toEqual([])
  })

  it("includes only keys with non-empty trimmed URLs", () => {
    process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN_URL = " https://linkedin.com/in/x "
    process.env.NEXT_PUBLIC_SOCIAL_X_URL = "   "
    const links = getSocialLinks()
    expect(links).toHaveLength(1)
    expect(links[0]).toMatchObject({
      key: "linkedin",
      href: "https://linkedin.com/in/x",
      label: "LinkedIn",
    })
  })
})
