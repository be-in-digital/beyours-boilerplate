"use client";

import React from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useFavoritesStore } from "@/lib/stores/favorites-store";
import { useStoreId } from "@/lib/hooks/use-store-id";
import { authClient } from "@/lib/auth-client";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface FavoriteButtonProps {
    itemId: string | number;
    itemTitle: string;
    className?: string;
}

export function FavoriteButton({ itemId, itemTitle, className }: FavoriteButtonProps) {
    const { data: session } = authClient.useSession();
    const { storeId } = useStoreId();
    const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
    const isFavorite = useFavoritesStore((s) => s.isFavorite);
    const productId = String(itemId);
    const isFav = storeId ? isFavorite(productId, storeId) : false;

    const handleToggleFavorite = (e: React.MouseEvent) => {
        e.stopPropagation();

        if (!session) {
            toast.error("Authentification requise", {
                description: "Veuillez vous connecter pour ajouter des favoris.",
                action: {
                    label: "Se connecter",
                    onClick: () => { window.location.href = "/sign-in"; },
                },
            });
            return;
        }

        if (!storeId) return;
        toggleFavorite(productId, storeId);

        if (!isFav) {
            toast.success(`${itemTitle} ajouté aux favoris !`, {
                icon: <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />,
            });
        }
    };

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    onClick={handleToggleFavorite}
                    className={cn(
                        "h-10 w-10 rounded-full backdrop-blur-md flex items-center justify-center transition-all shadow-sm border-2",
                        isFav
                            ? "bg-rose-500 border-rose-500 text-white"
                            : "bg-white/30 border-white/60 text-white hover:bg-white hover:text-rose-500",
                        className
                    )}
                >
                    <Heart className={cn("h-5 w-5", isFav && "fill-current")} />
                </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-[#0D5C3F] text-white border-none font-bold uppercase text-[10px] tracking-widest px-4 py-2 rounded-xl shadow-xl">
                {isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
            </TooltipContent>
        </Tooltip>
    );
}
