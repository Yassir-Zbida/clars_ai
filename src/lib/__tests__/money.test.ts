import { formatCents, parseMajorToCents } from "../money"

describe("formatCents", () => {
  it("formats USD from integer cents", () => {
    expect(formatCents(100_50)).toMatch(/100\.50/)
  })

  it("treats non-finite cents as zero", () => {
    const s = formatCents(Number.NaN)
    expect(s).toMatch(/0\.00/)
  })

  it("uses USD when currency code is not exactly three letters", () => {
    const s = formatCents(100, "XX")
    expect(s).toMatch(/1\.00/)
  })
})

describe("parseMajorToCents", () => {
  it("parses decimal major units with half-up rounding", () => {
    expect(parseMajorToCents("10")).toBe(1000)
    expect(parseMajorToCents("10.005")).toBe(1001)
  })

  it("accepts comma as decimal separator", () => {
    expect(parseMajorToCents("3,50")).toBe(350)
  })

  it("returns null for empty, negative, or non-numeric input", () => {
    expect(parseMajorToCents("")).toBeNull()
    expect(parseMajorToCents("  ")).toBeNull()
    expect(parseMajorToCents("-1")).toBeNull()
    expect(parseMajorToCents("abc")).toBeNull()
  })
})
