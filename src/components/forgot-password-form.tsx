"use client"

import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error("Request failed", {
          description: data?.error ?? "Something went wrong. Please try again.",
          duration: 8000,
        })
        return
      }
      toast.success("Check your email", {
        description: "If an account exists, we sent a reset link to your email.",
        duration: 8000,
      })
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="border border-border shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Check your email</CardTitle>
            <CardDescription>
              If an account exists with that email, we sent a password reset link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldDescription className="text-center">
              <Link
                href="/login"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Back to login
              </Link>
            </FieldDescription>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border border-border shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Forgot your password?</CardTitle>
          <CardDescription>
            Enter your email and we&apos;ll send you a reset link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </Field>
              <Field>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Sending..." : "Send reset link"}
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
