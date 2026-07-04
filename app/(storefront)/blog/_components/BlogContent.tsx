"use client"

import React, { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, BookOpen } from "lucide-react"
import { motion } from "framer-motion"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCmsPage } from "@/lib/cms/useCmsPage"
import { parseColoredText } from "@/lib/parse-colored-text"
import { useStoreId } from "@/lib/hooks/use-store-id"
import type { Id } from "@/convex/_generated/dataModel"
import { toast } from "sonner"

const BLOG_POSTS = [
    {
        slug: "secrets-bonne-livraison",
        date: "12 Mars 2026",
        category: "Livraison",
        title: "Les secrets d'une bonne livraison",
        excerpt: "Découvrez comment nous garantissons que vos plats arrivent chauds et frais, comme s'ils sortaient de la cuisine.",
        image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop",
        readTime: "5 min",
    },
    {
        slug: "manger-equilibre",
        date: "8 Mars 2026",
        category: "Nutrition",
        title: "Manger équilibré sans effort",
        excerpt: "Nos conseils pour maintenir une alimentation saine au quotidien, sans passer des heures en cuisine.",
        image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=800&auto=format&fit=crop",
        readTime: "4 min",
    },
    {
        slug: "producteurs-locaux",
        date: "2 Mars 2026",
        category: "Partenaires",
        title: "Nos producteurs locaux partenaires",
        excerpt: "Rencontrez les artisans et producteurs qui fournissent nos ingrédients frais et de qualité chaque jour.",
        image: "https://images.unsplash.com/photo-1466637574441-749b8f19452f?q=80&w=800&auto=format&fit=crop",
        readTime: "6 min",
    },
    {
        slug: "tendances-culinaires-2026",
        date: "25 Fév 2026",
        category: "Tendances",
        title: "Les tendances culinaires de 2026",
        excerpt: "Du plant-based au fermenté, découvrez les saveurs qui marqueront cette année.",
        image: "https://images.unsplash.com/photo-1606787366850-de6330128bfc?q=80&w=800&auto=format&fit=crop",
        readTime: "7 min",
    },
    {
        slug: "recette-bowl-quinoa",
        date: "18 Fév 2026",
        category: "Recettes",
        title: "Recette : Bowl Quinoa Avocat",
        excerpt: "Apprenez à reproduire chez vous notre bowl signature, étape par étape avec des ingrédients simples.",
        image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop",
        readTime: "3 min",
    },
    {
        slug: "coulisses-cuisine",
        date: "10 Fév 2026",
        category: "En coulisses",
        title: "Dans les coulisses de notre cuisine",
        excerpt: "Plongez dans le quotidien de notre équipe et découvrez les étapes de préparation de vos plats favoris.",
        image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=800&auto=format&fit=crop",
        readTime: "5 min",
    },
]

const CATEGORY_COLORS: Record<string, string> = {
    Livraison: "bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    Nutrition: "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    Partenaires: "bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800",
    Tendances: "bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800",
    Recettes: "bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800",
    "En coulisses": "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
}

