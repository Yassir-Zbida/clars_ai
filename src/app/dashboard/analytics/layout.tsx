import { AnalyticsSubnav } from "./analytics-subnav"

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-0 lg:px-6 lg:pt-0">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-xs text-muted-foreground">Revenue, pipeline, and workspace activity across your CRM data.</p>
      </div>
      <AnalyticsSubnav />
      {children}
    </div>
  )
}
