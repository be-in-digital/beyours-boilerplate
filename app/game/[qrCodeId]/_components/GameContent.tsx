"use client"

import { useParams } from "next/navigation"
import { useCmsPage } from "@/lib/cms"

export default function GamePageContent() {
  const params = useParams<{ qrCodeId: string }>()

  const { block } = useCmsPage("game")
  const hero = block("hero")

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
        <h1 className="text-3xl font-bold text-center mb-4">
          {hero.field("title").text ?? "Play & Win!"}
        </h1>
        <p className="text-center text-muted-foreground mb-6">
          QR Code: {params.qrCodeId}
        </p>
        <p className="text-sm text-center text-muted-foreground">
          {hero.field("subtitle").text ??
            "Gamification flow will be implemented here."}
        </p>
      </div>
    </div>
  )
}
