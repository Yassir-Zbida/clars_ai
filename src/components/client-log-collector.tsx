"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { enqueueClientLog, flushClientLogs } from "@/lib/client-logger"

/** Captures route changes, meaningful UI clicks, and global errors into `/api/client-logs`. */
export function ClientLogCollector() {
  const pathname = usePathname()
  const lastPathRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!pathname) return
    if (lastPathRef.current === pathname) return
    lastPathRef.current = pathname
    enqueueClientLog({
      type: "navigation",
      name: "route_change",
      message: pathname,
      path: pathname,
    })
  }, [pathname])

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const raw = e.target
      if (!(raw instanceof Element)) return
      const el = raw.closest(
        "button, a[href], [role='button'], [data-client-log], input[type='submit'], input[type='button']"
      )
      if (!el) return

      const explicit = el.getAttribute("data-client-log")
      const tag = el.tagName.toLowerCase()
      let label = explicit?.trim()
      if (!label) {
        label =
          el.getAttribute("aria-label")?.trim() ||
          (el instanceof HTMLInputElement
            ? (el.type === "submit" || el.type === "button" ? el.value : undefined)
            : undefined) ||
          el.textContent?.trim().slice(0, 100) ||
          tag
      }

      if (!label) return

      const href =
        el instanceof HTMLAnchorElement ? el.getAttribute("href")?.slice(0, 300) ?? undefined : undefined

      enqueueClientLog({
        type: "action",
        name: "ui_click",
        message: label.slice(0, 160),
        meta: {
          tag,
          href,
          id: el.id || undefined,
        },
      })
    }

    const onError = (ev: ErrorEvent) => {
      enqueueClientLog({
        type: "error",
        name: "window_error",
        message: (ev.message || "Error").slice(0, 400),
        meta: {
          filename: ev.filename,
          lineno: ev.lineno,
          colno: ev.colno,
        },
      })
    }

    const onReject = (ev: PromiseRejectionEvent) => {
      const reason = ev.reason
      const msg =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "Unhandled rejection"
      enqueueClientLog({
        type: "error",
        name: "unhandled_rejection",
        message: msg.slice(0, 400),
      })
    }

    document.addEventListener("click", onClick, true)
    window.addEventListener("error", onError)
    window.addEventListener("unhandledrejection", onReject)

    return () => {
      document.removeEventListener("click", onClick, true)
      window.removeEventListener("error", onError)
      window.removeEventListener("unhandledrejection", onReject)
      void flushClientLogs()
    }
  }, [])

  return null
}
