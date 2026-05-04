"use client"

import { useEffect } from "react"
import { api } from "@/convex/_generated/api"
import { useAdminApiStore } from "@be-in-digital/admin"

export function AdminApiInit() {
  const setApi = useAdminApiStore((s) => s.setApi)

  useEffect(() => {
    setApi(api)
  }, [setApi])

  return null
}
