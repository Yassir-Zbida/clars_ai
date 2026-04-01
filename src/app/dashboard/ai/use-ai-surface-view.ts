"use client"

import { useEffect, useRef } from "react"

/** Fires once per mount so admins can correlate assistant page visits with API completions. */
export function useAiSurfacePageView(surface: "chat" | "email" | "reports") {
  const sent = useRef(false)
  useEffect(() => {
    if (sent.current) return
    sent.current = true
    void fetch("/api/ai/page-view", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ surface }),
    }).catch(() => {})
  }, [surface])
}
