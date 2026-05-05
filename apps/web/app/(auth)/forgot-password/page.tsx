"use client"

import { ForgotPasswordForm } from "@be-in-digital/admin"
import { authClient } from "@/lib/auth-client"

export default function Page() {
  return (
    <ForgotPasswordForm
      onSubmit={async (email) => {
        const result = await authClient.forgetPassword({
          email,
          redirectTo: "/reset-password",
        })
        return { error: result.error?.message }
      }}
    />
  )
}
