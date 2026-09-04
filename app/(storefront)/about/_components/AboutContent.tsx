"use client"

import React from "react"
import Link from "next/link"
import Image from "next/image"
import {
    ArrowRight,
    Leaf,
    Heart,
    Flame,
    Users,
    Clock,
    Award,
    MapPin,
} from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCmsPage } from "@/lib/cms/useCmsPage"
import { parseColoredText } from "@/lib/parse-colored-text"
import { CmsRichText } from "@/components/storefront"

const VALUE_ICONS = [Leaf, Heart, Flame]
const VALUE_COLORS = [
    "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400",
    "bg-orange-100 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400",
    "bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400",
]

const STAT_ICONS = [Users, Clock, Award, MapPin]

export default function AboutPage() {
    const { block } = useCmsPage("about")

    const hero = block("hero")
    const story = block("story")
    const values = block("values")
    const stats = block("stats")
    const cta = block("cta")

    // Hero
    const heroBadge = hero.field("badge").text ?? "Notre Histoire"
    const heroTitle = hero.field("title").text ?? "Une passion pour la {cuisine}"
    const heroSubtitle = hero.field("subtitle").text ?? "Depuis notre ouverture, nous nous engageons à offrir une expérience culinaire exceptionnelle avec des ingrédients frais et locaux."

    // Story
    const storyBadge = story.field("badge").text ?? "Qui sommes-nous ?"
    const storyTitle = story.field("title").text ?? "De la passion à {l'assiette}"
    const storyDesc = story.field("description").text ?? "Notre aventure a commencé avec une idée simple : proposer une cuisine authentique, préparée avec des produits frais et de saison. Chaque plat raconte une histoire, celle de nos producteurs locaux, de notre équipe passionnée et de notre engagement envers la qualité.\n\nAujourd'hui, nous continuons de perpétuer cette tradition en alliant savoir-faire artisanal et innovation culinaire pour vous offrir le meilleur à chaque bouchée."
    const storyImage = story.field("image").mediaUrl ?? "https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=2070&auto=format&fit=crop"

    // Values
    const valuesBadge = values.field("badge").text ?? "Nos Valeurs"
    const valuesTitle = values.field("title").text ?? "Ce qui nous {anime}"

    const valueItems = [
        {
            image: values.field("value1Image").mediaUrl,
            title: values.field("value1Title").text ?? "Ingrédients Frais",
            desc: values.field("value1Description").text ?? "Nous sélectionnons chaque jour les meilleurs produits auprès de producteurs locaux pour garantir fraîcheur et qualité.",
        },
        {
            image: values.field("value2Image").mediaUrl,
            title: values.field("value2Title").text ?? "Fait avec Amour",
            desc: values.field("value2Description").text ?? "Chaque plat est préparé avec soin par notre équipe de chefs passionnés qui mettent tout leur cœur dans la cuisine.",
        },
        {
            image: values.field("value3Image").mediaUrl,
            title: values.field("value3Title").text ?? "Saveurs Authentiques",
            desc: values.field("value3Description").text ?? "Nos recettes respectent la tradition tout en apportant une touche de modernité pour surprendre vos papilles.",
        },
    ]

    // Stats
    const statItems = [
        {
            value: stats.field("stat1Value").text ?? "10K+",
            label: stats.field("stat1Label").text ?? "Clients satisfaits",
        },
        {
            value: stats.field("stat2Value").text ?? "15 min",
            label: stats.field("stat2Label").text ?? "Temps moyen de livraison",
        },
        {
            value: stats.field("stat3Value").text ?? "4.9/5",
            label: stats.field("stat3Label").text ?? "Note moyenne",
        },
        {
            value: stats.field("stat4Value").text ?? "3",
            label: stats.field("stat4Label").text ?? "Restaurants",
        },
    ]

    // CTA
    const ctaTitle = cta.field("title").text ?? "Prêt à {découvrir} nos saveurs ?"
    const ctaSubtitle = cta.field("subtitle").text ?? "Parcourez notre menu et laissez-vous tenter par nos créations culinaires."
    const ctaButton = cta.field("buttonText").text ?? "Voir le Menu"

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

            {/* ─── STORY ─── */}
            <section className="py-24 md:py-32 px-6 md:px-12 max-w-7xl mx-auto">
                <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
                    <motion.div
                        initial={{ opacity: 0, x: -40 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        viewport={{ once: true }}
                        className="flex-1 w-full"
                    >
                        <div className="relative rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white dark:border-zinc-800">
                            <Image
                                src={storyImage}
                                alt="Notre histoire"
                                width={700}
                                height={500}
                                className="object-cover aspect-[4/3] hover:scale-105 transition-transform duration-1000"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 40 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        viewport={{ once: true }}
                        className="flex-1"
                    >
                        <Badge className="bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 px-4 py-1.5 rounded-full mb-6 font-black tracking-widest uppercase text-[10px]">
                            {storyBadge}
                        </Badge>
                        <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-[0.9] mb-8 text-zinc-800 dark:text-zinc-100">
                            {parseColoredText(storyTitle, "text-orange-500 italic")}
                        </h2>
                        {/*
                          `story.description` is a CMS `richtext` field: the
                          admin editor stores `editor.getHTML()`. Rendered as a
                          plain React child it printed its own tags on screen —
                          a visitor read "<strong>". `whitespace-pre-line` stays
                          for the code fallback below, which is plain text with
                          blank lines rather than markup.
                        */}
                        <CmsRichText
                            html={storyDesc}
                            className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-line font-medium"
                        />
                    </motion.div>
                </div>
            </section>

            {/* ─── VALUES ─── */}
            <section className="py-24 px-6 md:px-12 bg-zinc-50 dark:bg-zinc-900/40 transition-colors duration-500">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <Badge className="bg-orange-100 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800 px-4 py-1.5 rounded-full mb-6 font-black tracking-widest uppercase text-[10px]">
                            {valuesBadge}
                        </Badge>
                        <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-[0.9] text-zinc-800 dark:text-zinc-100">
                            {parseColoredText(valuesTitle, "text-orange-500 italic")}
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {valueItems.map((item, i) => {
                            const Icon = VALUE_ICONS[i]!
                            return (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.6, delay: i * 0.15 }}
                                    viewport={{ once: true }}
                                    className="bg-white dark:bg-zinc-900 p-8 md:p-10 rounded-[2.5rem] shadow-xl shadow-black/[0.03] border border-zinc-100 dark:border-zinc-800 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 text-center group"
                                >
                                    <div className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform overflow-hidden ${VALUE_COLORS[i]}`}>
                                        {item.image ? (
                                            <img src={item.image} alt={item.title} className="w-full h-full object-contain p-2" />
                                        ) : (
                                            <Icon className="h-9 w-9" />
                                        )}
                                    </div>
                                    <h3 className="text-xl font-black tracking-tight mb-3 text-zinc-800 dark:text-zinc-100">
                                        {item.title}
                                    </h3>
                                    <p className="text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                                        {item.desc}
                                    </p>
                                </motion.div>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* ─── STATS ─── */}
            <section className="py-24 px-6 md:px-12">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-[#0D5C3F] rounded-[3rem] md:rounded-[4rem] p-10 md:p-16 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-full h-full pointer-events-none">
                            <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-emerald-400/10 rounded-full blur-[120px]" />
                            <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-orange-400/10 rounded-full blur-[100px]" />
                        </div>

                        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
                            {statItems.map((stat, i) => {
                                const Icon = STAT_ICONS[i]!
                                return (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.5, delay: i * 0.1 }}
                                        viewport={{ once: true }}
                                        className="text-center"
                                    >
                                        <div className="h-14 w-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center mx-auto mb-4">
                                            <Icon className="h-6 w-6 text-orange-400" />
                                        </div>
                                        <p className="text-3xl md:text-4xl font-black text-white tracking-tighter leading-none mb-2">
                                            {stat.value}
                                        </p>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-100/60">
                                            {stat.label}
                                        </p>
                                    </motion.div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── CTA ─── */}
            <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto mb-16">
                <div className="relative rounded-[4rem] bg-orange-500 p-12 md:p-24 overflow-hidden text-center">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-48 -mt-48" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-600/30 rounded-full blur-3xl -ml-32 -mb-32" />

                    <div className="relative z-10 max-w-3xl mx-auto">
                        <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-[0.9] mb-6 italic whitespace-pre-line">
                            {parseColoredText(ctaTitle, "text-[#0D5C3F] not-italic")}
                        </h2>
                        <p className="text-lg text-white/90 font-medium mb-10 max-w-xl mx-auto leading-relaxed">
                            {ctaSubtitle}
                        </p>
                        <Link href="/menu">
                            <Button className="h-16 px-10 rounded-2xl bg-[#0D5C3F] hover:bg-[#0A412D] text-white font-black uppercase tracking-widest text-xs shadow-2xl transition-all hover:scale-105 group">
                                {ctaButton}
                                <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-2 transition-transform" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    )
}
