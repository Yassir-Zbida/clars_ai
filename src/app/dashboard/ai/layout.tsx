import { AiSubnav } from "./ai-subnav"

export default function AiLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-0 lg:px-6 lg:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            Clars Assistant
            
          </h1>
          <p className="text-xs text-muted-foreground">
            Your AI-powered CRM copilot — responds in any language.
          </p>
        </div>
        <AiSubnav />
      </div>
      {children}
    </div>
  )
}
