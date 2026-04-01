import { AnalyticsSubnav } from "./analytics-subnav"

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-2 pt-0 lg:px-6">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
          <i className="ri-bar-chart-box-line text-lg text-blue-500" />
        </span>
        <div>
          <h1 className="text-base font-semibold leading-none tracking-tight">Analytics</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Revenue, pipeline, and workspace activity</p>
        </div>
      </div>
      <AnalyticsSubnav />
      {children}
    </div>
  )
}
