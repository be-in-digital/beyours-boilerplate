"use client"

import { ResetPasswordForm } from "@be-in-digital/admin"
import { authClient } from "@/lib/auth-client"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function ResetPasswordContent() {
  const params = useSearchParams()
  const token = params.get("token")

  return (
    <ResetPasswordForm
      token={token}
      onSubmit={async (newPassword, t) => {
        const result = await authClient.resetPassword({
          newPassword,
          token: t,
        })
        return { error: result.error?.message }
      }}
    />
  )
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  )
}
