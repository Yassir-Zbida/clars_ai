"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

type Role       = "FOUNDER" | "OPS" | "SALES" | "MARKETING" | "OTHER"
type TeamSize   = "JUST_ME" | "2_10" | "11_50" | "51_PLUS"
type PrimaryUse = "CLIENTS_CRM" | "INVOICING" | "PROJECTS" | "ANALYTICS" | "OTHER"
type HowHeard   = "SEARCH" | "REFERRAL" | "SOCIAL" | "EVENT" | "OTHER"

/* ── Step definitions ────────────────────────────────────────────────────── */

const STEPS = [
  {
    key: "role",
    q: "What's your role?",
    sub: "Helps us personalise your experience.",
    cols: 3,
    options: [
      { value: "FOUNDER",    label: "Founder",     icon: "ri-rocket-line"         },
      { value: "OPS",        label: "Operations",  icon: "ri-settings-2-line"     },
      { value: "SALES",      label: "Sales",       icon: "ri-presentation-line"   },
      { value: "MARKETING",  label: "Marketing",   icon: "ri-megaphone-line"      },
      { value: "FREELANCER", label: "Freelancer",  icon: "ri-user-settings-line"  },
      { value: "OTHER",      label: "Other",       icon: "ri-more-line"           },
    ],
  },
  {
    key: "teamSize",
    q: "How big is your team?",
    sub: "We'll suggest the right workflows.",
    cols: 2,
    options: [
      { value: "JUST_ME", label: "Just me",  icon: "ri-user-line"        },
      { value: "2_10",    label: "2 – 10",   icon: "ri-group-line"       },
      { value: "11_50",   label: "11 – 50",  icon: "ri-team-line"        },
      { value: "51_PLUS", label: "51+",      icon: "ri-building-2-line"  },
    ],
  },
  {
    key: "primaryUse",
    q: "What will you use Clars for first?",
    sub: "We'll highlight the right features.",
    cols: 3,
    options: [
      { value: "CLIENTS_CRM", label: "CRM",        icon: "ri-contacts-line"          },
      { value: "INVOICING",   label: "Invoicing",  icon: "ri-file-list-3-line"       },
      { value: "PROJECTS",    label: "Projects",   icon: "ri-folder-line"            },
      { value: "ANALYTICS",   label: "Analytics",  icon: "ri-bar-chart-2-line"       },
      { value: "FINANCE",     label: "Finance",    icon: "ri-money-dollar-circle-line"},
      { value: "OTHER",       label: "Other",      icon: "ri-more-line"              },
    ],
  },
  {
    key: "howHeard",
    q: "How did you find us?",
    sub: "Takes 1 second — helps a lot.",
    cols: 3,
    options: [
      { value: "SEARCH",    label: "Search",       icon: "ri-search-line"        },
      { value: "REFERRAL",  label: "Referral",     icon: "ri-share-line"         },
      { value: "SOCIAL",    label: "Social media", icon: "ri-instagram-line"     },
      { value: "EVENT",     label: "Event",        icon: "ri-calendar-event-line"},
      { value: "AI",        label: "AI assistant", icon: "ri-sparkling-line"     },
      { value: "OTHER",     label: "Other",        icon: "ri-more-line"          },
    ],
  },
] as const

const TOTAL = STEPS.length

/* ── Tile ────────────────────────────────────────────────────────────────── */

