"use client"

/** Remix Icon helper for sidebar navigation */
export function Ri({ name, className }: { name: string; className?: string }) {
  return (
    <i
      className={`ri-${name} text-base leading-none ${className ?? ""}`}
      aria-hidden
    />
  )
}