export default function BlogPage() {
    const { block } = useCmsPage("blog")
    const { storeId } = useStoreId()
    const subscribe = useMutation(api.emailSubscribers.subscribe)
    const [newsletterEmail, setNewsletterEmail] = useState("")
    const [subscribing, setSubscribing] = useState(false)

    const hero = block("hero")

    const heroBadge = hero.field("badge").text ?? "Notre Blog"
    const heroTitle = hero.field("title").text ?? "Saveurs, conseils \n& {inspirations}"
    const heroSubtitle = hero.field("subtitle").text ?? "Restez informé des dernières nouvelles, recettes et conseils de notre équipe culinaire."

    const featured = BLOG_POSTS[0]!
    const posts = BLOG_POSTS.slice(1)

    return (
        <div className="min-h-screen bg-[#FDFCF6] dark:bg-zinc-950 text-[#1A1A1A] dark:text-zinc-100 font-sans overflow-x-hidden transition-colors duration-500">
            {/* ─── HERO ─── */}
            <section className="relative pt-24 pb-20 md:pt-32 md:pb-32 px-6 md:px-12 overflow-hidden bg-[#0D5C3F] rounded-b-none md:rounded-b-[6rem]">
                <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
                    <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-white/20 rounded-full blur-[100px]" />
                    <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-emerald-400/10 rounded-full blur-[120px]" />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="max-w-4xl mx-auto relative z-10 text-center"
                >
                    <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-md px-4 py-1.5 rounded-full mb-6 font-black tracking-widest uppercase text-[10px] shadow-lg">
                        {heroBadge}
                    </Badge>
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-[0.9] tracking-tighter mb-8 whitespace-pre-line">
                        {parseColoredText(heroTitle, "text-orange-500 italic")}
                    </h1>
                    <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed font-medium">
                        {heroSubtitle}
                    </p>
                </motion.div>
            </section>

            {/* ─── FEATURED POST ─── */}
            <section className="py-16 md:py-24 px-6 md:px-12 max-w-7xl mx-auto -mt-12 relative z-20">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                >
                    <Link href={`/blog/${featured.slug}`} className="group block">
                        <div className="bg-white dark:bg-zinc-900 rounded-[3rem] overflow-hidden shadow-2xl shadow-black/[0.06] border border-zinc-100 dark:border-zinc-800 hover:shadow-3xl transition-all duration-500">
                            <div className="flex flex-col lg:flex-row">
                                <div className="relative lg:w-3/5 aspect-[16/10] lg:aspect-auto overflow-hidden">
                                    <Image
                                        src={featured.image}
                                        alt={featured.title}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-1000"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent" />
                                    <div className="absolute top-6 left-6">
                                        <Badge className="bg-orange-500 text-white border-none px-4 py-1.5 rounded-full font-black tracking-widest uppercase text-[10px] shadow-lg">
                                            À la une
                                        </Badge>
                                    </div>
                                </div>
                                <div className="lg:w-2/5 p-8 md:p-12 flex flex-col justify-center">
                                    <Badge className={`w-fit mb-4 px-3 py-1 rounded-full font-black tracking-widest uppercase text-[9px] ${CATEGORY_COLORS[featured.category] ?? "bg-zinc-100 text-zinc-600"}`}>
                                        {featured.category}
                                    </Badge>
                                    <h2 className="text-3xl md:text-4xl font-black tracking-tighter leading-tight mb-4 text-zinc-800 dark:text-zinc-100 group-hover:text-[#0D5C3F] dark:group-hover:text-emerald-400 transition-colors">
                                        {featured.title}
                                    </h2>
                                    <p className="text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed mb-6">
                                        {featured.excerpt}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                                            {featured.date} · {featured.readTime} de lecture
                                        </span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-orange-500 flex items-center gap-2 group-hover:gap-3 transition-all">
                                            Lire <ArrowRight className="h-3 w-3" />
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Link>
                </motion.div>
            </section>

            {/* ─── POSTS GRID ─── */}
            <section className="pb-24 px-6 md:px-12 max-w-7xl mx-auto">
                <div className="flex items-center gap-3 mb-12">
                    <div className="h-10 w-10 rounded-xl bg-[#0D5C3F]/10 dark:bg-emerald-950/30 flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-[#0D5C3F] dark:text-emerald-400" />
                    </div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-zinc-800 dark:text-zinc-100">
                        Tous les articles
                    </h2>
                    <span className="text-sm font-bold text-zinc-400">({posts.length})</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {posts.map((post, i) => (
                        <motion.div
                            key={post.slug}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                            viewport={{ once: true }}
                        >
                            <Link href={`/blog/${post.slug}`} className="group block h-full">
                                <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] overflow-hidden shadow-lg shadow-black/[0.03] border border-zinc-100 dark:border-zinc-800 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
                                    <div className="relative aspect-[16/10] overflow-hidden">
                                        <Image
                                            src={post.image}
                                            alt={post.title}
                                            fill
                                            className="object-cover group-hover:scale-110 transition-all duration-700"
                                        />
                                        <div className="absolute top-4 left-4">
                                            <Badge className={`px-3 py-1 rounded-full font-black tracking-widest uppercase text-[9px] ${CATEGORY_COLORS[post.category] ?? "bg-zinc-100 text-zinc-600"}`}>
                                                {post.category}
                                            </Badge>
                                        </div>
                                        <div className="absolute top-4 right-4 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-xl shadow-lg border border-zinc-100 dark:border-zinc-800">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-[#0D5C3F] dark:text-emerald-400">{post.readTime}</p>
                                        </div>
                                    </div>
                                    <div className="p-6 md:p-8 flex-1 flex flex-col">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">
                                            {post.date}
                                        </p>
                                        <h3 className="text-xl font-black tracking-tighter text-zinc-800 dark:text-zinc-100 leading-tight mb-3 group-hover:text-[#0D5C3F] dark:group-hover:text-emerald-400 transition-colors">
                                            {post.title}
                                        </h3>
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed flex-1">
                                            {post.excerpt}
                                        </p>
                                        <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center text-[10px] font-black uppercase tracking-widest text-orange-500 group-hover:gap-3 gap-2 transition-all">
                                            Lire la suite <ArrowRight className="h-3 w-3" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ─── NEWSLETTER CTA ─── */}
            <section className="px-6 md:px-12 max-w-7xl mx-auto mb-24">
                <div className="bg-[#0D5C3F] rounded-[3rem] md:rounded-[4rem] p-10 md:p-16 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-full h-full pointer-events-none">
                        <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-emerald-400/10 rounded-full blur-[120px]" />
                    </div>
                    <div className="relative z-10 max-w-2xl mx-auto">
                        <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter leading-tight mb-4">
                            Ne manquez rien
                        </h2>
                        <p className="text-emerald-100/60 font-medium mb-8">
                            Inscrivez-vous à notre newsletter pour recevoir nos derniers articles et offres exclusives.
                        </p>
                        <form
                            onSubmit={async (e) => {
                                e.preventDefault()
                                if (!storeId || !newsletterEmail || subscribing) return
                                setSubscribing(true)
                                try {
                                    await subscribe({
                                        storeId: storeId as Id<"stores">,
                                        email: newsletterEmail,
                                    })
                                    toast.success("Inscription confirmée !", {
                                        description: "Vérifiez votre boîte mail pour confirmer votre inscription.",
                                    })
                                    setNewsletterEmail("")
                                } catch {
                                    toast.error("Cet email est déjà inscrit ou une erreur est survenue.")
                                } finally {
                                    setSubscribing(false)
                                }
                            }}
                            className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto"
                        >
                            <input
                                type="email"
                                required
                                value={newsletterEmail}
                                onChange={(e) => setNewsletterEmail(e.target.value)}
                                placeholder="Votre email..."
                                className="flex-1 h-14 px-6 rounded-2xl bg-white/10 border border-white/10 text-white placeholder:text-white/40 font-bold text-sm outline-none focus:border-white/30 transition-colors"
                            />
                            <Button
                                type="submit"
                                disabled={subscribing}
                                className="h-14 px-8 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-orange-500/20"
                            >
                                {subscribing ? "..." : "S'inscrire"}
                            </Button>
                        </form>
                    </div>
                </div>
            </section>
        </div>
    )
}
