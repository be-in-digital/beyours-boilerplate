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
} from "@be-in-digital/ui/components"
import { useCartStore } from "@be-in-digital/restaurant"
import { useCmsPage } from "@/lib/cms/useCmsPage"
import { CartSheet } from "./cart-sheet"
import { StoreSelectorDropdown } from "./store-selector-dropdown"
import { LanguageSelectorDropdown } from "./language-selector-dropdown"
import { UserMenu } from "./user-menu"

const navLinks = [
  { href: "/", label: "Accueil" },
  { href: "/menu", label: "Menu" },
  { href: "/about", label: "À propos" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
]

export function StorefrontHeader({ hasBanner = false }: { hasBanner?: boolean }) {
  const pathname = usePathname()
  const itemCount = useCartStore((s) => s.getItemCount())
  const cms = useCmsPage("storefront-layout")
  const logoMedia = cms.block("branding").field("logo")
  const brandName = cms.block("branding").field("brandName").text ?? "BeInDigital"

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
            : "bg-white/90 backdrop-blur-md shadow-sm border-b border-zinc-100"
        }`}
      >
        <div className="flex items-center justify-between px-6 md:px-12 py-4">
          {/* Logo */}
          <Link
            href="/"
            className={`font-black text-xl tracking-tighter transition-colors duration-300 ${
              showTransparent ? "text-white" : "text-[#0D5C3F]"
            }`}
          >
            {logoMedia.mediaUrl ? (
              <img
                src={logoMedia.mediaUrl}
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
                        ? "text-[#0D5C3F]"
                        : "text-zinc-500 hover:text-[#0D5C3F]"
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span
                      className={`absolute -bottom-1 left-0 right-0 h-0.5 rounded-full ${
                        showTransparent ? "bg-white" : "bg-[#F97316]"
                      }`}
                    />
                  )}
                </Link>
              )
            })}
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
                        : "bg-white border-zinc-100 shadow-sm text-[#0D5C3F] hover:bg-zinc-50"
                    }`}
                    aria-label="Ouvrir la Box"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    {hasMounted && itemCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#F97316] text-[10px] font-bold text-white">
                        {itemCount > 99 ? "99+" : itemCount}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>Ma Box</TooltipContent>
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
                  : "bg-white border-zinc-100 shadow-sm text-[#0D5C3F]"
              }`}
              aria-label="Ouvrir la Box"
            >
              <ShoppingBag className="h-4 w-4" />
              {hasMounted && itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#F97316] text-[10px] font-bold text-white">
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
                  : "bg-white border-zinc-100 shadow-sm text-[#0D5C3F]"
              }`}
              aria-label={isMobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
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
            className="fixed inset-0 z-40 flex flex-col bg-[#0D5C3F] md:hidden"
          >
            {/* Close button */}
            <div className="flex items-center justify-between px-6 py-4">
              <span className="font-black text-xl tracking-tighter text-white">
                {logoMedia.mediaUrl ? (
                  <img
                    src={logoMedia.mediaUrl}
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
                aria-label="Fermer le menu"
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
                        isActive ? "text-[#F97316]" : "text-white hover:text-white/70"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                )
              })}
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
