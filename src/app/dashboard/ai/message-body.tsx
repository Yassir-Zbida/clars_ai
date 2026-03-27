"use client"

import Link from "next/link"

/** Renders markdown-ish assistant text: bold, italic, headings, bullets, numbered lists, inline code, links. */
export function MessageBody({ text }: { text: string }) {
  const lines = text.split("\n")
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // h3
    const h3 = line.match(/^###\s+(.+)$/)
    if (h3) { elements.push(<h4 key={i} className="pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Inline text={h3[1]} /></h4>); i++; continue }

    // h2
    const h2 = line.match(/^##\s+(.+)$/)
    if (h2) { elements.push(<h3 key={i} className="pt-2 text-base font-semibold tracking-tight"><Inline text={h2[1]} /></h3>); i++; continue }

    // h1
    const h1 = line.match(/^#\s+(.+)$/)
    if (h1) { elements.push(<h2 key={i} className="pt-1 text-lg font-semibold tracking-tight"><Inline text={h1[1]} /></h2>); i++; continue }

    // horizontal rule
    if (/^---+$/.test(line.trim())) { elements.push(<hr key={i} className="my-2 border-border/50" />); i++; continue }

    // bullet list item
    if (/^\s*[-*]\s+/.test(line)) {
      const items: React.ReactNode[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(<li key={i} className="flex gap-2"><span className="mt-1 size-1 shrink-0 translate-y-1 rounded-full bg-muted-foreground/60" /><span><Inline text={lines[i].replace(/^\s*[-*]\s+/, "")} /></span></li>)
        i++
      }
      elements.push(<ul key={`ul-${i}`} className="space-y-1.5 pl-0.5">{items}</ul>)
      continue
    }

    // numbered list item
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: React.ReactNode[] = []
      let n = 1
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(<li key={i} className="flex gap-2"><span className="min-w-[1.25rem] text-right font-medium text-muted-foreground">{n}.</span><span><Inline text={lines[i].replace(/^\s*\d+\.\s+/, "")} /></span></li>)
        i++; n++
      }
      elements.push(<ol key={`ol-${i}`} className="space-y-1.5">{items}</ol>)
      continue
    }

    // blank line → spacer
    if (!line.trim()) { elements.push(<div key={i} className="h-2" />); i++; continue }

    // normal paragraph
    elements.push(<p key={i} className="whitespace-pre-wrap"><Inline text={line} /></p>)
    i++
  }

  return <div className="space-y-1.5 text-sm leading-relaxed">{elements}</div>
}

/** Renders inline formatting: **bold**, *italic*, `code`, [text](url) */
function Inline({ text }: { text: string }) {
  // Split on bold, italic, code, link
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
        if (part.startsWith("*") && part.endsWith("*") && part.length > 2)
          return <em key={i}>{part.slice(1, -1)}</em>
        if (part.startsWith("`") && part.endsWith("`"))
          return <code key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.8em]">{part.slice(1, -1)}</code>
        // [label](url)
        const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
        if (linkMatch) {
          const [, label, href] = linkMatch
          const isInternal = href.startsWith("/")
          if (isInternal)
            return <Link key={i} href={href} className="font-medium text-primary underline underline-offset-2 hover:opacity-80">{label}</Link>
          return <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-2 hover:opacity-80">{label}</a>
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}