function Tile({
  icon, label, selected, onClick,
}: { icon: string; label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        selected
          ? "border-primary bg-primary/10 text-primary shadow-sm"
          : "border-input bg-card text-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
      )}
    >
      <span className={cn(
        "flex size-9 items-center justify-center rounded-lg text-xl transition-colors",
        selected ? "bg-primary/15" : "bg-muted"
      )}>
        <i className={icon} />
      </span>
      {label}
    </button>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function OnboardingSurveyPage() {
  const router = useRouter()
  const [loading, setLoading]     = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep]           = useState(0)
  const [animDir, setAnimDir]     = useState<"in" | "out">("in")

  const [role, setRole]           = useState<Role | "">("")
  const [teamSize, setTeamSize]   = useState<TeamSize | "">("")
  const [primaryUse, setPrimaryUse] = useState<PrimaryUse | "">("")
  const [howHeard, setHowHeard]   = useState<HowHeard | "">("")
  const [comments, setComments]   = useState("")

  const goDashboard = useCallback(() => {
    router.replace("/dashboard")
    router.refresh()
  }, [router])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/user/me", { cache: "no-store" })
        if (!res.ok) { if (!cancelled) setLoading(false); return }
        const json = (await res.json()) as { data?: { needsOnboardingSurvey?: boolean } }
        if (!json?.data?.needsOnboardingSurvey) { goDashboard(); return }
      } catch { /* stay */ }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [goDashboard])

  const values: Record<string, string> = { role, teamSize, primaryUse, howHeard }
  const setters: Record<string, (v: string) => void> = {
    role:       (v) => setRole(v as Role),
    teamSize:   (v) => setTeamSize(v as TeamSize),
    primaryUse: (v) => setPrimaryUse(v as PrimaryUse),
    howHeard:   (v) => setHowHeard(v as HowHeard),
  }

  function advance() {
    setAnimDir("out")
    setTimeout(() => { setStep((s) => s + 1); setAnimDir("in") }, 160)
  }

  function handleTile(key: string, value: string) {
    setters[key]?.(value)
    setTimeout(advance, 200)
  }

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
        toast.error("Could not save", { description: typeof data?.error === "string" ? data.error : "Please try again." })
        return
      }
      toast.success("You're all set! Welcome to Clars.")
      goDashboard()
    } finally {
      setSubmitting(false)
    }
  }

  const handleFinish = () => {
    void postSurvey({ role: role || undefined, teamSize: teamSize || undefined, primaryUse: primaryUse || undefined, howHeard: howHeard || undefined, comments: comments.trim() || undefined })
  }
  const handleSkip = () => void postSurvey({ skipped: true })

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const currentStep = STEPS[step] as (typeof STEPS)[number] | undefined
  const isLastStep  = step === TOTAL

  return (
    /* ── Blurred overlay ── */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">

      {/* ── Modal card ── */}
      <div className="w-full max-w-md rounded-2xl border border-input bg-card shadow-2xl overflow-hidden">

        <div className="px-6 pb-6 pt-5">

          {/* Logo + progress */}
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="Clars.ai" className="h-6 w-auto" />
            </div>
            {!isLastStep && (
              <div className="flex items-center gap-1.5">
                {Array.from({ length: TOTAL }).map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      i < step ? "w-4 bg-primary" : i === step ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/25"
                    )}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Step content ── */}
          <div
            className={cn(
              "transition-all duration-150",
              animDir === "in" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            )}
          >
            {!isLastStep && currentStep ? (
              /* Option tiles */
              <>
                <div className="mb-5">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Step {step + 1} of {TOTAL}
                  </p>
                  <h2 className="mt-1 text-xl font-bold leading-snug tracking-tight">{currentStep.q}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{currentStep.sub}</p>
                </div>

                <div className={cn("grid gap-2", currentStep.cols === 2 ? "grid-cols-2" : "grid-cols-3")}>
                  {currentStep.options.map((opt) => (
                    <Tile
                      key={opt.value}
                      icon={opt.icon}
                      label={opt.label}
                      selected={values[currentStep.key] === opt.value}
                      onClick={() => handleTile(currentStep.key, opt.value)}
                    />
                  ))}
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Skip all
                  </button>
                  <button
                    type="button"
                    onClick={advance}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    Skip this →
                  </button>
                </div>
              </>
            ) : (
              /* Final step — comment + submit */
              <>
                <div className="mb-5 text-center">
                  <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-3xl">
                    <i className="ri-check-line text-primary" />
                  </span>
                  <h2 className="mt-3 text-xl font-bold tracking-tight">Almost there!</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Anything you&apos;d like us to know? (optional)
                  </p>
                </div>

                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="E.g. I'm migrating from HubSpot…"
                  maxLength={2000}
                  rows={3}
                  disabled={submitting}
                  className="w-full resize-none rounded-xl border border-input bg-muted/20 px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary/30"
                />

                <div className="mt-4 flex flex-col gap-2">
                  <Button
                    type="button"
                    onClick={handleFinish}
                    disabled={submitting}
                    className="w-full"
                    size="lg"
                  >
                    {submitting
                      ? <><Loader2 className="mr-2 size-4 animate-spin" />Saving…</>
                      : <><i className="ri-arrow-right-line mr-2" />Go to my dashboard</>
                    }
                  </Button>
                  <button
                    type="button"
                    onClick={handleSkip}
                    disabled={submitting}
                    className="text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                  >
                    Skip and go straight to dashboard
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
