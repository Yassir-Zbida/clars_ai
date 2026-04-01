import mongoose from "mongoose"

import { getDb } from "@/server/db"
import { AiUsageEvent, type AiUsageEventType, type AiUsageSurface } from "@/server/models/ai-usage-event"

export type RecordAiUsageInput = {
  userId: string
  eventType: AiUsageEventType
  surface: AiUsageSurface
  model?: string | null
  mock?: boolean
  promptTokens?: number | null
  completionTokens?: number | null
  totalTokens?: number | null
  durationMs?: number
  meta?: Record<string, unknown>
}

/**
 * Persists AI / assistant usage for admin analytics. Never throws — failures are logged only.
 */
export async function recordAiUsage(input: RecordAiUsageInput): Promise<void> {
  try {
    await getDb()
    const oid = new mongoose.Types.ObjectId(input.userId)
    await AiUsageEvent.create({
      userId: oid,
      eventType: input.eventType,
      surface: input.surface,
      model: input.model?.trim() || undefined,
      mock: input.mock,
      promptTokens: input.promptTokens ?? undefined,
      completionTokens: input.completionTokens ?? undefined,
      totalTokens: input.totalTokens ?? undefined,
      durationMs: Math.max(0, input.durationMs ?? 0),
      meta: input.meta,
    })
  } catch (e) {
    console.warn("[recordAiUsage]", e instanceof Error ? e.message : e)
  }
}
