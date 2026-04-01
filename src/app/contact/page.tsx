import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

import { buttonVariants } from "@/lib/button-variants"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Contact — Clars.ai",
  description: "Reach the Clars.ai team for sales, demos, and support.",
}

const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "hello@clars.ai"

export default function ContactPage() {
  const mailto = `mailto:${contactEmail}?subject=${encodeURIComponent("Clars.ai — inquiry")}`

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl px-6 py-14">
        <header className="mb-10 border-b border-input pb-6">
          <Link href="/" className="mb-6 inline-flex">
            <Image src="/logo.svg" alt="Clars.ai" width={120} height={36} className="h-9 w-auto" priority />
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">Contact us</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sales, demos, partnerships, or product feedback — we read every message.
          </p>
        </header>

        <section className="space-y-6 rounded-xl border border-input bg-card p-6 shadow-sm">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Email</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The fastest way to reach us is by email. We typically reply within one business day.
            </p>
            <a
              href={mailto}
              className={cn(buttonVariants({ variant: "default" }), "mt-4 inline-flex")}
            >
              Write to {contactEmail}
            </a>
          </div>

          <div className="border-t border-input pt-6">
            <h2 className="text-sm font-semibold text-foreground">Book a demo</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Mention your use case and timezone in your email — we&apos;ll suggest a time.
            </p>
          </div>

          <div className="border-t border-input pt-6">
            <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "inline-flex")}>
              ← Back to home
            </Link>
            <Link href="/signup" className={cn(buttonVariants({ variant: "ghost" }), "ml-2 inline-flex")}>
              Create an account
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
