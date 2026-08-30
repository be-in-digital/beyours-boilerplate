"use client"

// DELIBERATE DIVERGENCE from apps/reference — do not align.
// The bench implements the whole player flow here (welcome → actions →
// wheel/scratch → result → claim → reward, plus the cooldown and referral
// exits) across ten sibling components and lib/game. None of it ships in the
// template: gamification is not part of what a client buys today, so this is
// a CMS-editable placeholder rather than a copy left to rot out of step with
// the engine. The admin half is stubbed the same way — see
// app/(admin)/dashboard/games/*/page.tsx.

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
