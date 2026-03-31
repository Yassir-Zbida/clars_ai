"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Role = "FOUNDER" | "OPS" | "SALES" | "MARKETING" | "OTHER"
type TeamSize = "JUST_ME" | "2_10" | "11_50" | "51_PLUS"
type PrimaryUse = "CLIENTS_CRM" | "INVOICING" | "PROJECTS" | "ANALYTICS" | "OTHER"
type HowHeard = "SEARCH" | "REFERRAL" | "SOCIAL" | "EVENT" | "OTHER"

export default function OnboardingSurveyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [role, setRole] = useState<Role | "">("")
  const [teamSize, setTeamSize] = useState<TeamSize | "">("")
  const [primaryUse, setPrimaryUse] = useState<PrimaryUse | "">("")
  const [howHeard, setHowHeard] = useState<HowHeard | "">("")
  const [comments, setComments] = useState("")

  const goDashboard = useCallback(() => {
    router.replace("/dashboard")
    router.refresh()
  }, [router])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/user/me", { cache: "no-store" })
        if (!res.ok) {
          if (!cancelled) setLoading(false)
          return
        }
        const json = (await res.json()) as { data?: { needsOnboardingSurvey?: boolean } }
        if (!json?.data?.needsOnboardingSurvey) {
          goDashboard()
          return
        }
      } catch {
        // stay on page
      }
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [goDashboard])

  const postSurvey = async (body: Record<string, unknown>) => {
    setSubmitting(true)
    try {
      const res = await fetch("/api/user/onboarding-survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error("Could not save", {
          description: typeof data?.error === "string" ? data.error : "Please try again.",
        })
        return
      }
      toast.success("Thanks — you're all set.")
      goDashboard()
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void postSurvey({
      role: role || undefined,
      teamSize: teamSize || undefined,
      primaryUse: primaryUse || undefined,
      howHeard: howHeard || undefined,
      comments: comments.trim() || undefined,
    })
  }

  const handleSkip = () => {
    void postSurvey({ skipped: true })
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-8">
      <Card className="border border-input shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Quick survey</CardTitle>
          <CardDescription>
            Help us tailor Clars to you. Takes under a minute — then you&apos;ll land on your dashboard.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="flex flex-col gap-5">
            <div className="space-y-2">
              <Label htmlFor="survey-role">Your role</Label>
              <Select value={role || undefined} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger id="survey-role" className="w-full">
                  <SelectValue placeholder="Select one (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FOUNDER">Founder / executive</SelectItem>
                  <SelectItem value="OPS">Operations / RevOps</SelectItem>
                  <SelectItem value="SALES">Sales</SelectItem>
                  <SelectItem value="MARKETING">Marketing</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="survey-team">Team size</Label>
              <Select value={teamSize || undefined} onValueChange={(v) => setTeamSize(v as TeamSize)}>
                <SelectTrigger id="survey-team" className="w-full">
                  <SelectValue placeholder="Select one (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="JUST_ME">Just me</SelectItem>
                  <SelectItem value="2_10">2–10</SelectItem>
                  <SelectItem value="11_50">11–50</SelectItem>
                  <SelectItem value="51_PLUS">51+</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="survey-use">What will you use Clars for first?</Label>
              <Select value={primaryUse || undefined} onValueChange={(v) => setPrimaryUse(v as PrimaryUse)}>
                <SelectTrigger id="survey-use" className="w-full">
                  <SelectValue placeholder="Select one (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLIENTS_CRM">Clients &amp; CRM</SelectItem>
                  <SelectItem value="INVOICING">Invoicing &amp; payments</SelectItem>
                  <SelectItem value="PROJECTS">Projects</SelectItem>
                  <SelectItem value="ANALYTICS">Analytics</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="survey-heard">How did you hear about us?</Label>
              <Select value={howHeard || undefined} onValueChange={(v) => setHowHeard(v as HowHeard)}>
                <SelectTrigger id="survey-heard" className="w-full">
                  <SelectValue placeholder="Select one (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEARCH">Search</SelectItem>
                  <SelectItem value="REFERRAL">Friend / colleague</SelectItem>
                  <SelectItem value="SOCIAL">Social media</SelectItem>
                  <SelectItem value="EVENT">Event / conference</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="survey-comments">Anything else? (optional)</Label>
              <Input
                id="survey-comments"
                placeholder="Short note"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                disabled={submitting}
                maxLength={2000}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" disabled={submitting} onClick={handleSkip} className="w-full sm:w-auto">
              Skip for now
            </Button>
            <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
              {submitting ? "Saving…" : "Continue to dashboard"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
