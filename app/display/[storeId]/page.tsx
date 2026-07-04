"use client"

import { useParams } from "next/navigation"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { DisplayHeader } from "./display-header"
import { DisplayColumn } from "./display-column"
import { DisplayFooter } from "./display-footer"
import { useFlashDetection } from "./use-flash-detection"
import "./display.css"

export default function DisplayPage() {
  const params = useParams<{ storeId: string }>()
  const storeId = params.storeId as Id<"stores">

  const data = useQuery(
    api.kitchenTickets.getForDisplay,
    storeId ? { storeId } : "skip"
  )

  const readyIds = data?.ready.map((t: { _id: string }) => t._id) ?? []
  const flashingIds = useFlashDetection(readyIds)

  if (!data) {
    return (
      <div className="display-root items-center justify-center">
        <div className="text-2xl text-slate-400 animate-pulse">
          Chargement...
        </div>
      </div>
    )
  }

  return (
    <div className="display-root">
      <DisplayHeader storeName={data.storeBranding.name} />

      <main className="flex-1 flex px-4 py-2">
        <DisplayColumn
          title="En preparation"
          tickets={data.preparing}
          variant="preparing"
          flashingIds={flashingIds}
        />
        <div className="w-px bg-slate-700 mx-2" />
        <DisplayColumn
          title="Prets a recuperer"
          tickets={data.ready}
          variant="ready"
          flashingIds={flashingIds}
        />
      </main>

      <DisplayFooter storeSlug={data.storeBranding.slug} />
    </div>
  )
}
