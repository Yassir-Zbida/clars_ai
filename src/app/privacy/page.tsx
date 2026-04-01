import type { Metadata } from "next"
import Image from "next/image"

export const metadata: Metadata = {
  title: "Privacy Policy — Clars.ai",
  description: "How Clars.ai collects, uses, and protects your information.",
}

const sections = [
  {
    title: "Information We Collect",
    body: [
      "When you use Clars.ai, you may provide account information, CRM data, prompts/messages, connected integrations, and support requests.",
      "We also collect limited technical data such as device/browser information, IP address, usage events, and error logs to operate and improve the service.",
    ],
  },
  {
    title: "How We Use Your Information",
    body: [
      "We use your information to provide the service, support AI-powered features, respond to support requests, improve product quality, and maintain security.",
      "We do not use your CRM data or communications to train public AI models without your consent.",
    ],
  },
  {
    title: "CRM and Content Privacy",
    body: [
      "Your contacts, deals, and CRM content remain yours. We process this data only to provide the service features you use.",
      "We do not sell your data and do not expose it publicly unless you explicitly export or share it.",
    ],
  },
  {
    title: "Data Sharing",
    body: [
      "We share limited data only with trusted providers needed to run the service, or when required by law.",
      "We do not sell personal data.",
    ],
  },
  {
    title: "Data Retention and Security",
    body: [
      "We retain data only as long as needed for product operation, legal obligations, and security.",
      "We apply reasonable safeguards such as access controls and secure infrastructure, but no system can guarantee absolute security.",
    ],
  },
  {
    title: "Your Rights",
    body: [
      "Depending on your location, you may request access, correction, deletion, or restriction of your data.",
      "Contact us to exercise your rights.",
    ],
  },
]

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl px-6 py-14">
        <header className="mb-8 border-b border-input pb-6">
          <a href="/" className="mb-6 inline-flex">
            <Image src="/logo.svg" alt="Clars.ai" width={120} height={36} className="h-9 w-auto" priority />
          </a>
          <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: March 20, 2026</p>
        </header>

        <section className="mb-8 rounded-xl border border-input ring-0">
          <div className="p-5 text-sm leading-7 text-muted-foreground">
            Clars.ai respects your privacy and is committed to protecting your information.
            This page explains what we collect, why we collect it, and how we protect it
            when you use our service.
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
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
