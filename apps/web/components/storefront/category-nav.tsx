"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"

interface Category {
  _id: string
  name: string
  slug: string
  productCount?: number
}

/**
 * Horizontal scrollable category navigation. Highlights the active
 * category from the `?category=...` query param and lets users switch.
 */
export function CategoryNav({ categories }: { categories: Category[] }) {
  const params = useSearchParams()
  const activeSlug = params.get("category")

  return (
    <nav className="sticky top-16 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
      <div className="mx-auto max-w-6xl overflow-x-auto px-4 md:px-6">
        <ul className="flex gap-1 py-3">
          <li>
            <CategoryLink href="/menu" active={activeSlug === null}>
              Tout
            </CategoryLink>
          </li>
          {categories.map((cat) => (
            <li key={cat._id}>
              <CategoryLink
                href={`/menu?category=${cat.slug}`}
                active={activeSlug === cat.slug}
              >
                {cat.name}
                {cat.productCount !== undefined && (
                  <span className="ml-1.5 text-xs opacity-60">
                    ({cat.productCount})
                  </span>
                )}
              </CategoryLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}

function CategoryLink({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={
        "inline-flex shrink-0 items-center rounded-full px-4 py-1.5 text-sm font-medium transition-colors " +
        (active
          ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
          : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800")
      }
    >
      {children}
    </Link>
  )
}
