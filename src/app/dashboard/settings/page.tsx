"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { KeyRoundIcon, Loader2, MailIcon, ShieldCheckIcon, ShieldIcon, UserIcon } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { CURRENCY_OPTIONS, useCurrency } from "@/contexts/currency-context"

type SettingsTab = "profile" | "security"

const TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Profile", icon: UserIcon },
  { id: "security", label: "Security", icon: ShieldIcon },
]

type BizForm = {
  companyName: string; companyTagline: string; companyAddress: string
  companyPhone: string; companyEmail: string; companyWebsite: string
  taxId: string; paymentInfo: string; signatureText: string
}
const emptyBiz = (): BizForm => ({
  companyName: "", companyTagline: "", companyAddress: "",
  companyPhone: "", companyEmail: "", companyWebsite: "",
  taxId: "", paymentInfo: "", signatureText: "",
})

/* ── Canvas signature pad ─────────────────────────────────────── */
function SignaturePad({ value, onSave }: { value: string; onSave: (url: string) => void }) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const drawing    = useRef(false)
  const lastPos    = useRef<{ x: number; y: number } | null>(null)
  const [hasStroke, setHasStroke] = useState(false)

  // Restore saved signature whenever `value` arrives (e.g. after /api/user/me loads)
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext("2d")!
    if (!value) {
      ctx.clearRect(0, 0, c.width, c.height)
      setHasStroke(false)
      return
    }
    ctx.clearRect(0, 0, c.width, c.height)
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, c.width, c.height)
      setHasStroke(true)
    }
    img.src = value
  }, [value])

  function getXY(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!
    const r = c.getBoundingClientRect()
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) }
  }

  function onDown(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = true
    lastPos.current = getXY(e)
    ;(e.target as HTMLCanvasElement).setPointerCapture(e.pointerId)
  }

  function onMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || !lastPos.current) return
    const ctx = canvasRef.current!.getContext("2d")!
    const pos = getXY(e)
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = "#111827"
    ctx.lineWidth = 2.2
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.stroke()
    lastPos.current = pos
    setHasStroke(true)
  }

  function onUp() { drawing.current = false; lastPos.current = null }

  function clear() {
    const c = canvasRef.current!
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height)
    setHasStroke(false)
  }

  /** Export smaller PNG so PATCH body stays well under limits and DB is happy */
  function exportSignaturePng(): string {
    const src = canvasRef.current!
    const out = document.createElement("canvas")
    out.width = 400
    out.height = 140
    const octx = out.getContext("2d")!
    octx.fillStyle = "#ffffff"
    octx.fillRect(0, 0, out.width, out.height)
    octx.drawImage(src, 0, 0, out.width, out.height)
    return out.toDataURL("image/png", 0.92)
  }

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-xl border border-input bg-white" style={{ touchAction: "none" }}>
        <canvas
          ref={canvasRef} width={800} height={280}
          className="block w-full cursor-crosshair"
          style={{ height: 140 }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={clear}>Clear</Button>
        <Button type="button" size="sm" disabled={!hasStroke}
          onClick={() => onSave(exportSignaturePng())}>
          Save signature
        </Button>
        {value && !hasStroke && (
          <span className="text-xs text-muted-foreground">Saved ✓ — draw to replace</span>
        )}
      </div>
    </div>
  )
}

