import { z } from "zod"

export const CreateWorkflowSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  trigger: z.enum([
    "NEW_LEAD",
    "INVOICE_OVERDUE",
    "PAYMENT_RECEIVED",
    "PROJECT_COMPLETED",
    "CONTACT_AT_RISK",
  ]),
  action: z.enum(["NOTIFY_IN_APP", "LOG_INTERACTION", "EMAIL_TEMPLATE", "NONE"]).default("NOTIFY_IN_APP"),
  enabled: z.boolean().default(true),
})

export const UpdateWorkflowSchema = CreateWorkflowSchema.partial()

export const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens"),
  channel: z.enum(["EMAIL", "LINKEDIN", "SMS", "NOTE", "PROPOSAL"]).default("EMAIL"),
  body: z.string().min(1).max(16000),
})

export const UpdateTemplateSchema = CreateTemplateSchema.partial()

export async function readJsonBody(request: Request): Promise<unknown> {
  const text = await request.text()
  if (!text.trim()) return {}
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new SyntaxError("Invalid JSON body")
  }
}
