import Link from "next/link"
import { ArrowLeft, Sparkles } from "lucide-react"

/**
 * Loyalty placeholder. The full loyalty engine lives in the
 * `@be-in-digital/restaurant` services and Convex `promotions` table —
 * wire it up when the client is ready to launch a loyalty program.
 */
export default function LoyaltyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 md:px-6">
      <Link
        href="/account"
        className="mb-6 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Mon compte
      </Link>

      <div className="rounded-xl border border-zinc-200 bg-gradient-to-br from-amber-50 to-orange-50 p-8 dark:border-zinc-800 dark:from-amber-950 dark:to-orange-950">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
          <Sparkles className="h-6 w-6 text-amber-700 dark:text-amber-300" />
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Programme de fidelite
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Bientot disponible. Cumulez des points a chaque commande, debloquez
          des recompenses et profitez d&apos;offres exclusives.
        </p>
        <Link
          href="/menu"
          className="mt-6 inline-flex rounded-md bg-zinc-900 px-6 py-3 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          Voir le menu
        </Link>
      </div>
    </div>
  )
}
