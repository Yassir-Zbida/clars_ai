import { SparklesIcon } from "lucide-react"

import { AiSubnav } from "./ai-subnav"

export default function AiLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-8 pt-0 lg:px-6 lg:pt-0">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <SparklesIcon className="size-6 text-violet-400" />
          AI Assistant
          <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium text-violet-400">
            Beta
          </span>
        </h1>
        <p className="text-xs text-muted-foreground">
          Chat, drafts, and reports powered by your configured model (OpenAI or OpenRouter). No key? Offline tips
          still work.
        </p>
      </div>
      <AiSubnav />
      {children}
    </div>
  )
}
