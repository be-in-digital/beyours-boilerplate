import Link from "next/link"
import { ArrowRight } from "lucide-react"

/**
 * Hero section for the landing page. Tailwind defaults — neutral palette
 * meant to be re-themed per client via globals.css.
 */
export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            BeInDigital — Demo restaurant
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-zinc-900 md:text-6xl dark:text-zinc-50">
            Votre restaurant
            <br />
            en quelques clics.
          </h1>
          <p className="mt-6 text-lg text-zinc-600 dark:text-zinc-400">
            Click & collect, livraison, fidelite. Toute la stack restauration
            de BeInDigital, prete a etre personnalisee pour votre marque.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/menu"
              className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Voir le menu
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/stores"
              className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-6 py-3 text-base font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
            >
              Trouver un restaurant
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
