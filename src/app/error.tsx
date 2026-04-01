"use client"

import { useEffect } from "react"
import Link from "next/link"

import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[app error]", error)
  }, [error])

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <div className="max-w-md">
        <h1 className="text-xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          An unexpected error occurred. You can try again or use the links below.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-[10px] text-muted-foreground">Ref: {error.digest}</p>
        )}
      </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button type="button" onClick={() => reset()}>
            Try again
          </Button>
          <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline" }))}>
            Dashboard
          </Link>
          <Link href="/" className={cn(buttonVariants({ variant: "ghost" }))}>
            Home
          </Link>
        </div>
    </div>
  )
}
