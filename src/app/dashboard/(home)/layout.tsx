import { DashboardSubnav } from "./dashboard-subnav"

export default function DashboardHomeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col gap-4 pb-6">
      <div className="flex flex-col gap-2 px-4 pt-0 lg:px-6">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Workspace
          </p>
          <p className="text-xs text-muted-foreground">
            Overview metrics, AI-powered insights, and your latest workspace activity.
          </p>
        </div>
        <DashboardSubnav />
      </div>
      {children}
    </div>
  )
}
