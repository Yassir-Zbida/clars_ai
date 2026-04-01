import Link from "next/link"

import { buttonVariants } from "@/lib/button-variants"
import { cn } from "@/lib/utils"

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The page you are looking for does not exist or may have been moved.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Link href="/" className={cn(buttonVariants())}>
          Back to home
        </Link>
        <Link href="/login" className={cn(buttonVariants({ variant: "outline" }))}>
          Log in
        </Link>
      </div>
    </div>
  )
}
