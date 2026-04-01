export type AdminReportDto = {
  id: string
  name: string
  schedule: string
  destination: string
  status: "active" | "draft"
  createdByEmail: string | null
  lastRunAt: string | null
  lastRunSummary: string | null
  lastRunDetail: string | null
  createdAt: string | null
  updatedAt: string | null
}

function iso(d: unknown): string | null {
  if (d == null) return null
  if (d instanceof Date) return Number.isNaN(d.getTime()) ? null : d.toISOString()
  if (typeof d === "string" || typeof d === "number") {
    const t = new Date(d)
    return Number.isNaN(t.getTime()) ? null : t.toISOString()
  }
  return null
}

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined
}

export function serializeAdminReport(doc: unknown): AdminReportDto | null {
  if (!doc || typeof doc !== "object") return null
  const d = doc as Record<string, unknown>
  const rawId = d._id ?? d.id
  if (rawId == null) return null

  const statusRaw = str(d.status)
  const status = statusRaw === "active" ? "active" : "draft"

  return {
    id: String(rawId),
    name: str(d.name) ?? "",
    schedule: str(d.schedule) ?? "",
    destination: str(d.destination) ?? "",
    status,
    createdByEmail: str(d.createdByEmail)?.toLowerCase() ?? null,
    lastRunAt: iso(d.lastRunAt),
    lastRunSummary: str(d.lastRunSummary) ?? null,
    lastRunDetail: str(d.lastRunDetail) ?? null,
    createdAt: iso(d.createdAt),
    updatedAt: iso(d.updatedAt),
  }
}
