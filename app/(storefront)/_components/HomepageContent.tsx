"use client"

import React from "react"
import Link from "next/link"
import Image from "next/image"
import {
    ShoppingBag,
    Clock,
    CreditCard,
    Leaf,
    Truck,
    Star,
    ArrowRight,
    ChevronRight,
    Play,
    Heart,
    Users,
    Quote,
} from "lucide-react"
import { motion } from "framer-motion"
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselPrevious,
    CarouselNext,
} from "@/components/ui/carousel"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
    Heading,
    MealCard,
    FeatureItem,
    BlogCard,
    TrendingSection,
    CategoriesSection,
} from "@/components/website"
import { useCmsPage } from "@/lib/cms/useCmsPage"
import { parseColoredText } from "@/lib/parse-colored-text"

// ─── Fallback data ──────────────────────────────────────────────────────────

const VEGETARIAN_MEALS = [
    { title: "Avocado Quinoa Bowl", price: 16.00, rating: 4.7, time: "15-25 mins", image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1780&auto=format&fit=crop", isVeg: true },
    { title: "Mediterranean Salad Pie", price: 18.00, rating: 4.8, time: "20-30 mins", image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=2070&auto=format&fit=crop", isVeg: true },
]


const TESTIMONIALS = [
    { authorName: "Emma L.", quote: "Enfin une plateforme de livraison qui se soucie de la qualité ! J'apprécie les options de repas sains et la rapidité de livraison. Hautement recommandé !", rating: 5, avatar: "https://i.pravatar.cc/150?u=emma" },
    { authorName: "Marc D.", quote: "Expérience utilisateur incroyable. La gestion des commandes est parfaite et la nourriture arrive chaude et fraîche à chaque fois.", rating: 5, avatar: "https://i.pravatar.cc/150?u=marc" },
    { authorName: "Sophie R.", quote: "J'adore la variété des options végétariennes. C'est si facile de trouver des repas sains qui ont vraiment bon goût sans passer des heures en cuisine.", rating: 5, avatar: "https://i.pravatar.cc/150?u=sophie" },
]

const BLOG_POSTS = [
    { date: "12 Mars", title: "Les secrets d'une bonne livraison", image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop" },
    { date: "8 Mars", title: "Manger équilibré sans effort", image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=800&auto=format&fit=crop" },
    { date: "2 Mars", title: "Nos producteurs locaux partenaires", image: "https://images.unsplash.com/photo-1466637574441-749b8f19452f?q=80&w=800&auto=format&fit=crop" },
]

// ─── Page ───────────────────────────────────────────────────────────────────

export default function LandingPage() {
    const { block } = useCmsPage("homepage")

    const hero = block("hero")
    const features = block("features")
    const trending = block("trendingMeals")
    const cats = block("categories")
    const veg = block("vegetarianMeals")
    const cta = block("cta")
    const testimonials = block("testimonials")
    const blog = block("blog")

    // Hero
    const heroBadge = hero.field("badge").text ?? "Restaurant Premium"
    const heroTitle = hero.field("title").text ?? "Bienvenue Chez {Nous}"
    const heroSubtitle = hero.field("subtitle").text ?? "Découvrez nos plats préparés avec passion et des ingrédients frais, livrés directement chez vous ou à emporter."
    // No fallback path here: `/imagery/hero-burger-v2.png` never existed —
    // `public/imagery/` does not exist either — so the placeholder was a 400
    // from the image optimizer on every homepage without a hero upload. An
    // absent image is drawn as the empty frame it is.
    const heroImage = hero.field("image").mediaUrl
    const heroCtaLabel = hero.field("ctaLabel").text ?? "Voir le Menu"
    const fb1Title = hero.field("floatingBadge1Title").text ?? "Top Rated"
    const fb1Subtitle = hero.field("floatingBadge1Subtitle").text ?? "Gourmet Choice"
    const fb2Title = hero.field("floatingBadge2Title").text ?? "Livraison rapide"
    const fb2Subtitle = hero.field("floatingBadge2Subtitle").text ?? "15-30 Mins"

    // Features
    const feat1 = features.field("feature1Label").text ?? "Fast & Reliable Delivery"
    const feat1Img = features.field("feature1Image").mediaUrl
    const feat2 = features.field("feature2Label").text ?? "Secure Payments"
    const feat2Img = features.field("feature2Image").mediaUrl
    const feat3 = features.field("feature3Label").text ?? "Healthy & Fresh Ingredients"
    const feat3Img = features.field("feature3Image").mediaUrl
    const feat4 = features.field("feature4Label").text ?? "Click & Collect"
    const feat4Img = features.field("feature4Image").mediaUrl
    const feat5 = features.field("feature5Label").text ?? "Top Quality"
    const feat5Img = features.field("feature5Image").mediaUrl

    // Trending
    const trendingTitle = trending.field("sectionTitle").text ?? "Explore Top Restaurants & Trending Meals"
    const trendingViewAll = trending.field("viewAllLabel").text ?? "Tout voir"

    // Categories
    const catsBadge = cats.field("badge").text ?? "Taste the menu"
    const catsTitle = cats.field("sectionTitle").text ?? "Best Categories We Have"
    const catsDesc = cats.field("description").text ?? "Explore our wide variety of culinary categories, from juicy burgers to fresh healthy salads."

    // Vegetarian
    const vegBadge = veg.field("badge").text ?? "Pure Healthy"
    const vegTitle = veg.field("sectionTitle").text ?? "Great for vegetarians"
    const vegDesc = veg.field("description").text ?? "Delicious plant-based options that don't compromise on flavor."
    const vegViewAll = veg.field("viewAllLabel").text ?? "Tout voir"

    // CTA
    const ctaBadge = cta.field("badge").text ?? "Limited Time Offer"
    const ctaTitle = cta.field("title").text ?? "Prêt à {commander} ?"
    const ctaSubtitle = cta.field("subtitle").text ?? "Découvrez notre menu complet et commandez vos plats préférés en quelques clics."
    const ctaButtonText = cta.field("buttonText").text ?? "Explorer le Menu"
    const ctaBgImage = cta.field("backgroundImage").mediaUrl ?? "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070&auto=format&fit=crop"

    // Testimonials
    const testBadge = testimonials.field("badge").text ?? "Success Stories"
    const testTitle = testimonials.field("sectionTitle").text ?? "What our {beloved} \n clients say."

    // Blog
    const blogTitle = blog.field("sectionTitle").text ?? "Consultez notre \n {Blog}"
    const blogViewAll = blog.field("viewAllLabel").text ?? "Tout voir"

    return (
        <div className="min-h-screen bg-[#FDFCF6] dark:bg-zinc-950 text-[#1A1A1A] dark:text-zinc-100 font-sans overflow-x-hidden transition-colors duration-500">
            {/* ─── HERO ─── */}
            <section className="relative pt-24 pb-20 md:pt-32 md:pb-32 px-6 md:px-12 overflow-hidden bg-[#0D5C3F] rounded-b-none md:rounded-b-[6rem]">
                <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
                    <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-white/20 rounded-full blur-[100px]" />
                    <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-emerald-400/10 rounded-full blur-[120px]" />
                </div>

                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="flex-1 text-center md:text-left"
                    >
                        <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-md px-4 py-1.5 rounded-full mb-6 font-black tracking-widest uppercase text-[10px] shadow-lg">
                            {heroBadge}
                        </Badge>
                        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-[0.9] tracking-tighter mb-8 drop-shadow-2xl whitespace-pre-line">
                            {parseColoredText(heroTitle, "text-orange-500 italic")}
                        </h1>
                        <p className="text-lg md:text-xl text-white/90 mb-10 max-w-lg leading-relaxed font-black drop-shadow-md">
                            {heroSubtitle}
                        </p>
                        <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                            <Button
                                asChild
                                className="h-16 w-full sm:w-auto px-10 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-orange-500/20 group transition-all duration-300"
                            >
                                <Link href="/menu">
                                    {heroCtaLabel}
                                    <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </Button>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                        className="flex-1 relative w-full mt-24 md:mt-0"
                    >
                        <div className="relative w-full aspect-square max-w-xl mx-auto">
                            {heroImage && (
                                <Image
                                    src={heroImage}
                                    alt="Hero"
                                    fill
                                    className="object-contain drop-shadow-[0_45px_45px_rgba(0,0,0,0.6)] z-20 scale-125"
                                    priority
                                />
                            )}

                            {/* Floating badge 1 */}
                            <motion.div
                                animate={{ y: [0, -20, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute top-10 -left-10 z-30 bg-white/20 backdrop-blur-md p-4 rounded-3xl border border-white/20 shadow-2xl"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-500 rounded-full">
                                        <Star className="h-4 w-4 text-white fill-current" />
                                    </div>
                                    <div className="text-white text-left">
                                        <p className="text-[10px] font-black uppercase tracking-tighter opacity-70 leading-none mb-1">
                                            {fb1Title}
                                        </p>
                                        <p className="text-sm font-black leading-none tracking-tight">
                                            {fb1Subtitle}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Floating badge 2 */}
                            <motion.div
                                animate={{ y: [0, 20, 0] }}
                                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                                className="absolute bottom-1/4 -right-10 z-30 bg-white/20 backdrop-blur-md p-4 rounded-3xl border border-white/20 shadow-2xl"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500 rounded-full">
                                        <Clock className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="text-white text-left">
                                        <p className="text-[10px] font-black uppercase tracking-tighter opacity-70 leading-none mb-1">
                                            {fb2Title}
                                        </p>
                                        <p className="text-sm font-black leading-none tracking-tight">
                                            {fb2Subtitle}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ─── FEATURES STRIP ─── */}
            <section className="py-12 px-6 md:px-12 max-w-7xl mx-auto -mt-16 relative z-30">
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                    <FeatureItem icon={feat1Img ?? Truck} label={feat1} color="bg-orange-100 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400" isImageUrl={!!feat1Img} />
                    <FeatureItem icon={feat2Img ?? CreditCard} label={feat2} color="bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400" isImageUrl={!!feat2Img} />
                    <FeatureItem icon={feat3Img ?? Leaf} label={feat3} color="bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400" isImageUrl={!!feat3Img} />
                    <FeatureItem icon={feat4Img ?? ShoppingBag} label={feat4} color="bg-purple-100 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400" isImageUrl={!!feat4Img} />
                    <FeatureItem icon={feat5Img ?? Star} label={feat5} color="bg-orange-100 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400" isImageUrl={!!feat5Img} />
                </div>
            </section>

            {/* ─── TRENDING SECTION ─── */}
            <TrendingSection
                sectionTitle={trendingTitle}
                viewAllLabel={trendingViewAll}
            />

            {/* ─── CATEGORIES ─── */}
            <CategoriesSection
                badge={catsBadge}
                sectionTitle={catsTitle}
                description={catsDesc}
            />

            {/* ─── VEGETARIAN ─── */}
            <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto bg-emerald-50/50 dark:bg-emerald-950/10 rounded-[4rem] overflow-hidden transition-colors duration-500">
                <Heading
                    badge={vegBadge}
                    badgeColor="bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                    title={vegTitle}
                    description={vegDesc}
                    viewAll={{ label: vegViewAll, href: "/menu" }}
                />

                <Carousel opts={{ align: "start", loop: true }} className="w-full relative">
                    <CarouselContent className="-ml-4 pb-8">
                        {VEGETARIAN_MEALS.map((meal, index) => (
                            <CarouselItem key={index} className="pl-4 basis-full sm:basis-1/2 lg:basis-1/4">
                                <MealCard
                                    title={meal.title}
                                    price={meal.price}
                                    rating={meal.rating}
                                    time={meal.time}
                                    image={meal.image}
                                    isVeg={meal.isVeg}
                                />
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    <div className="flex justify-center md:justify-end gap-4 mt-8">
                        <CarouselPrevious className="static translate-y-0 h-12 w-12 rounded-full border border-zinc-200 dark:border-zinc-800 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all bg-white dark:bg-zinc-900 dark:text-zinc-100" />
                        <CarouselNext className="static translate-y-0 h-12 w-12 rounded-full border border-zinc-200 dark:border-zinc-800 flex items-center justify-center bg-emerald-600 text-white hover:scale-105 transition-all" />
                    </div>
                </Carousel>
            </section>

            {/* ─── CTA / PROMO BANNER ─── */}
            <section className="py-12 md:py-32 px-0 md:px-6 relative overflow-hidden">
                <div className="max-w-7xl mx-auto bg-[#0A3D2E] rounded-none md:rounded-[6rem] overflow-hidden relative p-12 md:p-16 lg:p-24 shadow-3xl shadow-emerald-950/40">
                    <div className="absolute top-0 right-0 w-full h-full pointer-events-none">
                        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-400/10 rounded-full blur-[120px]" />
                        <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-orange-400/10 rounded-full blur-[100px]" />
                    </div>

                    <div className="relative z-10">
                        <div className="text-center mb-16 lg:mb-24">
                            <Badge className="bg-orange-500 text-white mb-8 px-4 py-1.5 rounded-full border-none font-black uppercase text-[10px] tracking-widest shadow-lg shadow-orange-500/20">
                                {ctaBadge}
                            </Badge>
                            <h2 className="text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-black text-white leading-[0.9] tracking-tighter italic whitespace-pre-line">
                                {parseColoredText(ctaTitle, "text-orange-500 not-italic")}
                            </h2>
                        </div>

                        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
                            <div className="flex-1 text-center lg:text-left w-full">
                                <p className="text-emerald-50/70 text-lg md:text-xl font-medium mb-12 max-w-xl leading-relaxed mx-auto lg:mx-0">
                                    {ctaSubtitle}
                                </p>

                                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-8 mb-12">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                                            <Truck className="h-5 w-5 text-orange-400" />
                                        </div>
                                        <span className="text-white font-bold text-sm">Livraison Gratuite</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                                            <Star className="h-5 w-5 text-orange-400" />
                                        </div>
                                        <span className="text-white font-bold text-sm">4.9/5 Rating</span>
                                    </div>
                                </div>

                                <Link href="/menu">
                                    <Button className="h-18 w-full md:w-auto px-12 rounded-2xl bg-white text-[#0D5C3F] hover:bg-zinc-100 font-black uppercase tracking-widest text-sm shadow-2xl transition-all hover:scale-105 group">
                                        {ctaButtonText}
                                        <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-2 transition-transform" />
                                    </Button>
                                </Link>
                            </div>

                            <div className="flex-1 w-full relative mt-16 md:mt-0">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.8 }}
                                    className="relative aspect-video lg:aspect-[4/3] rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white/5 group"
                                >
                                    <Image
                                        src={ctaBgImage}
                                        alt="Healthy Gourmet Food"
                                        fill
                                        className="object-cover group-hover:scale-110 transition-all duration-1000"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A3D2E]/80 via-transparent to-transparent" />

                                    <button className="absolute inset-0 m-auto h-24 w-24 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center text-white border border-white/30 hover:bg-white hover:text-[#0D5C3F] transition-all shadow-2xl group/play">
                                        <Play className="h-10 w-10 fill-current translate-x-1 group-hover/play:scale-110 transition-transform" />
                                        <div className="absolute inset-0 rounded-full bg-white animate-ping opacity-20 group-hover:opacity-0" />
                                    </button>

                                    <div className="absolute bottom-8 left-8 right-8 p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-white font-black text-sm uppercase tracking-wider mb-1">Watch our story</p>
                                                <p className="text-emerald-50/60 text-xs font-bold">2:45 Mins • Quality First</p>
                                            </div>
                                            <div className="h-10 w-10 rounded-full bg-orange-500 flex items-center justify-center shadow-lg">
                                                <Play className="h-4 w-4 text-white fill-current translate-x-0.5" />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── TESTIMONIALS ─── */}
            <section className="py-32 px-6 relative overflow-hidden bg-zinc-50 dark:bg-zinc-950/50 transition-colors duration-500">
                <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-orange-100/30 dark:bg-orange-950/10 rounded-full blur-[120px] pointer-events-none" />

                <div className="max-w-7xl mx-auto">
                    <div className="mb-20 lg:mb-32">
                        <Heading
                            align="center"
                            badge={testBadge}
                            title={testTitle}
                            textColor="text-zinc-800 dark:text-zinc-100"
                        />
                    </div>

                    <div className="flex flex-col lg:flex-row items-center gap-20">
                        <div className="flex-1 relative w-full mb-12 lg:mb-0">
                            <div className="relative z-10 rounded-[3rem] overflow-hidden shadow-2xl border-[12px] border-white">
                                <Image
                                    src="https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=2070&auto=format&fit=crop"
                                    alt="Happy Chef"
                                    width={600}
                                    height={700}
                                    className="object-cover aspect-[4/5] hover:scale-105 transition-transform duration-1000"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                                <motion.div
                                    initial={{ x: -20, opacity: 0 }}
                                    whileInView={{ x: 0, opacity: 1 }}
                                    className="absolute top-12 -left-8 bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-xl border border-zinc-100 dark:border-zinc-800 hidden md:block"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                                            <Heart className="h-6 w-6 fill-current" />
                                        </div>
                                        <div>
                                            <p className="font-black text-xl leading-none">4.9/5</p>
                                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1 text-nowrap">Average Rating</p>
                                        </div>
                                    </div>
                                </motion.div>

                                <motion.div
                                    initial={{ x: 20, opacity: 0 }}
                                    whileInView={{ x: 0, opacity: 1 }}
                                    className="absolute bottom-12 -right-8 bg-[#0D5C3F] p-6 rounded-3xl shadow-xl border border-emerald-900 hidden md:block"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-white border border-white/20">
                                            <Users className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="font-black text-xl leading-none text-white">10K+</p>
                                            <p className="text-[10px] font-black text-emerald-100/50 uppercase tracking-widest mt-1 text-nowrap">Happy Customers</p>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[radial-gradient(#e5e7eb_2px,transparent_2px)] [background-size:20px_20px] opacity-100" />
                        </div>

                        <div className="flex-1 w-full max-w-xl">
                            <Carousel opts={{ align: "start", loop: true }} className="w-full relative">
                                <CarouselContent>
                                    {TESTIMONIALS.map((testimonial, index) => (
                                        <CarouselItem key={index}>
                                            <div className="space-y-8 py-4">
                                                <div className="relative">
                                                    <Quote className="h-20 w-20 text-emerald-500/10 absolute -top-10 -left-6 rotate-12" />
                                                    <p className="text-2xl md:text-3xl font-bold leading-relaxed tracking-tight text-zinc-700 dark:text-zinc-300 italic relative z-10">
                                                        &ldquo;{testimonial.quote}&rdquo;
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-5 pt-4">
                                                    <div className="h-16 w-16 rounded-2xl bg-orange-100 dark:bg-orange-950/30 overflow-hidden border-2 border-white dark:border-zinc-800 shadow-lg ring-4 ring-orange-100/30">
                                                        <Image
                                                            src={testimonial.avatar}
                                                            width={80}
                                                            height={80}
                                                            alt={testimonial.authorName}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-xl leading-none mb-1.5 text-zinc-900 dark:text-zinc-100">{testimonial.authorName}</p>
                                                        <div className="flex items-center gap-1 text-orange-400">
                                                            {Array.from({ length: 5 }).map((_, i) => (
                                                                <Star
                                                                    key={i}
                                                                    className={cn(
                                                                        "h-3 w-3 fill-current",
                                                                        i >= testimonial.rating && "text-zinc-200 fill-zinc-200"
                                                                    )}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </CarouselItem>
                                    ))}
                                </CarouselContent>
                                <div className="flex items-center gap-4 mt-16 lg:mt-24">
                                    <CarouselPrevious className="static translate-y-0 h-14 w-14 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-[#0D5C3F] hover:border-[#0D5C3F] hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all bg-white dark:bg-zinc-900 shadow-sm" />
                                    <CarouselNext className="static translate-y-0 h-14 w-14 rounded-2xl bg-[#0D5C3F] flex items-center justify-center text-white hover:bg-emerald-900 transition-all border-none shadow-xl shadow-emerald-950/20" />
                                </div>
                            </Carousel>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── BLOG ─── */}
            <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto bg-white dark:bg-zinc-900/40 rounded-[5rem] shadow-sm mb-24 border border-zinc-100 dark:border-zinc-800 transition-colors duration-500">
                <div className="flex items-end justify-between mb-16 px-8">
                    <div>
                        <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-zinc-800 dark:text-zinc-100 leading-[0.9] mb-6 whitespace-pre-line">
                            {parseColoredText(blogTitle, "text-orange-500 italic")}
                        </h2>
                        <div className="h-2 w-24 bg-emerald-800 rounded-full" />
                    </div>
                    <Link href="/blog">
                        <Button variant="ghost" className="text-emerald-700 font-black uppercase tracking-widest text-[10px] items-center gap-2 hover:bg-emerald-50">
                            {blogViewAll} <ChevronRight className="h-4 w-4" />
                        </Button>
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 px-8">
                    {BLOG_POSTS.map((post, index) => (
                        <Link key={index} href="/blog">
                            <BlogCard
                                date={post.date}
                                title={post.title}
                                image={post.image}
                            />
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    )
}
