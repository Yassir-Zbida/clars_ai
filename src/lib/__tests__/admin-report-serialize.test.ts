import { serializeAdminReport } from "../admin-report-serialize"

describe("serializeAdminReport", () => {
  it("returns null for non-objects", () => {
    expect(serializeAdminReport(null)).toBeNull()
    expect(serializeAdminReport(undefined)).toBeNull()
    expect(serializeAdminReport("x")).toBeNull()
  })

  it("returns null when id is missing", () => {
    expect(serializeAdminReport({ name: "R" })).toBeNull()
  })

  it("maps mongoose-like doc to DTO", () => {
    const dto = serializeAdminReport({
      _id: "64a1b2c3d4e5f67890123456",
      name: "Weekly",
      schedule: "0 9 * * 1",
      destination: "email",
      status: "active",
      createdByEmail: "Admin@X.COM",
      lastRunAt: new Date("2024-06-01T12:00:00.000Z"),
      lastRunSummary: "ok",
      lastRunDetail: null,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: null,
    })
    expect(dto).toMatchObject({
      id: "64a1b2c3d4e5f67890123456",
      name: "Weekly",
      status: "active",
      createdByEmail: "admin@x.com",
      lastRunSummary: "ok",
    })
    expect(dto?.lastRunAt).toBe("2024-06-01T12:00:00.000Z")
    expect(dto?.createdAt).toBeTruthy()
  })

  it("coerces unknown status to draft", () => {
    const dto = serializeAdminReport({
      id: "x",
      name: "N",
      schedule: "",
      destination: "",
      status: "weird",
    })
    expect(dto?.status).toBe("draft")
  })
})
