"use client"

import { useState, useEffect, useSyncExternalStore, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ShoppingBag, Menu, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@be-in-digital/ui"
import {
  useCartStore,
  useStorefrontStoreSelection,
  useTranslation,
} from "@be-in-digital/restaurant"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useCmsPage } from "@/lib/cms/useCmsPage"
import { CartSheet } from "./cart-sheet"
import { StoreSelectorDropdown } from "./store-selector-dropdown"
import { isSafeReservationUrl } from "@be-in-digital/convex-schema"
import { LanguageSelectorDropdown } from "./language-selector-dropdown"
import { UserMenu } from "./user-menu"

/**
 * The five nav entries, by translation key.
 *
 * The labels were a module-level constant of French literals, which is a
 * shape that cannot follow a language switch — the array is built once at
 * import time, before any locale exists. The hrefs stay constant; only the
 * label is resolved per render.
 */
const NAV_LINKS = [
  { href: "/", labelKey: "nav.home" },
  { href: "/menu", labelKey: "nav.menu" },
  { href: "/about", labelKey: "nav.about" },
  { href: "/blog", labelKey: "nav.blog" },
  { href: "/contact", labelKey: "nav.contact" },
]

/**
 * The establishment's booking link, when it has set one.
 *
 * There is no reservation feature to route to: an establishment that takes
 * bookings runs TheFork or Zenchef, and `stores.reservationUrl` points at it.
 * Null when unset, which is most of them — a « Réserver » button that opens
 * nothing is worse than no button, and that is exactly what the sales demos
 * used to show.
 *
 * The scheme is re-checked here rather than trusted: `assertReservationUrl`
 * guards the write, but a row older than that guard, or restored from a
 * backup, still reaches this href.
 */
function useReservationUrl(): string | null {
  const stores = useQuery(api.stores.list)
  const storeId = useStorefrontStoreSelection((s) => s.storeId)
  if (!stores || stores.length === 0) return null
  const store = stores.find((s: { _id: string }) => s._id === storeId) ?? stores[0]
  const url = (store as { reservationUrl?: string } | undefined)?.reservationUrl
  return isSafeReservationUrl(url) ? url : null
}

