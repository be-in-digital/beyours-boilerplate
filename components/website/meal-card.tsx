"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Star, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCartStore, formatPrice } from "@be-in-digital/restaurant";
import { FavoriteButton } from "./favorite-button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface MealCardProps {
    id?: string | number;
    title: string;
    price: number;
    rating: number;
    time: string;
    image: string;
    category?: string;
    isVeg?: boolean;
    isSpicy?: boolean;
    className?: string;
}

export function MealCard({
    id,
    title,
    price,
    rating,
    time,
    image,
    category,
    isVeg,
    isSpicy,
    className,
}: MealCardProps) {
    const { addItem } = useCartStore();

    const handleAddToCart = (e: React.MouseEvent) => {
        e.stopPropagation();
        addItem({
            productId: String(id ?? `__fallback_${title}_${price}`),
            name: title,
            price: Math.round(price * 100),
            quantity: 1,
            options: [],
            imageUrl: image,
        });
        toast.success(`${title} ajouté au panier !`, {
            description: "1 article ajouté.",
            duration: 2000,
        });
    };

    const resolvedImage = (() => {
        if (typeof image === "string" && image.trim() !== "") {
            if (image.startsWith("/api/storage/")) {
                const convexUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL ?? "";
                const storageId = image.split("/").pop();
                return `${convexUrl}/get-image?storageId=${storageId}`;
            }
            return image;
        }
        if (image && typeof image === "object" && (image as unknown as { url: string }).url) {
            return (image as unknown as { url: string }).url;
        }
        // Not "/imagery/hero-burger-v2.png": that file does not exist, so every
        // product without a photo asked the image optimizer for it and got a
        // 400. The wrapper below is already a neutral tile.
        return null;
    })();

    return (
        <motion.div
            whileHover={{ y: -10 }}
            className={cn(
                "bg-white dark:bg-zinc-900 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/[0.04] border border-white/10 dark:border-zinc-800 hover:border-emerald-100 dark:hover:border-emerald-900/50 transition-all group flex flex-col h-full cursor-pointer",
                className
            )}
        >
            <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                {resolvedImage && (
                    <Image
                        src={resolvedImage}
                        alt={title || "Meal Image"}
                        fill
                        className="object-cover group-hover:scale-110 transition-all duration-700"
                    />
                )}
                <div className="absolute top-4 left-4 flex gap-2">
                    {rating >= 4.8 ? (
                        <Badge className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md text-zinc-800 dark:text-zinc-100 border-none py-1.5 px-3 rounded-lg font-bold uppercase text-[9px] shadow-sm">Trending</Badge>
                    ) : isVeg ? (
                        <Badge className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md text-zinc-800 dark:text-zinc-100 border-none py-1.5 px-3 rounded-lg font-bold uppercase text-[9px] shadow-sm">Veg</Badge>
                    ) : isSpicy ? (
                        <Badge className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md text-zinc-800 dark:text-zinc-100 border-none py-1.5 px-3 rounded-lg font-bold uppercase text-[9px] shadow-sm">Spicy</Badge>
                    ) : null}
                </div>
                <div className="absolute top-4 right-4 z-10">
                    <FavoriteButton itemId={id ?? `__fallback_${title}_${price}`} itemTitle={title} />
                </div>
            </div>
            <div className="p-8 flex flex-col flex-1">
                <h3 className="text-lg font-black tracking-tighter text-zinc-800 dark:text-zinc-100 leading-tight mb-3 group-hover:text-emerald-700 dark:group-hover:text-emerald-500 transition-colors uppercase">
                    {title}
                </h3>
                <div className="flex items-center gap-4 mb-6">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 rounded-lg text-[10px] font-black">
                        <Star className="h-3 w-3 fill-current" />
                        {rating}
                    </div>
                </div>

                <div className="mt-auto flex items-center justify-between gap-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none mb-1">Price</span>
                        <span className="text-xl font-black text-[#0D5C3F] dark:text-emerald-400 leading-none">{formatPrice(Math.round(price * 100))}</span>
                    </div>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                onClick={handleAddToCart}
                                className="h-12 w-12 rounded-2xl bg-[#0D5C3F] text-white hover:bg-orange-500 shadow-lg shadow-emerald-900/10 hover:scale-110 transition-all p-0 border-none"
                            >
                                <Plus className="h-6 w-6" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#0D5C3F] text-white border-none font-bold uppercase text-[10px] tracking-widest px-4 py-2 rounded-xl">
                            Ajouter au panier
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>
        </motion.div>
    );
}
