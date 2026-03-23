import Link from "next/link"
import { ArrowRightIcon, SparklesIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function OverviewIntro() {
  return (
    <Card className="border-primary/20 bg-linear-to-br from-primary/5 via-card to-card">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-lg">Welcome to Clars.ai</CardTitle>
            <CardDescription className="max-w-2xl text-sm leading-relaxed">
              Your workspace for <strong className="text-foreground/90">contacts</strong>,{" "}
              <strong className="text-foreground/90">projects</strong>,{" "}
              <strong className="text-foreground/90">invoicing &amp; payments</strong>, and{" "}
              <strong className="text-foreground/90">AI-assisted insights</strong>. Track pipeline health, cash flow,
              and activity—all in one place.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" className="shrink-0 gap-1" render={<Link href="/dashboard/insights" />}>
            <SparklesIcon className="size-3.5 text-violet-400" />
            Smart insights
            <ArrowRightIcon className="size-3.5 opacity-70" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2 pb-4 pt-0">
        <Button size="sm" variant="secondary" className="text-xs" render={<Link href="/dashboard/clients" />}>
          Contacts
        </Button>
        <Button size="sm" variant="secondary" className="text-xs" render={<Link href="/dashboard/projects" />}>
          Projects
        </Button>
        <Button size="sm" variant="secondary" className="text-xs" render={<Link href="/dashboard/invoices" />}>
          Invoices
        </Button>
        <Button size="sm" variant="secondary" className="text-xs" render={<Link href="/dashboard/ai" />}>
          AI assistant
        </Button>
      </CardContent>
    </Card>
  )
}