export function StorefrontHeader({ hasBanner = false }: { hasBanner?: boolean }) {
  const pathname = usePathname()
  const { t } = useTranslation()
  const navLinks = NAV_LINKS.map((link) => ({
    href: link.href,
    label: t(link.labelKey),
  }))
  const itemCount = useCartStore((s) => s.getItemCount())
  const reservationUrl = useReservationUrl()
  const cms = useCmsPage("storefront-layout")
  const logoUrl = cms.block("branding").field("logo").mediaUrl
  const brandName = cms.block("branding").field("brandName").text ?? "BeYours"

  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const hasMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  const isHomePage = pathname === "/"

  // On non-home pages, always show the scrolled/solid variant
  const showTransparent = isHomePage && !isScrolled

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Close mobile menu on route change
  const prevPathname = useRef(pathname)
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname
      // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate side effect on route change
      setIsMobileMenuOpen(false)
    }
  }, [pathname])

  return (
    <>
      <header
        className={`fixed left-0 right-0 z-40 transition-all duration-300 ${
          hasBanner ? "top-[40px]" : "top-0"
        } ${
          showTransparent
            ? "bg-transparent border-transparent"
            : "bg-white/90 backdrop-blur-md shadow-sm border-b border-border"
        }`}
      >
        <div className="flex items-center justify-between px-6 md:px-12 py-4">
          {/* Logo */}
          <Link
            href="/"
            className={`font-black text-xl tracking-tighter transition-colors duration-300 ${
              showTransparent ? "text-white" : "text-accent-foreground"
            }`}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={brandName}
                className="h-8 w-auto object-contain"
              />
            ) : (
              brandName
            )}
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => {
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative font-black text-sm uppercase tracking-widest transition-colors duration-300 ${
                    showTransparent
                      ? "text-white hover:text-white/80"
                      : isActive
                        ? "text-accent-foreground"
                        : "text-muted-foreground hover:text-accent-foreground"
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span
                      className={`absolute -bottom-1 left-0 right-0 h-0.5 rounded-full ${
                        showTransparent ? "bg-white" : "bg-accent-solid"
                      }`}
                    />
                  )}
                </Link>
              )
            })}

            {/* External on purpose: this leaves for the establishment's own
                booking tool. Rendered only when one is configured. */}
            {reservationUrl && (
              <a
                href={reservationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`font-black text-sm uppercase tracking-widest transition-colors duration-300 ${
                  showTransparent
                    ? "text-white hover:text-white/80"
                    : "text-muted-foreground hover:text-accent-foreground"
                }`}
              >
                {t("nav.reserve")}
              </a>
            )}
          </nav>

          {/* Desktop right actions: Lang → Store → Cart */}
          <TooltipProvider delayDuration={300}>
            <div className="hidden items-center gap-3 md:flex">
              <LanguageSelectorDropdown variant={showTransparent ? "transparent" : "solid"} />
              <StoreSelectorDropdown variant={showTransparent ? "transparent" : "solid"} />

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setIsCartOpen(true)}
                    className={`relative flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-300 ${
                      showTransparent
                        ? "bg-white/10 border-white/20 text-white hover:bg-white/20"
                        : "bg-white border-border shadow-sm text-accent-foreground hover:bg-muted"
                    }`}
                    aria-label={t("accessibility.openBox")}
                  >
                    <ShoppingBag className="h-4 w-4" />
                    {hasMounted && itemCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent-solid text-[10px] font-bold text-white">
                        {itemCount > 99 ? "99+" : itemCount}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{t("cart.boxTitle")}</TooltipContent>
              </Tooltip>

              <UserMenu variant={showTransparent ? "transparent" : "solid"} />
            </div>
          </TooltipProvider>

          {/* Mobile: Lang → Store → Cart → Hamburger */}
          <div className="flex items-center gap-3 md:hidden">
            <LanguageSelectorDropdown variant={showTransparent ? "transparent" : "solid"} />
            <StoreSelectorDropdown variant={showTransparent ? "transparent" : "solid"} />

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className={`relative flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-300 ${
                showTransparent
                  ? "bg-white/10 border-white/20 text-white"
                  : "bg-white border-border shadow-sm text-accent-foreground"
              }`}
              aria-label={t("accessibility.openBox")}
            >
              <ShoppingBag className="h-4 w-4" />
              {hasMounted && itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent-solid text-[10px] font-bold text-white">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-300 ${
                showTransparent
                  ? "bg-white/10 border-white/20 text-white"
                  : "bg-white border-border shadow-sm text-accent-foreground"
              }`}
              aria-label={
                isMobileMenuOpen
                  ? t("accessibility.closeMenu")
                  : t("accessibility.openMenu")
              }
            >
              {isMobileMenuOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile full-screen menu overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }}
            className="fixed inset-0 z-40 flex flex-col bg-primary md:hidden"
          >
            {/* Close button */}
            <div className="flex items-center justify-between px-6 py-4">
              <span className="font-black text-xl tracking-tighter text-white">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={brandName}
                    className="h-8 w-auto object-contain brightness-0 invert"
                  />
                ) : (
                  brandName
                )}
              </span>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 border border-white/20 text-white"
                aria-label={t("accessibility.closeMenu")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Nav links */}
            <nav className="flex flex-1 flex-col justify-center gap-2 px-10">
              {navLinks.map((link, index) => {
                const isActive = pathname === link.href
                return (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + index * 0.06, duration: 0.3 }}
                  >
                    <Link
                      href={link.href}
                      className={`block text-4xl font-black uppercase tracking-tight transition-colors ${
                        isActive ? "text-accent-solid" : "text-white hover:text-white/70"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                )
              })}

              {reservationUrl && (
                <motion.div
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + navLinks.length * 0.06, duration: 0.3 }}
                >
                  <a
                    href={reservationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-4xl font-black uppercase tracking-tight text-white transition-colors hover:text-white/70"
                  >
                    {t("nav.reserve")}
                  </a>
                </motion.div>
              )}
            </nav>

            {/* User menu at bottom */}
            <div className="px-10 pb-8">
              <UserMenu variant="transparent" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CartSheet open={isCartOpen} onOpenChange={setIsCartOpen} />
    </>
  )
}
