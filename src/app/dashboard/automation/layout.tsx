import { ZapIcon } from "lucide-react"

import { AutomationSubnav } from "./automation-subnav"

export default function AutomationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-8 pt-0 lg:px-6 lg:pt-0">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <ZapIcon className="size-6 text-amber-400" />
          Automation
        </h1>
        <p className="text-xs text-muted-foreground">
          Follow-up reminders, workflow rules, and reusable message templates. Execution hooks can connect to jobs later.
        </p>
      </div>
      <AutomationSubnav />
      {children}
    </div>
  )
}
