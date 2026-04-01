import type { Metadata } from "next"
import Image from "next/image"

export const metadata: Metadata = {
  title: "Terms of Service — Clars.ai",
  description: "Terms and conditions governing your use of Clars.ai.",
}

const sections = [
  {
    title: "Acceptance of Terms",
    body: [
      "By accessing or using Clars.ai, you agree to these Terms. If you do not agree, do not use the service.",
      "If you use the service for an organization, you confirm you have authority to bind that organization.",
    ],
  },
  {
    title: "Use of the Service",
    body: [
      "You must use Clars.ai only for lawful purposes and in compliance with applicable laws.",
      "You must not abuse, disrupt, reverse engineer, or attempt unauthorized access to the service.",
    ],
  },
  {
    title: "Your Account and Content",
    body: [
      "You are responsible for keeping your account credentials secure.",
      "You keep ownership of your content and data. We process it only to provide and improve the service.",
    ],
  },
  {
    title: "Subscriptions and Billing",
    body: [
      "Paid features may renew automatically unless cancelled before renewal.",
      "Pricing may change with notice, and refunds are governed by applicable law and plan terms.",
    ],
  },
  {
    title: "Warranties and Liability",
    body: [
      "The service is provided as-is and as-available, without warranties of uninterrupted or error-free operation.",
      "To the extent permitted by law, Clars.ai is not liable for indirect or consequential damages.",
    ],
  },
  {
    title: "Changes and Contact",
    body: [
      "We may update these Terms from time to time. Continued use after updates means you accept the revised Terms.",
      "Questions: hello@clars.ai",
    ],
  },
]

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl px-6 py-14">
        <header className="mb-8 border-b border-input pb-6">
          <a href="/" className="mb-6 inline-flex">
            <Image src="/logo.svg" alt="Clars.ai" width={120} height={36} className="h-9 w-auto" priority />
          </a>
          <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: March 20, 2026</p>
        </header>

        <section className="mb-8 rounded-xl border border-input ring-0">
          <div className="p-5 text-sm leading-7 text-muted-foreground">
            Please read these Terms carefully before using Clars.ai. By using the
            service, you agree to these conditions.
          </div>
        </section>

        <div className="space-y-7">
          {sections.map((section, index) => (
            <section key={section.title} className="border-b border-input pb-6 last:border-b-0">
              <h2 className="text-lg font-semibold">
                {index + 1}. {section.title}
              </h2>
              <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>
                    {paragraph === "Questions: hello@clars.ai" ? (
                      <>
                        Questions:{" "}
                        <a href="mailto:hello@clars.ai" className="underline underline-offset-4">
                          hello@clars.ai
                        </a>
                      </>
                    ) : (
                      paragraph
                    )}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
