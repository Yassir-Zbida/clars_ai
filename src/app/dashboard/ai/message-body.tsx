"use client"

/** Very small markdown-ish renderer for assistant text (**bold**, ## headings, newlines). */
export function MessageBody({ text }: { text: string }) {
  const lines = text.split("\n")
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {lines.map((line, li) => {
        const h3 = line.match(/^###\s+(.+)$/)
        if (h3) {
          return (
            <h4 key={li} className="pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <LineParts text={h3[1]} />
            </h4>
          )
        }
        const h2 = line.match(/^##\s+(.+)$/)
        if (h2) {
          return (
            <h3 key={li} className="pt-2 text-base font-semibold tracking-tight">
              <LineParts text={h2[1]} />
            </h3>
          )
        }
        const h1 = line.match(/^#\s+(.+)$/)
        if (h1) {
          return (
            <h2 key={li} className="pt-1 text-lg font-semibold tracking-tight">
              <LineParts text={h1[1]} />
            </h2>
          )
        }
        if (line.trim().startsWith("- ")) {
          return (
            <div key={li} className="flex gap-2 pl-1 text-sm">
              <span className="text-muted-foreground">•</span>
              <span className="whitespace-pre-wrap">
                <LineParts text={line.replace(/^\s*-\s+/, "")} />
              </span>
            </div>
          )
        }
        return (
          <p key={li} className="whitespace-pre-wrap">
            <LineParts text={line} />
          </p>
        )
      })}
    </div>
  )
}

function LineParts({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-foreground">
              {part.slice(2, -2)}
            </strong>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}
