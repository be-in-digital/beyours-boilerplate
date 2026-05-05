"use client"

import { useEffect } from "react"
import { api } from "@repo/backend"
import { useAdminApiStore } from "@be-in-digital/admin"

export function AdminApiInit() {
  const setApi = useAdminApiStore((s) => s.setApi)

  useEffect(() => {
    setApi(api)
  }, [setApi])

  return null
}
