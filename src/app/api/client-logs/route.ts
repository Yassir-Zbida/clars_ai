import { NextResponse } from "next/server"
import { z } from "zod"

import { auth } from "@/auth"
import { sanitizeClientLogMeta, metaWithinSize } from "@/lib/client-log-sanitize"
import { getDb } from "@/server/db"
import {
  ClientActivityLog,
  clientActivityLogLevels,
  clientActivityLogTypes,
  type ClientActivityLogLevel,
} from "@/server/models/client-activity-log"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const EventSchema = z.object({
  type: z.enum(clientActivityLogTypes),
  level: z.enum(clientActivityLogLevels).optional(),
  name: z.string().min(1).max(160),
  message: z.string().max(800).optional(),
  path: z.string().max(600).optional(),
  meta: z.record(z.unknown()).optional(),
  clientTs: z.number().optional(),
})

const BodySchema = z.object({
  events: z.array(EventSchema).min(1).max(40),
  sessionId: z.string().max(64).optional(),
})

function defaultLevel(type: z.infer<typeof EventSchema>["type"], explicit?: ClientActivityLogLevel): ClientActivityLogLevel {
  if (explicit && clientActivityLogLevels.includes(explicit)) return explicit
  if (type === "error") return "error"
  if (type === "api") return "warn"
  return "info"
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = BodySchema.parse(await request.json())
    const userEmail = session.user?.email ?? undefined
    const ua = request.headers.get("user-agent")?.slice(0, 400)

    await getDb()

    const docs = body.events.map((ev) => {
      const rawMeta = ev.meta !== undefined ? sanitizeClientLogMeta(ev.meta) : undefined
      const meta = rawMeta !== undefined ? metaWithinSize(rawMeta, 3600) : undefined
      return {
        userId,
        userEmail,
        sessionId: body.sessionId,
        type: ev.type,
        level: defaultLevel(ev.type, ev.level as ClientActivityLogLevel | undefined),
        name: ev.name,
        message: ev.message,
        path: ev.path,
        meta,
        userAgent: ua,
        clientTs: ev.clientTs !== undefined ? new Date(ev.clientTs) : undefined,
      }
    })

    await ClientActivityLog.insertMany(docs, { ordered: false })

    return NextResponse.json({ ok: true, count: docs.length })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: error.flatten() }, { status: 400 })
    }
    console.error("[api/client-logs POST]", error)
    return NextResponse.json({ error: "Failed to record logs" }, { status: 500 })
  }
}
