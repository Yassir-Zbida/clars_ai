"use client"

import { signIn, signOut } from "next-auth/react"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Loader2 } from "lucide-react"

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const router = useRouter()
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Step 1: Authenticate with NextAuth credentials (proven flow, unchanged)
      const res = await signIn("credentials", {
        email:    email.trim(),
        password: password,
        redirect: false,
      })

      if (res?.error || !res?.ok) {
        toast.error("Login failed", {
          description: "Invalid email or password.",
          duration: 8000,
        })
        return
      }

      // Step 2: Check if OTP is required for this account
      const otpCheck = await fetch("/api/user/otp-toggle", { credentials: "include" })
      const otpData  = otpCheck.ok
        ? (await otpCheck.json() as { otpEnabled?: boolean })
        : { otpEnabled: false }

      if (!otpData.otpEnabled) {
        // No OTP — proceed to dashboard
        sessionStorage.setItem("pendingAuthToast", "login")
        window.location.href = "/dashboard"
        return
      }

      // Step 3: OTP required — send code (session is valid at this point)
      const sendRes  = await fetch("/api/user/send-otp", { method: "POST", credentials: "include" })
      const sendData = sendRes.ok
        ? (await sendRes.json() as { otpRequired?: boolean; pendingToken?: string })
        : {}

      if (!sendData.pendingToken) {
        // Sending failed — fallback: let the user in anyway and warn
        toast.warning("Could not send OTP code. Check your email settings.")
        sessionStorage.setItem("pendingAuthToast", "login")
        window.location.href = "/dashboard"
        return
      }

      // Step 4: Sign out and redirect to OTP verification page
      await signOut({ redirect: false })
      sessionStorage.setItem("otp_email",         email.trim().toLowerCase())
      sessionStorage.setItem("otp_pending_token",  sendData.pendingToken)
      router.push("/otp")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border border-input shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>Sign in to your Clars account</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Link
                    href="/forgot-password"
                    className="ml-auto text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <PasswordInput
                  id="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                />
              </Field>
              <Field>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading
                    ? <><Loader2 className="mr-2 size-4 animate-spin" />Signing in…</>
                    : "Sign in"
                  }
                </Button>
                <FieldDescription className="text-center text-xs">
                  Don&apos;t have an account?{" "}
                  <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
                    Sign up
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <p className="px-6 text-center text-xs text-muted-foreground">
        By signing in you agree to our{" "}
        <a href="/terms" className="underline underline-offset-4 hover:text-foreground">Terms of Service</a>{" "}
        and{" "}
        <a href="/privacy" className="underline underline-offset-4 hover:text-foreground">Privacy Policy</a>.
      </p>
    </div>
  )
}
