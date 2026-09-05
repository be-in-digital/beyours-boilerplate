import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, Button } from "@be-in-digital/ui"

interface HeadingProps {
    badge?: string;
    title: React.ReactNode;
    description?: string;
    align?: "left" | "center";
    viewAll?: { label?: string, href: string };
    badgeColor?: string;
    barColor?: string;
    textColor?: string;
    className?: string;
}

export function Heading({
    badge,
    title,
    description,
    align = "left",
    viewAll,
    badgeColor = "bg-orange-100 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400",
    barColor,
    textColor = "text-zinc-800 dark:text-zinc-100",
    className
}: HeadingProps) {
    const isCenter = align === "center";

    return (
        <div className={cn(
            "flex flex-col md:flex-row items-center md:items-end justify-between mb-16 gap-8",
            isCenter && "flex-col md:flex-col items-center md:items-center text-center",
            className
        )}>
            <div className={cn(
                "flex flex-col",
                isCenter ? "items-center" : "items-center md:items-start text-center md:text-left"
            )}>
                {badge && (
                    <Badge className={cn("mb-6 px-4 py-1.5 rounded-lg border-none font-black uppercase text-[10px] tracking-widest", badgeColor)}>
                        {badge}
                    </Badge>
                )}
                <h2 className={cn(
                    "text-4xl md:text-6xl font-black tracking-tighter leading-[1.1] whitespace-pre-line",
                    textColor,
                    isCenter ? "mb-6" : "mb-4"
                )}>
                    {typeof title === "string" ? (
                        title.split(/(\{[\s\S]*?\})/g).map((part, i) => {
                            if (part.startsWith("{") && part.endsWith("}")) {
                                return (
                                    <span key={i} className="text-orange-500 italic">
                                        {part.slice(1, -1)}
                                    </span>
                                );
                            }
                            return part;
                        })
                    ) : (
                        title
                    )}
                </h2>
                {description && (
                    <p className={cn(
                        "text-zinc-500 dark:text-zinc-400 font-medium max-w-xl",
                        isCenter ? "text-lg md:text-xl" : "text-md"
                    )}>
                        {description}
                    </p>
                )}
                {barColor && !isCenter && (
                    <div className={cn("h-1.5 w-24 rounded-full mt-4 mx-auto md:mx-0", barColor)} />
                )}
            </div>

            {viewAll && (
                <Link href={viewAll.href}>
                    <Button variant="ghost" className={cn(
                        "font-black uppercase tracking-widest text-[10px] items-center gap-2",
                        (barColor?.includes("emerald") || barColor?.includes("#0D5C3F") || badgeColor.includes("emerald")) ? "text-emerald-600 hover:bg-emerald-50" : "text-orange-500 hover:bg-orange-50"
                    )}>
                        {viewAll.label || "View All"} <ChevronRight className="h-4 w-4" />
                    </Button>
                </Link>
            )}
        </div>
    );
}
