import { z } from "zod"
import mongoose from "mongoose"
import { auth } from "@/auth"
import { NextResponse } from "next/server"

export const projectStatusValues = ["DRAFT", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"] as const
export const projectPriorityValues = ["LOW", "MEDIUM", "HIGH"] as const

const ProjectStatusSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toUpperCase() : value),
  z.enum(projectStatusValues)
)

const ProjectPrioritySchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toUpperCase() : value),
  z.enum(projectPriorityValues)
)

const objectIdString = z.string().refine((v) => mongoose.Types.ObjectId.isValid(v), "Invalid contact id")

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().optional(),
  notes: z.string().max(8000).optional(),
  status: ProjectStatusSchema.optional().default("ACTIVE"),
  priority: ProjectPrioritySchema.optional().default("MEDIUM"),
  progress: z.number().min(0).max(100).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budgetCents: z.number().int().nonnegative().optional(),
  currency: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : "EUR")),
  /** Single contact (legacy) */
  clientId: z.string().optional(),
  /** Multiple contacts assigned to this project */
  assignedClientIds: z.array(objectIdString).max(100).optional().default([]),
})

export const UpdateProjectSchema = CreateProjectSchema.partial()

export function cleanOptionalString(value: string | undefined): string | undefined {
  if (value == null) return undefined
  const trimmed = value.trim()
  return trimmed.length ? trimmed : undefined
}

export async function requireUserId() {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  return { userId }
}

export function zodErrorResponse(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: "Validation failed", issues: error.flatten() }, { status: 400 })
  }
  return null
}

export function serializeProjectLean(doc: Record<string, unknown>) {
  const toIso = (v: unknown): string | null => {
    if (v == null) return null
    if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString()
    const d = new Date(String(v))
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }
  const assignedRaw = doc.assignedClientIds as unknown[] | undefined
  const assignedClientIds = Array.isArray(assignedRaw)
    ? assignedRaw.map((x) => String(x)).filter((id) => mongoose.Types.ObjectId.isValid(id))
    : []
  return {
    id: String(doc._id),
    userId: doc.userId != null ? String(doc.userId) : null,
    clientId: doc.clientId != null ? String(doc.clientId) : null,
    assignedClientIds,
    name: doc.name ?? null,
    description: doc.description ?? null,
    notes: typeof doc.notes === "string" ? doc.notes : null,
    status: doc.status ?? null,
    priority: doc.priority ?? null,
    progress: typeof doc.progress === "number" ? doc.progress : null,
    startDate: doc.startDate != null ? toIso(doc.startDate) : null,
    endDate: doc.endDate != null ? toIso(doc.endDate) : null,
    budgetCents: typeof doc.budgetCents === "number" ? doc.budgetCents : null,
    currency: doc.currency ?? null,
    createdAt: doc.createdAt != null ? toIso(doc.createdAt) : null,
    updatedAt: doc.updatedAt != null ? toIso(doc.updatedAt) : null,
    deletedAt: doc.deletedAt != null ? toIso(doc.deletedAt) : null,
  }
}

export function dedupeObjectIds(ids: string[]): mongoose.Types.ObjectId[] {
  const seen = new Set<string>()
  const out: mongoose.Types.ObjectId[] = []
  for (const id of ids) {
    if (!mongoose.Types.ObjectId.isValid(id)) continue
    if (seen.has(id)) continue
    seen.add(id)
    out.push(new mongoose.Types.ObjectId(id))
  }
  return out
}

export async function readJsonBody(request: Request): Promise<unknown> {
  const text = await request.text()
  if (!text.trim()) return {}
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new SyntaxError("Invalid JSON body")
  }
}
