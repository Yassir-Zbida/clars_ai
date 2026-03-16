"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ArrowUpRight,
  ArrowDownRight,
  UsersIcon,
  FileTextIcon,
  WalletIcon,
} from "lucide-react"

const summaryCards = [
  {
    label: "Active clients",
    value: "32",
    change: "+6 this month",
    trend: "up" as const,
    icon: UsersIcon,
  },
  {
    label: "Open projects",
    value: "14",
    change: "3 due this week",
    trend: "neutral" as const,
    icon: FileTextIcon,
  },
  {
    label: "Unpaid invoices",
    value: "7",
    change: "⟂ $3.2k outstanding",
    trend: "down" as const,
    icon: WalletIcon,
  },
]

const recentClients = [
  { name: "Atlas Studio", status: "On track", value: "$2,400" },
  { name: "Nova Labs", status: "Reviewing proposal", value: "$1,050" },
  { name: "Marhaba Group", status: "Invoice overdue", value: "$780" },
]

export function ClientDashboard() {
  return (
    <section className="mt-6 w-full space-y-8">
      <div className="grid w-full gap-4 md:grid-cols-3">
        {summaryCards.map((card) => {
          const TrendIcon =
            card.trend === "down"
              ? ArrowDownRight
              : card.trend === "up"
                ? ArrowUpRight
                : undefined

          return (
            <Card key={card.label} className="border-border/60 bg-card/60">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tracking-tight">
                    {card.value}
                  </span>
                  {TrendIcon && (
                    <Badge
                      variant={
                        card.trend === "down" ? "destructive" : "outline"
                      }
                      className="flex items-center gap-1 px-1.5 text-[11px]"
                    >
                      <TrendIcon className="h-3 w-3" />
                      {card.change}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="border-border/60 bg-card/60">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base font-semibold">
              Recent clients
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Quick view of the accounts you touched most recently.
            </p>
          </div>
          <Button size="sm" variant="outline">
            View all
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {recentClients.map((client) => (
            <div
              key={client.name}
              className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2 text-sm"
            >
              <div className="flex flex-col">
                <span className="font-medium">{client.name}</span>
                <span className="text-xs text-muted-foreground">
                  {client.status}
                </span>
              </div>
              <span className="text-xs font-medium text-foreground/80">
                {client.value}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  )
}

