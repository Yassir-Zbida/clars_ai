"use client"

import { enqueueClientLog } from "@/lib/client-logger"

let installed = false

function extractUserVisibleMessage(payload: Record<string, unknown>): string | undefined {
  const direct = ["error", "message", "detail", "title", "description"]
    .map((k) => payload[k])
    .find((v) => typeof v === "string" && v.trim().length > 0) as string | undefined
  if (direct) return direct.trim()

  const nested = payload.data
  if (nested && typeof nested === "object") {
    const d = nested as Record<string, unknown>
    const inner = d.error ?? d.message
    if (typeof inner === "string" && inner.trim()) return inner.trim()
  }

  if (payload.issues && typeof payload.issues === "object") return "Validation failed"

  return undefined
}

/** Patch `fetch` once to log same-origin `/api/*` responses (success + failure) for the admin log stream. */
export function installApiFetchLogger() {
  if (installed || typeof window === "undefined") return
  installed = true

  const orig = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const res = await orig(input, init)

    try {
      const url =
        typeof input === "string"
          ? input
          : input instanceof Request
            ? input.url
            : String(input)

      const u = new URL(url, window.location.origin)
      if (u.origin !== window.location.origin) return res
      if (!u.pathname.startsWith("/api/")) return res
      if (u.pathname === "/api/client-logs") return res
      // Avoid self-noise while an admin has the log monitor open (otherwise every poll becomes a row).
      if (u.pathname.startsWith("/api/admin/logs")) return res

      const method = (
        init?.method ??
        (input instanceof Request ? input.method : "GET") ??
        "GET"
      ).toUpperCase()

      let userVisible: string | undefined
      const ct = res.headers.get("content-type") ?? ""
      if (ct.includes("application/json")) {
        const clone = res.clone()
        try {
          const j = (await clone.json()) as Record<string, unknown>
          userVisible = extractUserVisibleMessage(j)?.slice(0, 600)
        } catch {
          /* ignore parse */
        }
      }

      const shortPath = u.pathname + (u.search.length > 160 ? `${u.search.slice(0, 160)}…` : u.search)
      const level = res.ok ? "info" : res.status >= 500 ? "error" : "warn"

      let summary = `${method} ${shortPath} · ${res.status}`
      if (userVisible) summary += ` · ${userVisible.slice(0, 200)}`

      enqueueClientLog({
        type: "api",
        level,
        name: "api_request",
        message: summary.slice(0, 800),
        meta: {
          method,
          status: res.status,
          ok: res.ok,
          apiPath: u.pathname + (u.search.length ? u.search : ""),
          userVisibleMessage: userVisible,
        },
      })
    } catch {
      /* never break fetch */
    }

    return res
  }
}
