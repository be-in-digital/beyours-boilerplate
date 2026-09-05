"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useStoreId } from "@/lib/hooks/use-store-id"
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselPrevious,
    CarouselNext,
} from "@/components/ui/carousel"
import { Skeleton } from "@/components/ui/skeleton"
import { Heading, MealCard } from "@/components/website"

interface TrendingProduct {
    _id: string
    name: string
    price: number
    preparationTime?: number
    images?: string[]
}

interface TrendingSectionProps {
    sectionTitle: string
    viewAllLabel: string
}

export function TrendingSection({ sectionTitle, viewAllLabel }: TrendingSectionProps) {
    const { storeId } = useStoreId()

    const store = useQuery(
        api.stores.getById,
        storeId ? { id: storeId as Id<"stores"> } : "skip"
    )

    const trendingMode = store?.trendingMode ?? "manual"

    const manualProducts = useQuery(
        api.products.getManualTrending,
        storeId && trendingMode === "manual" ? { storeId: storeId as Id<"stores"> } : "skip"
    )

    const autoProducts = useQuery(
        api.products.getTrending,
        storeId && trendingMode === "automatic" ? { storeId: storeId as Id<"stores"> } : "skip"
    )

    const products = trendingMode === "manual" ? manualProducts : autoProducts
    const isLoading = store === undefined || products === undefined

    // Loading state
    if (isLoading) {
        return (
            <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto overflow-hidden">
                <Heading
                    title={sectionTitle}
                    barColor="bg-orange-500"
                    viewAll={{ label: viewAllLabel, href: "/menu" }}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-[320px] w-full rounded-3xl" />
                    ))}
                </div>
            </section>
        )
    }

    // Empty state — hide section entirely
    if (!products || products.length === 0) {
        return null
    }

    return (
        <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto overflow-hidden">
            <Heading
                title={sectionTitle}
                barColor="bg-orange-500"
                viewAll={{ label: viewAllLabel, href: "/menu" }}
            />

            <Carousel opts={{ align: "start", loop: true }} className="w-full relative">
                <CarouselContent className="-ml-4 pb-8">
                    {(products as TrendingProduct[]).map((product) => (
                        <CarouselItem key={product._id} className="pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                            <MealCard
                                id={product._id}
                                title={product.name}
                                price={product.price / 100}
                                time={product.preparationTime ? `${product.preparationTime} mins` : "20-30 mins"}
                                image={product.images?.[0] ?? "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=400&auto=format&fit=crop"}
                            />
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <div className="flex justify-center md:justify-end gap-4 mt-8">
                    <CarouselPrevious className="static translate-y-0 h-12 w-12 rounded-full border border-zinc-200 dark:border-zinc-800 flex items-center justify-center hover:bg-[#0D5C3F] hover:text-white transition-all bg-white dark:bg-zinc-900 dark:text-zinc-100" />
                    <CarouselNext className="static translate-y-0 h-12 w-12 rounded-full border border-zinc-200 dark:border-zinc-800 flex items-center justify-center bg-[#0D5C3F] text-white hover:scale-105 transition-all" />
                </div>
            </Carousel>
        </section>
    )
}