/* ── Logo upload (resizes to ≤200×80 before storing) ─────────── */
function LogoUpload({ value, onSave }: { value: string; onSave: (url: string) => void }) {
  const [saving, setSaving] = useState(false)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSaving(true)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const src = ev.target?.result as string
      const img = new Image()
      img.onload = () => {
        const MAX_W = 400; const MAX_H = 160
        const scale = Math.min(MAX_W / img.width, MAX_H / img.height, 1)
        const canvas = document.createElement("canvas")
        canvas.width  = Math.round(img.width  * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL("image/png")
        onSave(dataUrl)
        setSaving(false)
      }
      img.src = src
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  return (
    <div className="space-y-2">
      {value ? (
        <div className="flex items-center gap-3 rounded-xl border border-input bg-muted/20 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Logo" className="max-h-12 max-w-[140px] object-contain" />
          <Button type="button" variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive"
            onClick={() => onSave("")}>Remove</Button>
        </div>
      ) : (
        <div className="flex h-16 items-center justify-center rounded-xl border-2 border-dashed border-input bg-muted/10 text-xs text-muted-foreground">
          No logo uploaded yet
        </div>
      )}
      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-input bg-card px-3 py-1.5 text-xs font-medium shadow-sm transition hover:bg-muted">
        {saving ? <Loader2 className="size-3 animate-spin" /> : <i className="ri-upload-2-line text-sm" />}
        {value ? "Replace logo" : "Upload logo"}
        <input type="file" accept="image/*" className="sr-only" onChange={handleFile} disabled={saving} />
      </label>
      <p className="text-[11px] text-muted-foreground">PNG/JPG recommended. Auto-resized to fit.</p>
    </div>
  )
}

export default function SettingsPage() {
  const { data: session, status, update } = useSession()
  const { currency, setCurrency } = useCurrency()
  const [name, setName] = useState("")
  const [biz, setBiz] = useState<BizForm>(emptyBiz())
  const [signatureDataUrl, setSignatureDataUrl] = useState("")
  const [logoDataUrl, setLogoDataUrl] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingBiz, setSavingBiz] = useState(false)
  const [savingCurrency, setSavingCurrency] = useState(false)
  const [seedingDemo, setSeedingDemo] = useState(false)
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile")

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/user/me", { credentials: "include" })
        if (!res.ok) return
        const json = (await res.json()) as { data: { name: string; email: string; signatureDataUrl?: string; logoDataUrl?: string } & BizForm }
        if (!cancelled) {
          setName(json.data.name || "")
          setBiz({
            companyName:    json.data.companyName    ?? "",
            companyTagline: json.data.companyTagline ?? "",
            companyAddress: json.data.companyAddress ?? "",
            companyPhone:   json.data.companyPhone   ?? "",
            companyEmail:   json.data.companyEmail   ?? "",
            companyWebsite: json.data.companyWebsite ?? "",
            taxId:          json.data.taxId          ?? "",
            paymentInfo:    json.data.paymentInfo    ?? "",
            signatureText:  json.data.signatureText  ?? "",
          })
          setSignatureDataUrl(json.data.signatureDataUrl ?? "")
          setLogoDataUrl(json.data.logoDataUrl ?? "")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function onSaveBiz(e: FormEvent) {
    e.preventDefault()
    setSavingBiz(true)
    try {
      const res = await fetch("/api/user/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        /* Do not send signature/logo here — empty state could wipe DB before load finishes */
        body: JSON.stringify(biz),
      })
      if (!res.ok) throw new Error("save")
      toast.success("Business profile saved")
    } catch {
      toast.error("Could not save business profile")
    } finally {
      setSavingBiz(false)
    }
  }

  async function saveAsset(field: "signatureDataUrl" | "logoDataUrl", value: string, setter: (v: string) => void) {
    setter(value)
    try {
      const res = await fetch("/api/user/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      })
      if (!res.ok) throw new Error()
      toast.success(field === "signatureDataUrl" ? "Signature saved" : "Logo saved")
    } catch {
      toast.error("Could not save")
    }
  }

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

  async function onSaveCurrency(code: string) {
    setSavingCurrency(true)
    try {
      await setCurrency(code)
      toast.success("Account currency updated")
    } catch {
      toast.error("Could not update currency")
    } finally {
      setSavingCurrency(false)
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
  const isDemoUser = email.trim().toLowerCase() === "zbidayassir10@gmail.com"

  async function onSeedDemoData() {
    setSeedingDemo(true)
    try {
      const res = await fetch("/api/dev/seed-demo", {
        method: "POST",
        credentials: "include",
      })
      if (!res.ok) throw new Error("seed")
      toast.success("Demo data was reset and seeded")
    } catch {
      toast.error("Could not seed demo data")
    } finally {
      setSeedingDemo(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 pb-8 pt-0 lg:px-6 lg:pt-0">
      <Card className="border-input bg-linear-to-br from-primary/5 via-card to-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Settings</CardTitle>
          <CardDescription className="text-sm">
            Manage your profile, account access, and basic security controls.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Sidebar nav */}
        <nav className="flex shrink-0 flex-row gap-1 rounded-xl border border-input bg-muted/20 p-1.5 lg:w-52 lg:flex-col">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex flex-1 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors lg:flex-none",
                activeTab === id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Profile panel */}
        {activeTab === "profile" && (
          <div className="grid min-w-0 flex-1 gap-4 xl:grid-cols-[minmax(0,40rem)_minmax(16rem,1fr)]">
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
                    <Button type="submit" disabled={saving} className="min-w-28">
                      {saving ? <Loader2 className="size-4 animate-spin" /> : "Save changes"}
                    </Button>
                    <p className="text-xs text-muted-foreground">Updates apply immediately.</p>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Currency preference */}
            <Card className="border-input shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <i className="ri-money-dollar-circle-line text-primary" />
                  Account currency
                </CardTitle>
                <CardDescription className="text-xs">
                  Sets the default currency for new documents and all financial summaries across the app.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-3">
                  <div className="flex-1 max-w-xs space-y-2">
                    <Label htmlFor="currency">Display currency</Label>
                    <Select value={currency} onValueChange={(v) => v && onSaveCurrency(v)}>
                      <SelectTrigger id="currency" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {CURRENCY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.code} value={opt.code}>
                            <span className="font-mono text-xs mr-2 text-muted-foreground">{opt.symbol}</span>
                            {opt.code} — {opt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {savingCurrency && (
                    <p className="pb-2 text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="size-3 animate-spin" /> Saving…
                    </p>
                  )}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Applied instantly — no page refresh needed.
                </p>
              </CardContent>
            </Card>

            {/* Business profile */}
            <Card className="border-input shadow-sm xl:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <i className="ri-building-2-line text-primary" />
                  Business profile
                </CardTitle>
                <CardDescription className="text-xs">
                  Shown on printed invoices &amp; quotes — company name, address, payment info, and signature.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={onSaveBiz} className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Company / freelancer name</Label>
                      <Input placeholder="Acme Studio" value={biz.companyName}
                        onChange={(e) => setBiz((b) => ({ ...b, companyName: e.target.value }))} maxLength={200} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Tagline <span className="text-muted-foreground">(optional)</span></Label>
                      <Input placeholder="Design · Strategy · Growth" value={biz.companyTagline}
                        onChange={(e) => setBiz((b) => ({ ...b, companyTagline: e.target.value }))} maxLength={200} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Address</Label>
                    <textarea
                      className="flex min-h-[72px] w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      placeholder={"123 Main Street\nCity, State 10001\nCountry"}
                      value={biz.companyAddress}
                      onChange={(e) => setBiz((b) => ({ ...b, companyAddress: e.target.value }))}
                      maxLength={500}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label>Phone</Label>
                      <Input placeholder="+1 555 000 0000" value={biz.companyPhone}
                        onChange={(e) => setBiz((b) => ({ ...b, companyPhone: e.target.value }))} maxLength={50} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Business email</Label>
                      <Input type="email" placeholder="billing@acme.com" value={biz.companyEmail}
                        onChange={(e) => setBiz((b) => ({ ...b, companyEmail: e.target.value }))} maxLength={200} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Website</Label>
                      <Input placeholder="https://acme.com" value={biz.companyWebsite}
                        onChange={(e) => setBiz((b) => ({ ...b, companyWebsite: e.target.value }))} maxLength={200} />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Tax / VAT ID <span className="text-muted-foreground">(optional)</span></Label>
                      <Input placeholder="US12-345678901" value={biz.taxId}
                        onChange={(e) => setBiz((b) => ({ ...b, taxId: e.target.value }))} maxLength={100} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Signature name <span className="text-muted-foreground">(on invoice)</span></Label>
                      <Input placeholder="Jane Smith" value={biz.signatureText}
                        onChange={(e) => setBiz((b) => ({ ...b, signatureText: e.target.value }))} maxLength={100} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Payment info <span className="text-muted-foreground">(bank, terms, etc.)</span></Label>
                    <textarea
                      className="flex min-h-[72px] w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      placeholder={"Bank: First National Bank\nAccount: 123-456789-0\nSWIFT: FNBAUS33\nPayment due within 30 days"}
                      value={biz.paymentInfo}
                      onChange={(e) => setBiz((b) => ({ ...b, paymentInfo: e.target.value }))}
                      maxLength={1000}
                    />
                  </div>
                  <Button type="submit" disabled={savingBiz} className="min-w-36">
                    {savingBiz ? <Loader2 className="size-4 animate-spin" /> : "Save business profile"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Signature pad */}
            <Card className="border-input shadow-sm xl:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <i className="ri-pen-nib-line text-primary" />
                  Invoice signature
                </CardTitle>
                <CardDescription className="text-xs">
                  Draw your signature below — it will appear on printed invoices &amp; quotes. Click "Save signature" when done.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SignaturePad
                  value={signatureDataUrl}
                  onSave={(url) => saveAsset("signatureDataUrl", url, setSignatureDataUrl)}
                />
              </CardContent>
            </Card>

            {/* Logo upload */}
            <Card className="border-input shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <i className="ri-image-2-line text-primary" />
                  Company logo
                </CardTitle>
                <CardDescription className="text-xs">
                  Displayed in the invoice header next to your company name.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LogoUpload
                  value={logoDataUrl}
                  onSave={(url) => saveAsset("logoDataUrl", url, setLogoDataUrl)}
                />
              </CardContent>
            </Card>

            <Card className="border-input bg-muted/15">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Profile checklist</CardTitle>
                <CardDescription className="text-xs">Quick account visibility checks.</CardDescription>
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

            {isDemoUser && (
              <Card className="border-input bg-muted/15">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Demo data</CardTitle>
                  <CardDescription className="text-xs">
                    Reset and seed dashboard data for product demonstrations.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pb-4">
                  <Button type="button" variant="outline" disabled={seedingDemo} onClick={onSeedDemoData}>
                    {seedingDemo ? <Loader2 className="size-4 animate-spin" /> : "Reset + seed data"}
                  </Button>
                  <p className="text-[11px] text-muted-foreground">
                    This removes your previous contacts, projects, invoices, payments, expenses, and interactions.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Security panel */}
        {activeTab === "security" && (
          <div className="grid min-w-0 flex-1 gap-4 xl:grid-cols-[minmax(0,40rem)_minmax(16rem,1fr)]">
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
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
