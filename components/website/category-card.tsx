"use client";

import React from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CategoryCardProps {
    title: string;
    icon: string;
    itemsCount?: number;
    countText?: string;
    color: string;
    borderColor: string;
    isImageUrl?: boolean;
}

export function CategoryCard({
    title,
    icon,
    itemsCount,
    countText,
    color,
    borderColor,
    isImageUrl
}: CategoryCardProps) {
    const displayCount = itemsCount !== undefined ? `${itemsCount} ${countText || "Items"}` : countText || "0 Items";

    const handleClick = () => {
        toast.info(`Exploring ${title}...`, {
            description: `Showing all ${displayCount} available in this category.`,
        });
    };

    return (
        <motion.div
            whileHover={{ y: -10 }}
            onClick={handleClick}
            className={cn(
                "relative p-8 rounded-[2.5rem] border bg-gradient-to-br transition-all duration-300 group cursor-pointer flex flex-col items-center justify-center gap-4 text-center h-full",
                color,
                borderColor,
                borderColor?.includes("-orange-") && "dark:border-orange-900/50",
                borderColor?.includes("-emerald-") && "dark:border-emerald-900/50",
                borderColor?.includes("-blue-") && "dark:border-blue-900/50",
                borderColor?.includes("-yellow-") && "dark:border-yellow-900/50",
                borderColor?.includes("-pink-") && "dark:border-pink-900/50",
                color?.includes("from-orange-") && "dark:from-orange-950/20 dark:to-orange-950/5",
                color?.includes("from-emerald-") && "dark:from-emerald-950/20 dark:to-emerald-950/5",
                color?.includes("from-blue-") && "dark:from-blue-950/20 dark:to-blue-950/5",
                color?.includes("from-yellow-") && "dark:from-yellow-950/20 dark:to-yellow-950/5",
                color?.includes("from-pink-") && "dark:from-pink-950/20 dark:to-pink-950/5"
            )}
        >
            <div className="h-24 w-24 rounded-3xl bg-transparent flex items-center justify-center text-4xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 overflow-hidden shrink-0">
                {(isImageUrl && icon && icon.length > 0) ? (
                    <img src={icon} alt={title} className="w-full h-full object-contain" />
                ) : (
                    icon || "🍽️"
                )}
            </div>
            <div>
                <h3 className="text-lg font-black tracking-tighter text-zinc-800 dark:text-zinc-100 mb-1">{title}</h3>
                <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                    {displayCount}
                </p>
            </div>

            <div className="absolute bottom-4 right-4 h-8 w-8 rounded-full bg-white dark:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center shadow-lg translate-y-2 group-hover:translate-y-0">
                <ChevronRight className="h-4 w-4 text-[#0D5C3F] dark:text-emerald-400" />
            </div>
        </motion.div>
    );
}
