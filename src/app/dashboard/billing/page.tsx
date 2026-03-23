"use client"

import Link from "next/link"
import { CreditCardIcon, SparklesIcon } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export default function BillingPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-8 pt-0 lg:px-6 lg:pt-0">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Billing</h1>
        <p className="text-xs text-muted-foreground">
          Plan and payments for the product itself—separate from customer invoices in Finance.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-input">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <SparklesIcon className="size-4 text-amber-400" />
              Current plan
            </CardTitle>
            <CardDescription className="text-xs">Workspace tier (no payment provider wired yet).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-lg font-semibold">Starter</p>
            <p className="text-xs text-muted-foreground">
              Usage limits and paid upgrades can plug in here (Stripe, Paddle, etc.) when you&apos;re ready—no extra DB
              tables required until then.
            </p>
          </CardContent>
        </Card>

        <Card className="border-input">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CreditCardIcon className="size-4 text-muted-foreground" />
              Your revenue
            </CardTitle>
            <CardDescription className="text-xs">Money you collect from clients lives in Finance.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link href="/dashboard/finance" className={cn(buttonVariants({ size: "sm" }), "h-8 text-xs")}>
              Finance overview
            </Link>
            <Link href="/dashboard/invoices" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs")}>
              Invoices
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
