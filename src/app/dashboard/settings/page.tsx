"use client"

import { FormEvent, useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { KeyRoundIcon, Loader2, MailIcon, ShieldCheckIcon, ShieldIcon, UserIcon } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { CURRENCY_OPTIONS, useCurrency } from "@/contexts/currency-context"

type SettingsTab = "profile" | "security"

const TABS: { id: SettingsTab; label: string; icon: React.ElementType; remixIcon: string }[] = [
  { id: "profile",  label: "Profile",  icon: UserIcon,  remixIcon: "ri-user-line"  },
  { id: "security", label: "Security", icon: ShieldIcon, remixIcon: "ri-shield-line" },
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

/* ── Shared section primitives ─────────────────────────────────── */
function SectionCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-input bg-card shadow-sm", className)}>
      {children}
    </div>
  )
}

function SectionHeader({
  icon, iconBg = "bg-primary/10", iconColor = "text-primary",
  title, description,
}: {
  icon: string; iconBg?: string; iconColor?: string; title: string; description?: string
}) {
  return (
    <div className="flex items-center gap-2.5 border-b border-input px-5 py-3.5">
      <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", iconBg)}>
        <i className={cn(icon, iconColor, "text-sm")} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-none">{title}</p>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>
    </div>
  )
}

/* ── Canvas signature pad ─────────────────────────────────────── */
function SignaturePad({ value, onSave }: { value: string; onSave: (url: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing   = useRef(false)
  const lastPos   = useRef<{ x: number; y: number } | null>(null)
  const [hasStroke, setHasStroke] = useState(false)

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext("2d")!
    if (!value) { ctx.clearRect(0, 0, c.width, c.height); setHasStroke(false); return }
    ctx.clearRect(0, 0, c.width, c.height)
    const img = new Image()
    img.onload = () => { ctx.drawImage(img, 0, 0, c.width, c.height); setHasStroke(true) }
    img.src = value
  }, [value])

  function getXY(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!
    const r = c.getBoundingClientRect()
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) }
  }
  function onDown(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = true; lastPos.current = getXY(e)
    ;(e.target as HTMLCanvasElement).setPointerCapture(e.pointerId)
  }
  function onMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || !lastPos.current) return
    const ctx = canvasRef.current!.getContext("2d")!
    const pos = getXY(e)
    ctx.beginPath(); ctx.moveTo(lastPos.current.x, lastPos.current.y); ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = "#111827"; ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke()
    lastPos.current = pos; setHasStroke(true)
  }
  function onUp() { drawing.current = false; lastPos.current = null }
  function clear() { canvasRef.current!.getContext("2d")!.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height); setHasStroke(false) }
  function exportSignaturePng() {
    const src = canvasRef.current!; const out = document.createElement("canvas")
    out.width = 400; out.height = 140
    const octx = out.getContext("2d")!
    octx.fillStyle = "#ffffff"; octx.fillRect(0, 0, out.width, out.height)
    octx.drawImage(src, 0, 0, out.width, out.height)
    return out.toDataURL("image/png", 0.92)
  }

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-xl border border-input bg-white" style={{ touchAction: "none" }}>
        <canvas ref={canvasRef} width={800} height={280} className="block w-full cursor-crosshair" style={{ height: 140 }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp} />
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={clear}>Clear</Button>
        <Button type="button" size="sm" disabled={!hasStroke} onClick={() => onSave(exportSignaturePng())}>
          Save signature
        </Button>
        {value && !hasStroke && <span className="text-xs text-muted-foreground">Saved ✓ — draw to replace</span>}
      </div>
    </div>
  )
}

