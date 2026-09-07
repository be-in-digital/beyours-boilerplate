"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useStoreId } from "@/lib/hooks/use-store-id"
import { Skeleton } from "@be-in-digital/ui"
import { Heading, CategoryCard } from "@/components/website"

/**
 * A six-hue rotation, one per category card. Decorative, not brand — the point
 * is that adjacent cards differ, which is why the sweep in #41 had to leave it
 * alone: mapping the first two onto `--primary` made categories 1 and 2
 * identical and turned a rotation into a repetition.
 */
const CATEGORY_COLORS = [
    { color: "from-orange-500/20 to-orange-500/5", borderColor: "border-orange-200" },
    { color: "from-emerald-500/20 to-emerald-500/5", borderColor: "border-emerald-200" },
    { color: "from-blue-500/20 to-blue-500/5", borderColor: "border-blue-200" },
    { color: "from-pink-500/20 to-pink-500/5", borderColor: "border-pink-200" },
    { color: "from-yellow-500/20 to-yellow-500/5", borderColor: "border-yellow-200" },
    { color: "from-purple-500/20 to-purple-500/5", borderColor: "border-purple-200" },
]

interface CategoriesSectionProps {
    badge: string
    sectionTitle: string
    description: string
}

export function CategoriesSection({ badge, sectionTitle, description }: CategoriesSectionProps) {
    const { storeId } = useStoreId()

    const categories = useQuery(
        api.categories.listActiveWithCounts,
        storeId ? { storeId: storeId as Id<"stores"> } : "skip"
    )

    const isLoading = categories === undefined

    // Loading state
    if (isLoading) {
        return (
            <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
                <Heading
                    align="center"
                    badge={badge}
                    title={sectionTitle}
                    description={description}
                />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-[200px] w-full rounded-[2.5rem]" />
                    ))}
                </div>
            </section>
        )
    }

    // Empty state — hide section entirely
    if (!categories || categories.length === 0) {
        return null
    }

    return (
        <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
            <Heading
                align="center"
                badge={badge}
                title={sectionTitle}
                description={description}
            />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                {categories.map((cat, index) => {
                    const colorSet = CATEGORY_COLORS[index % CATEGORY_COLORS.length]!
                    const hasImage = !!cat.imageUrl
                    return (
                        <CategoryCard
                            key={cat._id}
                            title={cat.name}
                            icon={hasImage ? cat.imageUrl : "🍽️"}
                            isImageUrl={hasImage}
                            itemsCount={cat.productCount}
                            countText="Items"
                            color={colorSet.color}
                            borderColor={colorSet.borderColor}
                        />
                    )
                })}
            </div>
        </section>
    )
}
