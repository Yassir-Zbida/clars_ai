"use client"

import { useEffect } from "react"
import { toast } from "sonner"

export const PENDING_TOAST_KEY = "pendingAuthToast"

const TOAST_CONFIG: Record<string, { title: string; description?: string; type: "success" | "info" }> = {
  login: {
    title: "Signed in successfully",
    type: "success",
  },
  signup: {
    title: "Account created",
    description: "Welcome! You're now signed in.",
    type: "success",
  },
  signup_created: {
    title: "Account created",
    description: "Please sign in with your new account.",
    type: "info",
  },
  reset: {
    title: "Password updated",
    description: "You can now sign in with your new password.",
    type: "success",
  },
}

export function AuthToast() {
  useEffect(() => {
    const key = sessionStorage.getItem(PENDING_TOAST_KEY)
    if (!key) return
    sessionStorage.removeItem(PENDING_TOAST_KEY)

    const config = TOAST_CONFIG[key]
    if (!config) return

    if (config.type === "success") {
      toast.success(config.title, { description: config.description, duration: 8000 })
    } else {
      toast.info(config.title, { description: config.description, duration: 8000 })
    }
  }, [])

  return null
}
