"use client"

import { useEffect } from "react"
import { useQuery } from "convex/react"
import { authClient } from "@/lib/auth-client"
import { useAdminAuthStore } from "@be-in-digital/admin"
import { api } from "@/convex/_generated/api"
import type { Role } from "@/lib/rbac"

/**
 * Sync Better Auth session + Convex userProfile into the admin Zustand store.
 */
export function AdminAuthSync() {
  const { data: session, isPending: sessionLoading } =
    authClient.useSession()

  const userId = session?.user?.id
  const profile = useQuery(
    api.userProfiles.getByUserId,
    userId ? { userId } : "skip"
  )

  const setAuth = useAdminAuthStore((s) => s.setAuth)
  const setLoading = useAdminAuthStore((s) => s.setLoading)
  const clearAuth = useAdminAuthStore((s) => s.clearAuth)

  useEffect(() => {
    if (sessionLoading) {
      setLoading(true)
      return
    }

    if (!session?.user) {
      clearAuth()
      return
    }

    // Session exists but profile still loading from Convex
    if (profile === undefined) {
      setLoading(true)
      return
    }

    const user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name ?? undefined,
      image: session.user.image ?? undefined,
    }

    const role = (profile?.role ?? "customer") as Role

    const signOut = async () => {
      await authClient.signOut()
      clearAuth()
    }

    setAuth(user, role, signOut)
  }, [session, sessionLoading, profile, setAuth, setLoading, clearAuth])

  return null
}
