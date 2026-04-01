import { getDicebearUrl } from "../dicebear"

describe("getDicebearUrl", () => {
  it("encodes seed and includes style, size, background", () => {
    const url = getDicebearUrl("  Jane Doe  ", "notionists-neutral", 48)
    expect(url).toContain("https://api.dicebear.com/9.x/notionists-neutral/svg?")
    expect(url).toContain("seed=")
    expect(url).toContain(encodeURIComponent("Jane Doe"))
    expect(url).toContain("size=48")
    expect(url).toContain("backgroundColor")
  })

  it("uses default seed when empty", () => {
    expect(getDicebearUrl("  ", undefined, 64)).toContain("seed=user")
  })
})
