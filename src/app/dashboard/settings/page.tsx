"use client"

import { FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { KeyRoundIcon, Loader2, MailIcon, ShieldCheckIcon, ShieldIcon, UserIcon } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"

export default function SettingsPage() {
  const { data: session, status, update } = useSession()
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/user/me", { credentials: "include" })
        if (!res.ok) return
        const json = (await res.json()) as { data: { name: string; email: string } }
        if (!cancelled) {
          setName(json.data.name || "")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function onSaveProfile(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error("Name is required")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/user/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      })
      if (!res.ok) throw new Error("save")
      await update({ name: trimmed })
      toast.success("Profile saved")
    } catch {
      toast.error("Could not save profile")
    } finally {
      setSaving(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16 text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" />
        Loading settings…
      </div>
    )
  }

  if (status === "unauthenticated") {
    return (
      <p className="px-4 text-sm text-muted-foreground">
        Please <Link href="/login" className="text-primary underline">sign in</Link>.
      </p>
    )
  }

  const email = session?.user?.email ?? ""

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 pb-8 pt-0 lg:px-6 lg:pt-0">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile and account security.</p>
      </div>

      <Tabs defaultValue="profile" className="gap-5">
        <TabsList variant="line" className="w-full max-w-lg justify-start border-b">
          <TabsTrigger value="profile" className="gap-1.5">
            <UserIcon className="size-3.5" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5">
            <ShieldIcon className="size-3.5" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="grid gap-4 lg:grid-cols-[minmax(16rem,20rem)_minmax(0,36rem)]">
            <Card className="border-input bg-muted/15">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Profile checklist</CardTitle>
                <CardDescription className="text-xs">Keep your account details up to date.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 pb-4 text-sm">
                <div className="flex items-center gap-2 rounded-md border border-input/70 bg-card px-3 py-2">
                  <ShieldCheckIcon className="size-4 text-emerald-500" />
                  <span>Name is visible across your workspace</span>
                </div>
                <div className="flex items-center gap-2 rounded-md border border-input/70 bg-card px-3 py-2">
                  <MailIcon className="size-4 text-blue-500" />
                  <span>Email is currently read-only</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-input shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Profile details</CardTitle>
                <CardDescription className="text-xs">Display name and sign-in email.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={onSaveProfile} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={email} disabled className="bg-muted/50" />
                    <p className="text-[11px] text-muted-foreground">Email change is not enabled in this build.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Display name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="submit" disabled={saving} className="min-w-24">
                      {saving ? <Loader2 className="size-4 animate-spin" /> : "Save changes"}
                    </Button>
                    <p className="text-xs text-muted-foreground">Updates apply immediately.</p>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <div className="grid gap-4 lg:grid-cols-[minmax(16rem,20rem)_minmax(0,36rem)]">
            <Card className="border-input bg-muted/15">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Security status</CardTitle>
                <CardDescription className="text-xs">Current protection level for this workspace.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 pb-4 text-sm">
                <div className="flex items-center gap-2 rounded-md border border-input/70 bg-card px-3 py-2">
                  <ShieldCheckIcon className="size-4 text-emerald-500" />
                  <span>Password reset flow is enabled</span>
                </div>
                <div className="flex items-center gap-2 rounded-md border border-input/70 bg-card px-3 py-2">
                  <ShieldIcon className="size-4 text-amber-500" />
                  <span>2FA not enabled yet</span>
                </div>
              </div>
            </Card>

            <Card className="border-input shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Password and access</CardTitle>
                <CardDescription className="text-xs">Password and session basics.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-input bg-muted/20 p-4">
                  <div className="flex items-start gap-3">
                    <KeyRoundIcon className="mt-0.5 size-5 text-muted-foreground" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Password</p>
                      <p className="text-xs text-muted-foreground">
                        Use the reset flow if you signed up with email & password.
                      </p>
                      <Link
                        href="/forgot-password"
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-2 inline-flex h-8 text-xs")}
                      >
                        Forgot password
                      </Link>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Two-factor auth and device sessions are not configured yet—this keeps the product lean until you need
                  them.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
