/**
 * Zod schemas and small helpers from API route modules (mock auth to avoid Next session).
 */
jest.mock("../../auth", () => ({
  auth: jest.fn().mockResolvedValue(null),
}))

import { z } from "zod"
import { CreateClientSchema } from "@/app/api/clients/_lib"
import {
  cleanOptionalString,
  CreateInvoiceSchema,
  readJsonBody,
  sumLineItemsCents,
  zodErrorResponse,
} from "@/app/api/finance/_lib"

const validOid = "507f1f77bcf86cd799439011"

describe("finance _lib", () => {
  describe("CreateInvoiceSchema", () => {
    it("accepts minimal valid payload", () => {
      const data = CreateInvoiceSchema.parse({
        clientId: validOid,
        dueDate: "2026-04-15",
      })
      expect(data.clientId).toBe(validOid)
      expect(data.documentType).toBe("INVOICE")
      expect(data.currency).toBe("EUR")
    })

    it("rejects invalid client ObjectId", () => {
      expect(() =>
        CreateInvoiceSchema.parse({
          clientId: "not-an-id",
          dueDate: "2026-04-15",
        })
      ).toThrow(z.ZodError)
    })
  })

  describe("sumLineItemsCents", () => {
    it("sums quantity * unit cents with rounding", () => {
      expect(
        sumLineItemsCents([
          { description: "A", quantity: 2, unitAmountCents: 150 },
          { description: "B", quantity: 1, unitAmountCents: 99 },
        ])
      ).toBe(399)
    })
  })

  describe("cleanOptionalString", () => {
    it("trims and drops blanks", () => {
      expect(cleanOptionalString(undefined)).toBeUndefined()
      expect(cleanOptionalString("  ")).toBeUndefined()
      expect(cleanOptionalString(" x ")).toBe("x")
    })
  })

  describe("readJsonBody", () => {
    it("parses JSON and returns {} for empty body", async () => {
      const empty = new Request("http://localhost/api", { method: "POST", body: "" })
      expect(await readJsonBody(empty)).toEqual({})
      const json = new Request("http://localhost/api", {
        method: "POST",
        body: '{"a":1}',
        headers: { "Content-Type": "application/json" },
      })
      expect(await readJsonBody(json)).toEqual({ a: 1 })
    })

    it("throws on invalid JSON", async () => {
      const bad = new Request("http://localhost/api", {
        method: "POST",
        body: "{",
      })
      await expect(readJsonBody(bad)).rejects.toThrow(SyntaxError)
    })
  })

  describe("zodErrorResponse", () => {
    it("returns 400 JSON for ZodError", () => {
      const err = z.object({ x: z.string() }).safeParse({}).error
      expect(err).toBeInstanceOf(z.ZodError)
      const res = zodErrorResponse(err!)
      expect(res).not.toBeNull()
      expect(res!.status).toBe(400)
    })

    it("returns null for non-Zod errors", () => {
      expect(zodErrorResponse(new Error("x"))).toBeNull()
    })
  })
})

describe("clients _lib CreateClientSchema", () => {
  it("applies defaults for minimal client", () => {
    const data = CreateClientSchema.parse({ fullName: "Acme Co" })
    expect(data.fullName).toBe("Acme Co")
    expect(data.type).toBe("INDIVIDUAL")
    expect(data.status).toBe("LEAD")
    expect(data.language).toBe("FR")
    expect(data.currency).toBe("EUR")
  })

  it("rejects empty fullName", () => {
    expect(() => CreateClientSchema.parse({ fullName: "" })).toThrow(z.ZodError)
  })
})
