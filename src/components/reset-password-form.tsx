"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"

export function ResetPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token") ?? ""
  const email = searchParams.get("email") ?? ""

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      toast.error("Passwords do not match", {
        description: "Please make sure both password fields match.",
        duration: 8000,
      })
      return
    }
    if (password.length < 8) {
      toast.error("Password too short", {
        description: "Password must be at least 8 characters.",
        duration: 8000,
      })
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error("Update failed", {
          description: data?.error ?? "Something went wrong. Please try again.",
          duration: 8000,
        })
        return
      }
      toast.success("Password updated", {
        description: "You can sign in with your new password.",
        duration: 8000,
      })
      setTimeout(() => {
        router.push("/login?reset=success")
      }, 2500)
    } finally {
      setLoading(false)
    }
  }

  if (!token || !email) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="border border-border shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Invalid link</CardTitle>
            <CardDescription>
              This reset link is invalid or expired. Please request a new one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/forgot-password"
              className={cn(buttonVariants({ variant: "default" }), "w-full inline-flex justify-center")}
            >
              Request new link
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border border-border shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Set new password</CardTitle>
          <CardDescription>
            Enter your new password below. Must be at least 8 characters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="password">New password</FieldLabel>
                <PasswordInput
                  id="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="confirm">Confirm password</FieldLabel>
                <PasswordInput
                  id="confirm"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={loading}
                />
              </Field>
              <Field>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Updating..." : "Update password"}
                </Button>
                <FieldDescription className="text-center">
                  <Link
                    href="/login"
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    Back to login
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
