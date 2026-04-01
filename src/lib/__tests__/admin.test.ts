import { isAdminEmail } from "../admin"

describe("isAdminEmail", () => {
  const prev = process.env.ADMIN_EMAILS

  afterEach(() => {
    if (prev === undefined) delete process.env.ADMIN_EMAILS
    else process.env.ADMIN_EMAILS = prev
  })

  it("defaults to admin@clars.ai when ADMIN_EMAILS is unset", () => {
    delete process.env.ADMIN_EMAILS
    expect(isAdminEmail("admin@clars.ai")).toBe(true)
    expect(isAdminEmail("Admin@Clars.AI")).toBe(true)
    expect(isAdminEmail("other@clars.ai")).toBe(false)
  })

  it("honours comma-separated ADMIN_EMAILS", () => {
    process.env.ADMIN_EMAILS = "a@x.com, b@y.com "
    expect(isAdminEmail("A@X.COM")).toBe(true)
    expect(isAdminEmail("b@y.com")).toBe(true)
    expect(isAdminEmail("c@z.com")).toBe(false)
  })

  it("returns false for missing email", () => {
    expect(isAdminEmail(null)).toBe(false)
    expect(isAdminEmail("")).toBe(false)
  })
})
