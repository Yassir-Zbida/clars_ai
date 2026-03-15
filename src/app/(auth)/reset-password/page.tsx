import { Suspense } from "react"
import { AuthBrand } from "@/components/auth-brand"
import { ResetPasswordForm } from "@/components/reset-password-form"

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <AuthBrand />
        <Suspense fallback={<div className="h-48 animate-pulse rounded-xl bg-card" />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
