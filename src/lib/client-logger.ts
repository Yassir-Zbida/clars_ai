"use client"

export type ClientLogType = "navigation" | "action" | "error" | "api" | "info"
export type ClientLogLevel = "debug" | "info" | "warn" | "error"

export type ClientLogPayload = {
  type: ClientLogType
  level?: ClientLogLevel
  name: string
  message?: string
  path?: string
  meta?: Record<string, unknown>
}

type Buffered = ClientLogPayload & { clientTs: number }

const MAX_BUFFER = 48
const FLUSH_MS = 3500
/** Allow headroom for API logging (many small requests per minute). */
const MAX_PER_MIN = 400

let buffer: Buffered[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
const minuteStamps: number[] = []
let sendAllowed = false

/** Called from AppDiagnostics: only send telemetry when not explicitly logged out. */
export function setClientLogSendAllowed(allow: boolean) {
  sendAllowed = allow
  if (!allow) {
    buffer = []
    if (flushTimer !== null) {
      clearTimeout(flushTimer)
      flushTimer = null
    }
  }
}

function pruneMinute() {
  const t = Date.now()
  while (minuteStamps.length && t - minuteStamps[0]! > 60_000) minuteStamps.shift()
}

function canAccept(): boolean {
  pruneMinute()
  return minuteStamps.length < MAX_PER_MIN
}

export function getClientLogSessionId(): string {
  if (typeof window === "undefined") return ""
  let id = sessionStorage.getItem("clars_log_sid")
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem("clars_log_sid", id)
  }
  return id
}

function scheduleFlush() {
  if (flushTimer !== null) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flushClientLogs()
  }, FLUSH_MS)
}

export function flushClientLogs(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if (flushTimer !== null) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  if (buffer.length === 0) return Promise.resolve()
  const batch = buffer.splice(0, buffer.length)
  return fetch("/api/client-logs", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      sessionId: getClientLogSessionId(),
      events: batch.map((b) => ({
        type: b.type,
        level: b.level,
        name: b.name,
        message: b.message,
        path: b.path,
        meta: b.meta,
        clientTs: b.clientTs,
      })),
    }),
  })
    .then(async (res) => {
      if (!res.ok) buffer.unshift(...batch)
    })
    .catch(() => {
      buffer.unshift(...batch)
    })
}

function beaconFlush() {
  if (typeof window === "undefined" || buffer.length === 0) return
  const batch = buffer.splice(0, buffer.length)
  const body = JSON.stringify({
    sessionId: getClientLogSessionId(),
    events: batch.map((b) => ({
      type: b.type,
      level: b.level,
      name: b.name,
      message: b.message,
      path: b.path,
      meta: b.meta,
      clientTs: b.clientTs,
    })),
  })
  const ok = navigator.sendBeacon("/api/client-logs", new Blob([body], { type: "application/json" }))
  if (!ok) buffer.unshift(...batch)
}

export function enqueueClientLog(ev: ClientLogPayload) {
  if (typeof window === "undefined") return
  if (!sendAllowed) return
  if (!canAccept()) return
  minuteStamps.push(Date.now())

  const path = ev.path ?? window.location.pathname
  buffer.push({
    ...ev,
    path,
    clientTs: Date.now(),
  })

  if (buffer.length >= MAX_BUFFER) {
    void flushClientLogs()
    return
  }
  scheduleFlush()
}

/** Typed helper for product analytics-style events */
export function logClientAction(name: string, meta?: Record<string, unknown>) {
  enqueueClientLog({ type: "action", name, meta })
}

export function logClientInfo(name: string, message?: string, meta?: Record<string, unknown>) {
  enqueueClientLog({ type: "info", name, message, meta })
}

/** When a fetch to your API fails (optional manual call) */
export function logClientApiFailure(apiPath: string, status: number, detail?: string) {
  enqueueClientLog({
    type: "api",
    name: "http_error",
    message: `${status} ${apiPath}`,
    meta: detail ? { detail: detail.slice(0, 300) } : undefined,
  })
}

if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flushClientLogs()
  })
  window.addEventListener("pagehide", () => {
    beaconFlush()
  })
}