/* ── Logo upload ──────────────────────────────────────────────── */
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
        const MAX_W = 400, MAX_H = 160
        const scale = Math.min(MAX_W / img.width, MAX_H / img.height, 1)
        const canvas = document.createElement("canvas")
        canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale)
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height)
        onSave(canvas.toDataURL("image/png")); setSaving(false)
      }
      img.src = src
    }
    reader.readAsDataURL(file); e.target.value = ""
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
      <p className="text-xs text-muted-foreground">PNG/JPG recommended. Auto-resized to fit.</p>
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────── */
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
  const [otpEnabled, setOtpEnabled] = useState(false)
  const [savingOtp, setSavingOtp] = useState(false)

  const loadOtp = useCallback(async () => {
    try {
      const res = await fetch("/api/user/otp-toggle", { credentials: "include" })
      if (res.ok) { const d = await res.json() as { otpEnabled?: boolean }; setOtpEnabled(d.otpEnabled ?? false) }
    } catch { /* silent */ }
  }, [])

  const toggleOtp = async (val: boolean) => {
    setSavingOtp(true)
    try {
      const res = await fetch("/api/user/otp-toggle", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: val }) })
      if (!res.ok) throw new Error()
      setOtpEnabled(val)
      toast.success(val ? "Email OTP enabled" : "Email OTP disabled")
    } catch { toast.error("Could not update OTP setting") } finally { setSavingOtp(false) }
  }

  useEffect(() => { void loadOtp() }, [loadOtp])

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
    return () => { cancelled = true }
  }, [])

  async function onSaveBiz(e: FormEvent) {
    e.preventDefault(); setSavingBiz(true)
    try {
      const res = await fetch("/api/user/me", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(biz) })
      if (!res.ok) throw new Error("save")
      toast.success("Business profile saved")
    } catch { toast.error("Could not save business profile") } finally { setSavingBiz(false) }
  }

  async function saveAsset(field: "signatureDataUrl" | "logoDataUrl", value: string, setter: (v: string) => void) {
    setter(value)
    try {
      const res = await fetch("/api/user/me", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: value }) })
      if (!res.ok) throw new Error()
      toast.success(field === "signatureDataUrl" ? "Signature saved" : "Logo saved")
    } catch { toast.error("Could not save") }
  }

  async function onSaveProfile(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) { toast.error("Name is required"); return }
    setSaving(true)
    try {
      const res = await fetch("/api/user/me", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: trimmed }) })
      if (!res.ok) throw new Error("save")
      await update({ name: trimmed })
      toast.success("Profile saved")
    } catch { toast.error("Could not save profile") } finally { setSaving(false) }
  }

  async function onSaveCurrency(code: string) {
    setSavingCurrency(true)
    try { await setCurrency(code); toast.success("Account currency updated") }
    catch { toast.error("Could not update currency") } finally { setSavingCurrency(false) }
  }

  async function onSeedDemoData() {
    setSeedingDemo(true)
    try {
      const res = await fetch("/api/dev/seed-demo", { method: "POST", credentials: "include" })
      if (!res.ok) throw new Error("seed")
      toast.success("Demo data was reset and seeded")
    } catch { toast.error("Could not seed demo data") } finally { setSeedingDemo(false) }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
          <i className="ri-loader-4-line animate-spin text-xl text-primary" />
        </span>
        <p className="text-sm text-muted-foreground">Loading settings…</p>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return <p className="px-4 text-sm text-muted-foreground">Please <Link href="/login" className="text-primary underline">sign in</Link>.</p>
  }

  const email = session?.user?.email ?? ""
  const isDemoUser = email.trim().toLowerCase() === "zbidayassir10@gmail.com"

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-8 pt-0 lg:px-6">

      {/* Page header — matches Finance / Analytics pattern */}
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <i className="ri-settings-3-line text-lg text-primary" />
        </span>
        <div>
          <h1 className="text-base font-semibold leading-none tracking-tight">Settings</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Profile, business info, and account security</p>
        </div>
      </div>

      {/* Tab pills — matches Analytics subnav */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map(({ id, label, remixIcon }) => (
          <button key={id} type="button" onClick={() => setActiveTab(id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition",
              activeTab === id
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-input bg-card text-foreground hover:bg-muted"
            )}>
            <i className={cn(remixIcon, "text-sm")} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Profile tab ──────────────────────────────────────────── */}
      {activeTab === "profile" && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,40rem)_minmax(16rem,1fr)]">

          {/* Profile details */}
          <SectionCard>
            <SectionHeader icon="ri-user-3-line" title="Profile details" description="Display name and sign-in email" />
            <form onSubmit={onSaveProfile} className="space-y-4 px-5 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={email} disabled className="bg-muted/50" />
                <p className="text-xs text-muted-foreground">Email change is not enabled in this build.</p>
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
          </SectionCard>

          {/* Account currency */}
          <SectionCard>
            <SectionHeader icon="ri-money-dollar-circle-line" iconBg="bg-emerald-500/10" iconColor="text-emerald-600" title="Account currency" description="Default for new documents and financial summaries" />
            <div className="px-5 py-4">
              <div className="flex items-end gap-3">
                <div className="flex-1 max-w-xs space-y-2">
                  <Label htmlFor="currency">Display currency</Label>
                  <Select value={currency} onValueChange={(v) => v && onSaveCurrency(v)}>
                    <SelectTrigger id="currency" className="w-full"><SelectValue /></SelectTrigger>
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
              <p className="mt-2 text-xs text-muted-foreground">Applied instantly — no page refresh needed.</p>
            </div>
          </SectionCard>

          {/* Business profile */}
          <SectionCard className="xl:col-span-2">
            <SectionHeader icon="ri-building-2-line" title="Business profile" description="Shown on printed invoices & quotes — company name, address, payment info, and signature" />
            <form onSubmit={onSaveBiz} className="space-y-4 px-5 py-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Company / freelancer name</Label>
                  <Input placeholder="Acme Studio" value={biz.companyName} onChange={(e) => setBiz((b) => ({ ...b, companyName: e.target.value }))} maxLength={200} />
                </div>
                <div className="space-y-1.5">
                  <Label>Tagline <span className="text-muted-foreground">(optional)</span></Label>
                  <Input placeholder="Design · Strategy · Growth" value={biz.companyTagline} onChange={(e) => setBiz((b) => ({ ...b, companyTagline: e.target.value }))} maxLength={200} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Address</Label>
                <textarea
                  className="flex min-h-[72px] w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  placeholder={"123 Main Street\nCity, State 10001\nCountry"}
                  value={biz.companyAddress} onChange={(e) => setBiz((b) => ({ ...b, companyAddress: e.target.value }))} maxLength={500}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input placeholder="+1 555 000 0000" value={biz.companyPhone} onChange={(e) => setBiz((b) => ({ ...b, companyPhone: e.target.value }))} maxLength={50} />
                </div>
                <div className="space-y-1.5">
                  <Label>Business email</Label>
                  <Input type="email" placeholder="billing@acme.com" value={biz.companyEmail} onChange={(e) => setBiz((b) => ({ ...b, companyEmail: e.target.value }))} maxLength={200} />
                </div>
                <div className="space-y-1.5">
                  <Label>Website</Label>
                  <Input placeholder="https://acme.com" value={biz.companyWebsite} onChange={(e) => setBiz((b) => ({ ...b, companyWebsite: e.target.value }))} maxLength={200} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Tax / VAT ID <span className="text-muted-foreground">(optional)</span></Label>
                  <Input placeholder="US12-345678901" value={biz.taxId} onChange={(e) => setBiz((b) => ({ ...b, taxId: e.target.value }))} maxLength={100} />
                </div>
                <div className="space-y-1.5">
                  <Label>Signature name <span className="text-muted-foreground">(on invoice)</span></Label>
                  <Input placeholder="Jane Smith" value={biz.signatureText} onChange={(e) => setBiz((b) => ({ ...b, signatureText: e.target.value }))} maxLength={100} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Payment info <span className="text-muted-foreground">(bank, terms, etc.)</span></Label>
                <textarea
                  className="flex min-h-[72px] w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  placeholder={"Bank: First National Bank\nAccount: 123-456789-0\nSWIFT: FNBAUS33\nPayment due within 30 days"}
                  value={biz.paymentInfo} onChange={(e) => setBiz((b) => ({ ...b, paymentInfo: e.target.value }))} maxLength={1000}
                />
              </div>
              <Button type="submit" disabled={savingBiz} className="min-w-36">
                {savingBiz ? <Loader2 className="size-4 animate-spin" /> : "Save business profile"}
              </Button>
            </form>
          </SectionCard>

          {/* Signature pad */}
          <SectionCard className="xl:col-span-2">
            <SectionHeader icon="ri-pen-nib-line" title="Invoice signature" description="Draw your signature — it will appear on printed invoices & quotes" />
            <div className="px-5 py-4">
              <SignaturePad value={signatureDataUrl} onSave={(url) => saveAsset("signatureDataUrl", url, setSignatureDataUrl)} />
            </div>
          </SectionCard>

          {/* Logo upload */}
          <SectionCard>
            <SectionHeader icon="ri-image-2-line" iconBg="bg-violet-500/10" iconColor="text-violet-600" title="Company logo" description="Displayed in the invoice header next to your company name" />
            <div className="px-5 py-4">
              <LogoUpload value={logoDataUrl} onSave={(url) => saveAsset("logoDataUrl", url, setLogoDataUrl)} />
            </div>
          </SectionCard>

          {/* Profile checklist */}
          <SectionCard>
            <SectionHeader icon="ri-shield-check-line" iconBg="bg-emerald-500/10" iconColor="text-emerald-600" title="Profile checklist" description="Quick account visibility checks" />
            <div className="space-y-2 px-5 py-4">
              <div className="flex items-center gap-2 rounded-xl border border-input bg-muted/20 px-3 py-2.5 text-sm">
                <ShieldCheckIcon className="size-4 shrink-0 text-emerald-500" />
                <span>Name is visible across your workspace</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-input bg-muted/20 px-3 py-2.5 text-sm">
                <MailIcon className="size-4 shrink-0 text-blue-500" />
                <span>Email is currently read-only</span>
              </div>
            </div>
          </SectionCard>

          {/* Demo data — demo user only */}
          {isDemoUser && (
            <SectionCard className="border-amber-500/30 bg-amber-500/5">
              <SectionHeader icon="ri-database-2-line" iconBg="bg-amber-500/10" iconColor="text-amber-600" title="Demo data" description="Reset and seed dashboard data for product demonstrations" />
              <div className="space-y-3 px-5 py-4">
                <Button type="button" variant="outline" disabled={seedingDemo} onClick={onSeedDemoData}>
                  {seedingDemo ? <Loader2 className="size-4 animate-spin" /> : "Reset + seed data"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  This removes your previous contacts, projects, invoices, payments, expenses, and interactions.
                </p>
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {/* ── Security tab ─────────────────────────────────────────── */}
      {activeTab === "security" && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,40rem)_minmax(16rem,1fr)]">

          {/* Password */}
          <SectionCard>
            <SectionHeader icon="ri-lock-line" iconBg="bg-blue-500/10" iconColor="text-blue-600" title="Password and access" description="Password and session basics" />
            <div className="space-y-4 px-5 py-4">
              <div className="rounded-xl border border-input bg-muted/20 p-4">
                <div className="flex items-start gap-3">
                  <KeyRoundIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Password</p>
                    <p className="text-xs text-muted-foreground">Use the reset flow if you signed up with email &amp; password.</p>
                    <Link href="/forgot-password" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-2 inline-flex h-8 text-xs")}>
                      Forgot password
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Email OTP (2FA) */}
          <SectionCard>
            <SectionHeader icon="ri-mail-lock-line" iconBg="bg-violet-500/10" iconColor="text-violet-600" title="Email OTP verification" description="Require a 6-digit code sent to your email on every login" />
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-input bg-muted/20 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{otpEnabled ? "OTP login enabled" : "OTP login disabled"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {otpEnabled
                      ? "You will receive a code by email every time you sign in."
                      : "Enable to add an extra verification step when signing in."}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={savingOtp}
                  onClick={() => toggleOtp(!otpEnabled)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50",
                    otpEnabled ? "bg-primary" : "bg-input"
                  )}
                >
                  <span className={cn(
                    "pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm ring-0 transition-transform",
                    otpEnabled ? "translate-x-5" : "translate-x-0.5"
                  )} />
                </button>
              </div>
              {otpEnabled && (
                <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                  <ShieldCheckIcon className="size-3" />
                  Extra sign-in protection is active.
                </p>
              )}
            </div>
          </SectionCard>

          {/* Security status */}
          <SectionCard className="xl:col-span-2">
            <SectionHeader icon="ri-shield-check-line" iconBg="bg-emerald-500/10" iconColor="text-emerald-600" title="Security status" description="Current protection level for this workspace" />
            <div className="space-y-2 px-5 py-4">
              <div className="flex items-center gap-2 rounded-xl border border-input bg-muted/20 px-3 py-2.5 text-sm">
                <ShieldCheckIcon className="size-4 shrink-0 text-emerald-500" />
                <span>Password reset flow is enabled</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-input bg-muted/20 px-3 py-2.5 text-sm">
                {otpEnabled
                  ? <ShieldCheckIcon className="size-4 shrink-0 text-emerald-500" />
                  : <ShieldIcon className="size-4 shrink-0 text-amber-500" />
                }
                <span>{otpEnabled ? "Email OTP enabled — extra login protection active" : "Email OTP not enabled"}</span>
              </div>
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  )
}
