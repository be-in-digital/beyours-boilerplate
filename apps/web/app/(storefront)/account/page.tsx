"use client"

import Link from "next/link"
import { LogOut, ShoppingBag, Sparkles } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { CustomerSignIn } from "@/components/storefront/customer-sign-in"

/**
 * Customer account home page.
 *
 * Distinct from the admin dashboard at /dashboard which requires
 * `role: admin`. Anyone with a Better Auth session can land here;
 * the storefront is happy to leave them as a guest checkout user
 * if they prefer.
 */
export default function AccountPage() {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 md:px-6">
        <div className="h-32 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      </div>
    )
  }

  if (!session?.user) {
    return <CustomerSignIn />
  }

  const handleSignOut = async () => {
    await authClient.signOut()
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 md:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl dark:text-zinc-50">
        Mon compte
      </h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {session.user.email}
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <AccountCard
          href="/account/orders"
          icon={ShoppingBag}
          title="Mes commandes"
          description="Historique et suivi"
        />
        <AccountCard
          href="/account/loyalty"
          icon={Sparkles}
          title="Fidelite"
          description="Points et avantages"
        />
      </div>

      <button
        type="button"
        onClick={handleSignOut}
        className="mt-8 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        <LogOut className="h-4 w-4" />
        Se deconnecter
      </button>
    </div>
  )
}

function AccountCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string
  icon: typeof ShoppingBag
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-4 rounded-xl border border-zinc-200 bg-white p-6 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
        <Icon className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
      </div>
      <div>
        <p className="font-medium text-zinc-900 dark:text-zinc-50">{title}</p>
        <p className="mt-0.5 text-sm text-zinc-500">{description}</p>
      </div>
    </Link>
  )
}
