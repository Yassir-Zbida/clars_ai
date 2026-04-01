"use client"

import Link from "next/link"
import { CreditCardIcon, SparklesIcon } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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
  icon?: string; iconBg?: string; iconColor?: string
  lucideIcon?: React.ReactNode; title: string; description?: string
}) {
  return (
    <div className="flex items-center gap-2.5 border-b border-input px-5 py-3.5">
      {icon && (
        <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", iconBg)}>
          <i className={cn(icon, iconColor, "text-sm")} />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-none">{title}</p>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>
    </div>
  )
}

export default function BillingPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-8 pt-0 lg:px-6">

      {/* Page header */}
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <i className="ri-bank-card-line text-lg text-primary" />
        </span>
        <div>
          <h1 className="text-base font-semibold leading-none tracking-tight">Billing</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Plan and payments for the product — separate from customer invoices in Finance
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">

        {/* Current plan */}
        <SectionCard>
          <SectionHeader
            icon="ri-sparkling-line"
            iconBg="bg-amber-500/10"
            iconColor="text-amber-500"
            title="Current plan"
            description="Workspace tier — no payment provider wired yet"
          />
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center gap-2">
              <SparklesIcon className="size-4 text-amber-400" />
              <span className="text-lg font-semibold">Starter</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Usage limits and paid upgrades can plug in here (Stripe, Paddle, etc.) when you&apos;re ready — no extra
              DB tables required until then.
            </p>
            <div className="rounded-xl border border-input bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Free tier</span> — unlimited contacts, projects, and invoices
              during the early-access period.
            </div>
          </div>
        </SectionCard>

        {/* Revenue / Finance links */}
        <SectionCard>
          <SectionHeader
            icon="ri-line-chart-line"
            iconBg="bg-blue-500/10"
            iconColor="text-blue-500"
            title="Your revenue"
            description="Money you collect from clients lives in Finance"
          />
          <div className="px-5 py-4 space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Track invoices, payments, and expenses in the Finance section. Billing here only covers your own
              subscription to this product.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/finance" className={cn(buttonVariants({ size: "sm" }), "h-8 text-xs")}>
                <CreditCardIcon className="mr-1.5 size-3.5" />
                Finance overview
              </Link>
              <Link href="/dashboard/invoices" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs")}>
                Invoices
              </Link>
            </div>
          </div>
        </SectionCard>

      </div>
    </div>
  )
}
