"use client"

import { useState, useMemo, useCallback, useEffect, useRef, Suspense } from "react"
import Link from "next/link"
import Image from "next/image"
import { useSearchParams, useRouter } from "next/navigation"
import { Search, SlidersHorizontal, ChevronDown, ChevronRight, X, ArrowRight } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import {
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@be-in-digital/ui/components"
import {
  filterProducts,
  sortProducts,
  useCartStore,
  isProductAvailable,
} from "@be-in-digital/restaurant"
import type { ProductDoc, ProductSortBy } from "@be-in-digital/restaurant"
import type { Id } from "@/convex/_generated/dataModel"
import { useStoreId } from "@/lib/hooks/use-store-id"
import { useStoreStatus } from "@/lib/hooks/use-store-status"
import { formatArticleDate } from "@/lib/blog/presentation"
import { ProductGrid } from "@/components/storefront/product-grid"
import { ProductDetailClient } from "@/components/storefront/product-detail-client"
import { MenuPagination } from "@/components/storefront/menu-pagination"
import { toast } from "sonner"

const ITEMS_PER_PAGE = 12

function MenuContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { storeId } = useStoreId()
  const { isOpen } = useStoreStatus(storeId)

  const addItem = useCartStore((s) => s.addItem)
  const cartStoreId = useCartStore((s) => s.storeId)

  // URL state
  const categorySlug = searchParams.get("category")
  const searchQuery = searchParams.get("q") ?? ""
  const sortBy = (searchParams.get("sort") as ProductSortBy) ?? "popular"

  // Local state
  const [search, setSearch] = useState(searchQuery)
  const [selectedProduct, setSelectedProduct] = useState<ProductDoc | null>(null)
  const [filters, setFilters] = useState({ availableOnly: false })
  const [currentPage, setCurrentPage] = useState(1)

  // Queries
  const products = useQuery(
    api.products.list,
    storeId ? { storeId: storeId as Id<"stores"> } : "skip"
  )
  const categories = useQuery(
    api.categories.list,
    storeId ? { storeId: storeId as Id<"stores"> } : "skip"
  )
  // The teaser below used to render three hard-coded posts, each linking back
  // to /blog. These are the owner's three most recent published articles.
  const latestArticles = useQuery(
    api.blog.listPublishedArticles,
    storeId ? { storeId: storeId as Id<"stores">, limit: 3 } : "skip"
  )

  // Find active category ID from slug
  const activeCategoryId = useMemo(() => {
    if (!categorySlug || !categories) return undefined
    return categories.find((c: { slug: string; _id: string }) => c.slug === categorySlug)?._id
  }, [categorySlug, categories])

  // Filter & sort
  const filteredProducts = useMemo(() => {
    if (!products) return undefined
    const filtered = filterProducts(products, {
      categoryId: activeCategoryId,
      search: search || undefined,
      availableOnly: filters.availableOnly,
    })
    return sortProducts(filtered, sortBy)
  }, [products, activeCategoryId, search, sortBy, filters])

  // Reset page on filter/sort/category/search change
  const prevFilterKey = useRef(`${categorySlug}-${search}-${sortBy}-${filters.availableOnly}`)
  useEffect(() => {
    const key = `${categorySlug}-${search}-${sortBy}-${filters.availableOnly}`
    if (prevFilterKey.current !== key) {
      prevFilterKey.current = key
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset pagination on filter change
      setCurrentPage(1)
    }
  }, [categorySlug, search, sortBy, filters])

  // Pagination
  const totalPages = filteredProducts ? Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) : 0
  const paginatedProducts = useMemo(() => {
    if (!filteredProducts) return undefined
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredProducts, currentPage])

  // URL helpers
  const updateSearchParams = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      router.replace(`/menu?${params.toString()}`, { scroll: false })
    },
    [router, searchParams]
  )

  const handleCategorySelect = (slug: string | null) => {
    updateSearchParams("category", slug)
  }

  const handleSearchSubmit = () => {
    updateSearchParams("q", search || null)
  }

  const handleQuickAdd = (product: ProductDoc) => {
    if (!storeId) return
    if (cartStoreId && cartStoreId !== storeId) {
      toast.error("Vous avez des articles d'un autre restaurant.")
      return
    }
    if (!isProductAvailable(product)) return

    if (product.options && product.options.length > 0) {
      setSelectedProduct(product)
      return
    }

    addItem({
      productId: product._id,
      name: product.name,
      price: product.price,
      taxRate: product.taxRate,
      categoryId: product.categoryId,
      quantity: 1,
      options: [],
      imageUrl: product.images?.[0],
    })
    toast.success(`${product.name} ajouté à la Box`)
  }

  // Active category name
  const activeCategoryName = categorySlug
    ? categories?.find((c: { slug: string }) => c.slug === categorySlug)?.name ?? categorySlug
    : "Tout"

  const sortLabel = {
    popular: "Recommandé",
    name: "Nom A-Z",
    price: "Prix croissant",
  }[sortBy]

  return (
    <div className="min-h-screen bg-[#FDFCF6] text-zinc-900 font-sans overflow-x-hidden pt-20 transition-colors duration-500">
      {/* ─── HERO ─── */}
      <section className="pt-24 pb-20 px-6 md:px-12 bg-[#0D5C3F] relative overflow-hidden rounded-b-[4rem] md:rounded-b-[8rem]">
        {/* Decorative blurs */}
        <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-white/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-emerald-400/10 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-md px-4 py-1.5 rounded-full mb-8 font-black tracking-widest uppercase text-[10px] shadow-lg">
            Notre Carte
          </Badge>
          <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-none mb-8 italic">
            Découvrez Notre <br />
            <span className="text-orange-500 not-italic">Menu</span>
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto mb-12 font-medium">
            Explorez notre sélection de plats préparés avec soin
          </p>

          {/* Search bar */}
          <div className="max-w-3xl mx-auto relative group">
            <div className="bg-white rounded-[2rem] p-2 shadow-2xl flex items-center gap-2 border-4 border-white/10 group-focus-within:border-[#0D5C3F]/20 transition-all">
              <div className="pl-6 flex items-center justify-center">
                <Search className="h-6 w-6 text-zinc-400" />
              </div>
              <input
                type="text"
                placeholder="Rechercher un plat..."
                className="flex-1 h-14 bg-transparent border-none outline-none text-lg font-bold placeholder:text-zinc-300 text-zinc-900"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch("")
                    updateSearchParams("q", null)
                  }}
                  className="p-2 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
              <Button
                onClick={handleSearchSubmit}
                className="h-14 px-8 rounded-2xl bg-[#0D5C3F] hover:bg-[#0A412D] text-white font-black uppercase tracking-widest text-xs shadow-xl transition-all"
              >
                Rechercher
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CATEGORIES ─── */}
      <section className="py-12 max-w-7xl mx-auto uppercase px-6 md:px-12">
        <div className="flex items-center justify-start md:justify-center gap-4 mb-12 overflow-x-auto pb-8 pt-4 -mx-6 px-6 md:-mx-12 md:px-12 scrollbar-hide">
          <button
            onClick={() => handleCategorySelect(null)}
            className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all duration-300 border-2 shrink-0 h-14 ${
              !categorySlug
                ? "bg-[#0D5C3F] border-[#0D5C3F] text-white shadow-[0_10px_20px_-5px_rgba(13,92,63,0.25)]"
                : "bg-white border-zinc-100 text-zinc-400 hover:border-zinc-200 hover:bg-zinc-50"
            }`}
          >
            <span className="text-xl leading-none">✨</span>
            Tout
          </button>
          {(categories ?? []).map((cat: { _id: string; slug: string; name: string }) => (
            <button
              key={cat._id}
              onClick={() => handleCategorySelect(cat.slug)}
              className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all duration-300 border-2 shrink-0 h-14 ${
                categorySlug === cat.slug
                  ? "bg-[#0D5C3F] border-[#0D5C3F] text-white shadow-[0_10px_20px_-5px_rgba(13,92,63,0.25)]"
                  : "bg-white border-zinc-100 text-zinc-400 hover:border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* ─── SHOWING + FILTERS + SORT ─── */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-16 px-4 gap-6">
          <div>
            <h2 className="text-2xl font-black tracking-tighter text-zinc-800 uppercase">
              Affichage : <span className="text-emerald-500">{activeCategoryName}</span>
              <span className="ml-2 text-zinc-300">
                ({filteredProducts?.length ?? 0})
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Filter toggle */}
            <Button
              variant="outline"
              onClick={() => setFilters((prev) => ({ availableOnly: !prev.availableOnly }))}
              className={`h-12 rounded-xl border-zinc-100 bg-white font-bold text-zinc-600 gap-2 px-6 hover:bg-zinc-50 transition-all ${
                filters.availableOnly ? "border-[#0D5C3F] bg-emerald-50 text-[#0D5C3F]" : ""
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {filters.availableOnly ? "Disponible" : "Filtres"}
              {filters.availableOnly && (
                <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center bg-orange-500 rounded-full text-[10px] border-none">
                  1
                </Badge>
              )}
            </Button>

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-12 rounded-xl border-zinc-100 bg-white font-bold text-zinc-600 gap-2 px-6 hover:bg-zinc-50 transition-all"
                >
                  Trier par : <span className="text-[#0D5C3F] font-black">{sortLabel}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="rounded-2xl p-2 min-w-[200px] shadow-2xl border-zinc-100 bg-white">
                <DropdownMenuItem
                  onClick={() => updateSearchParams("sort", null)}
                  className="rounded-xl font-bold text-zinc-600 p-3 cursor-pointer hover:bg-zinc-50"
                >
                  Recommandé
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => updateSearchParams("sort", "name")}
                  className="rounded-xl font-bold text-zinc-600 p-3 cursor-pointer hover:bg-zinc-50"
                >
                  Nom A-Z
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => updateSearchParams("sort", "price")}
                  className="rounded-xl font-bold text-zinc-600 p-3 cursor-pointer hover:bg-zinc-50"
                >
                  Prix croissant
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ─── GRID ─── */}
        <div className="mb-8">
          <ProductGrid
            products={paginatedProducts}
            storeId={storeId}
            isStoreOpen={isOpen}
            onProductClick={setSelectedProduct}
            onAddToCart={handleQuickAdd}
          />
        </div>

        {/* ─── PAGINATION ─── */}
        <MenuPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </section>

      {/* ─── DELIVERY APPS SECTION ─── */}
      <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto mb-24">
        <div className="text-center mb-16">
          <Badge className="bg-orange-500/10 text-orange-600 border-orange-200 px-4 py-1.5 rounded-full mb-6 font-black tracking-widest uppercase text-[10px]">
            Livraison
          </Badge>
          <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-zinc-800 leading-tight">
            Commandez aussi sur{" "}
            <span className="text-orange-500 italic">vos apps</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <a
            href="https://www.ubereats.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative overflow-hidden rounded-[3rem] p-12 flex flex-col items-center text-center transition-all shadow-2xl shadow-emerald-900/10 bg-[#06C167] hover:-translate-y-2 duration-300"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 group-hover:scale-150 transition-transform duration-700" />
            <div className="h-24 w-full relative mb-8 flex items-center justify-center">
              <div className="text-white text-4xl font-black tracking-tighter uppercase italic">Uber Eats</div>
            </div>
            <h3 className="text-2xl font-black text-white mb-4">Livraison rapide</h3>
            <p className="text-white/80 font-medium mb-8 max-w-xs">
              Recevez vos plats préférés directement chez vous
            </p>
            <Button className="h-14 px-8 rounded-2xl bg-white border-none font-black uppercase tracking-widest text-xs shadow-xl group-hover:px-10 transition-all text-[#06C167]">
              Commander <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </a>

          <a
            href="https://www.deliveroo.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative overflow-hidden rounded-[3rem] p-12 flex flex-col items-center text-center transition-all shadow-2xl shadow-emerald-900/10 bg-[#00CCBC] hover:-translate-y-2 duration-300"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 group-hover:scale-150 transition-transform duration-700" />
            <div className="h-24 w-full relative mb-8 flex items-center justify-center">
              <div className="text-white text-4xl font-black tracking-tighter uppercase italic">Deliveroo</div>
            </div>
            <h3 className="text-2xl font-black text-white mb-4">À votre porte</h3>
            <p className="text-white/80 font-medium mb-8 max-w-xs">
              Commandez et faites-vous livrer en quelques minutes
            </p>
            <Button className="h-14 px-8 rounded-2xl bg-white border-none font-black uppercase tracking-widest text-xs shadow-xl group-hover:px-10 transition-all text-[#00CCBC]">
              Commander <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </a>
        </div>
      </section>

      {/* ─── CTA SECTION ─── */}
      <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto mb-24">
        <div className="relative rounded-[4rem] bg-orange-500 p-12 md:p-24 overflow-hidden text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-48 -mt-48" />
          <div className="relative z-10 max-w-2xl">
            <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-md px-4 py-1.5 rounded-full mb-6 font-black tracking-widest uppercase text-[10px]">
              Une question ?
            </Badge>
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-none mb-6 italic">
              Besoin d&apos;aide pour{" "}
              <span className="text-[#0D5C3F] not-italic">votre commande ?</span>
            </h2>
            <p className="text-lg text-white/90 font-medium">
              Notre équipe est disponible pour répondre à toutes vos questions
            </p>
          </div>
          <Link href="/contact">
            <Button className="relative z-10 h-20 px-12 rounded-[2rem] bg-[#0D5C3F] hover:bg-[#0A412D] text-white font-black uppercase tracking-widest text-sm shadow-2xl transition-all hover:scale-105 group">
              Contactez-nous
              <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-2 transition-transform" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ─── BLOG SECTION ─── */}
      {(latestArticles?.length ?? 0) > 0 && (
        <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto bg-white rounded-[5rem] shadow-sm mb-24 border border-zinc-100">
          <div className="flex items-end justify-between mb-16 px-8">
            <div>
              <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-zinc-800 leading-[0.9] mb-6 whitespace-pre-line">
                Consultez notre{"\n"}
                <span className="text-orange-500 italic">Blog</span>
              </h2>
              <div className="h-2 w-24 bg-emerald-800 rounded-full" />
            </div>
            <Link href="/blog">
              <Button variant="ghost" className="text-emerald-700 font-black uppercase tracking-widest text-[10px] items-center gap-2 hover:bg-emerald-50">
                Tout voir <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 px-8">
            {latestArticles?.map((post) => (
              <Link key={post._id} href={`/blog/${post.slug}`} className="group">
                <div className="bg-zinc-50 rounded-[2.5rem] overflow-hidden shadow-lg shadow-black/[0.03] border border-zinc-100 hover:shadow-xl transition-all h-full flex flex-col">
                  <div className="relative aspect-[16/10] overflow-hidden bg-zinc-100">
                    {post.coverImage?.url && (
                      <Image
                        src={post.coverImage.url}
                        alt={post.coverImage.alt ?? post.title}
                        fill
                        className="object-cover group-hover:scale-110 transition-all duration-700"
                      />
                    )}
                    <div className="absolute top-4 left-4 bg-white px-4 py-2 rounded-2xl shadow-lg border border-zinc-100">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#0D5C3F]">
                        {formatArticleDate(post.publishedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="p-8 flex-1 flex flex-col">
                    <h3 className="text-xl font-black tracking-tighter text-zinc-800 leading-tight group-hover:text-[#0D5C3F] transition-colors">
                      {post.title}
                    </h3>
                    <div className="mt-auto pt-6 flex items-center text-[10px] font-black uppercase tracking-widest text-orange-500 group-hover:gap-3 gap-2 transition-all">
                      Lire la suite <ArrowRight className="h-3 w-3" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ─── PRODUCT DETAIL DIALOG ─── */}
      <Dialog
        open={!!selectedProduct}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
      >
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-0 border-none rounded-[3rem]">
          <DialogTitle className="sr-only">Détail du produit</DialogTitle>
          {selectedProduct && storeId && (
            <ProductDetailClient
              product={selectedProduct}
              storeId={storeId}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function MenuPage() {
  return (
    <Suspense>
      <MenuContent />
    </Suspense>
  )
}
