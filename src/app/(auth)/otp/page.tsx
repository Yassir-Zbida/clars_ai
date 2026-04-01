"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { toast } from "sonner"
import { AuthBrand } from "@/components/auth-brand"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, MailIcon } from "lucide-react"

const CODE_LEN = 6

function OtpForm() {
  const router   = useRouter()
  const [digits, setDigits] = useState<string[]>(Array(CODE_LEN).fill(""))
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [email, setEmail]         = useState("")
  const [pendingToken, setPending] = useState("")
  const refs = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    const e = sessionStorage.getItem("otp_email")
    const t = sessionStorage.getItem("otp_pending_token")
    if (!e || !t) { router.replace("/login"); return }
    setEmail(e)
    setPending(t)
    refs.current[0]?.focus()
  }, [router])

  const code = digits.join("")

  function handleChange(i: number, val: string) {
    const ch = val.replace(/\D/g, "").slice(-1)
    const next = [...digits]
    next[i] = ch
    setDigits(next)
    if (ch && i < CODE_LEN - 1) refs.current[i + 1]?.focus()
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus()
    }
    if (e.key === "ArrowLeft"  && i > 0)            refs.current[i - 1]?.focus()
    if (e.key === "ArrowRight" && i < CODE_LEN - 1) refs.current[i + 1]?.focus()
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LEN)
    const next   = [...digits]
    pasted.split("").forEach((ch, i) => { next[i] = ch })
    setDigits(next)
    const focusIdx = Math.min(pasted.length, CODE_LEN - 1)
    refs.current[focusIdx]?.focus()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (code.length < CODE_LEN) { toast.error("Enter all 6 digits."); return }
    setLoading(true)
    try {
      const res = await fetch("/api/user/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, pendingToken, code }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.verifiedToken) {
        toast.error(data?.error ?? "Invalid code. Please try again.")
        setDigits(Array(CODE_LEN).fill(""))
        refs.current[0]?.focus()
        return
      }
      // Final sign-in using the verified token
      const signInRes = await signIn("credentials", {
        email,
        verifiedToken: data.verifiedToken,
        redirect: false,
      })
      if (signInRes?.error) {
        toast.error("Sign-in failed. Please start again.")
        router.replace("/login")
        return
      }
      sessionStorage.removeItem("otp_email")
      sessionStorage.removeItem("otp_pending_token")
      sessionStorage.setItem("pendingAuthToast", "login")
      window.location.href = "/dashboard"
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setResending(true)
    try {
      toast.error("Session expired — please sign in again to resend.", { duration: 5000 })
      router.replace("/login")
    } finally {
      setResending(false)
    }
  }

  return (
    <Card className="border border-input shadow-xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
          <MailIcon className="size-6 text-primary" />
        </div>
        <CardTitle className="text-xl">Check your email</CardTitle>
        <CardDescription className="text-sm">
          We sent a 6-digit code to{" "}
          <span className="font-medium text-foreground">{email || "your email"}</span>
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Digit boxes */}
          <div className="flex justify-center gap-2" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { refs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={loading}
                className="h-14 w-11 rounded-xl border border-input bg-background text-center text-xl font-bold tabular-nums shadow-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              />
            ))}
          </div>

          <Button type="submit" disabled={loading || code.length < CODE_LEN} className="w-full">
            {loading
              ? <><Loader2 className="mr-2 size-4 animate-spin" />Verifying…</>
              : "Verify code"
            }
          </Button>
        </form>

        <div className="mt-4 text-center text-xs text-muted-foreground">
          Didn&apos;t receive it?{" "}
          <button
            type="button"
            disabled={resending}
            onClick={handleResend}
            className="font-medium text-primary hover:underline disabled:opacity-50"
          >
            {resending ? "Resending…" : "Resend code"}
          </button>
          {" "}or check your spam folder.
        </div>

        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() => router.replace("/login")}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← Back to login
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function OtpPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <AuthBrand />
        <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-card" />}>
          <OtpForm />
        </Suspense>
      </div>
    </div>
  )
}
