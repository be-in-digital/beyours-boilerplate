"use client"

import { ConvexReactClient } from "convex/react"
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react"
import { ThemeProvider } from "next-themes"
import { Toaster } from "sonner"
import { authClient } from "@/lib/auth-client"

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null

export function Providers({ children }: { children: React.ReactNode }) {
  const content = (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
      <Toaster position="bottom-right" richColors closeButton />
    </ThemeProvider>
  )

  if (!convex) {
    return content
  }

  return (
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      {content}
    </ConvexBetterAuthProvider>
  )
}
