"use client"

import { useState, useId } from "react"
import Link from "next/link"
import { Facebook, Twitter, Instagram, MapPin, Phone, Clock, Mail } from "lucide-react"
import { Button } from "@be-in-digital/ui/components"
import { Input } from "@be-in-digital/ui/components"
import { useCurrentStore } from "@be-in-digital/restaurant"
import { toast } from "sonner"

const productLinks = [
  { href: "/menu", label: "Menu" },
  { href: "/cart", label: "Box" },
  { href: "/account/orders", label: "Mes commandes" },
  { href: "/account/favorites", label: "Mes favoris" },
]

const quickLinks = [
  { href: "/account", label: "Mon compte" },
  { href: "/account/addresses", label: "Mes adresses" },
  { href: "/store-selector", label: "Nos restaurants" },
]

export function StorefrontFooter() {
  const store = useCurrentStore()
  const [email, setEmail] = useState("")
  const inputId = useId()

  function handleNewsletterSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!email.trim()) return
    toast.success("Merci ! Vous êtes maintenant inscrit à notre newsletter.")
    setEmail("")
  }

  return (
    <footer className="bg-[#0A412D] pt-24 pb-12 px-6 md:px-12">
      <div className="max-w-7xl mx-auto">
        {/* 4-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16">

          {/* Column 1 — Brand + contact */}
          <div>
            <h2 className="text-2xl font-black tracking-tighter text-white mb-4">
              {store?.name ?? "BeYours"}
            </h2>
            <p className="text-sm text-emerald-50/60 leading-relaxed mb-8">
              Commandez en ligne, retirez en magasin ou faites-vous livrer directement chez vous.
            </p>

            <div className="flex flex-col gap-4">
              <div className={`flex items-start gap-3 ${store?.address ? "" : "hidden"}`}>
                <MapPin className="h-4 w-4 text-orange-400 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-emerald-50/80">
                  {store?.address ? `${store.address.street}, ${store.address.postalCode} ${store.address.city}` : ""}
                </span>
              </div>

              <div className={`flex items-center gap-3 ${store?.phone ? "" : "hidden"}`}>
                <Phone className="h-4 w-4 text-orange-400 flex-shrink-0" />
                <span className="text-sm text-emerald-50/80">{store?.phone ?? ""}</span>
              </div>

              <div className={`flex items-center gap-3 ${store?.email ? "" : "hidden"}`}>
                <Mail className="h-4 w-4 text-orange-400 flex-shrink-0" />
                <span className="text-sm text-emerald-50/80">{store?.email ?? ""}</span>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-orange-400 flex-shrink-0" />
                <span className="text-sm text-emerald-50/80">Voir les horaires sur le menu</span>
              </div>
            </div>
          </div>

          {/* Column 2 — Navigation */}
          <div>
            <h3 className="text-lg font-black uppercase tracking-widest text-white mb-8 border-b border-white/10 pb-4">
              Navigation
            </h3>
            <nav className="flex flex-col gap-3">
              {productLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-emerald-50/60 font-bold text-sm hover:text-white transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Column 3 — Liens utiles */}
          <div>
            <h3 className="text-lg font-black uppercase tracking-widest text-white mb-8 border-b border-white/10 pb-4">
              Liens utiles
            </h3>
            <nav className="flex flex-col gap-3">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-emerald-50/60 font-bold text-sm hover:text-white transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Column 4 — Newsletter */}
          <div>
            <h3 className="text-lg font-black uppercase tracking-widest text-white mb-8 border-b border-white/10 pb-4">
              Newsletter
            </h3>
            <p className="text-sm text-emerald-50/60 mb-6 leading-relaxed">
              Recevez nos offres exclusives et nouveautés directement dans votre boîte mail.
            </p>

            <form onSubmit={handleNewsletterSubmit} className="relative">
              <Input
                id={`${inputId}-newsletter-email`}
                type="email"
                placeholder="Votre adresse email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/10 border-white/20 h-14 rounded-xl text-white placeholder:text-white/40 pr-28 focus-visible:ring-orange-400 focus-visible:border-orange-400"
                required
              />
              <Button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-11 bg-orange-500 hover:bg-orange-600 font-black text-[10px] uppercase tracking-widest rounded-lg px-4 text-white transition-colors"
              >
                S&apos;inscrire
              </Button>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-12 mt-16 flex flex-col sm:flex-row items-center justify-between gap-6">
          <p className="text-xs font-bold text-emerald-50/40 uppercase tracking-widest">
            &copy; {new Date().getFullYear()} {store?.name ?? "Restaurant"}. Tous droits réservés.
          </p>

          {/* Social icons */}
          <div className="flex items-center gap-3">
            <a
              href="#"
              aria-label="Facebook"
              className="h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 hover:text-orange-400 text-emerald-50/60 flex items-center justify-center transition-colors"
            >
              <Facebook className="h-4 w-4" />
            </a>
            <a
              href="#"
              aria-label="Twitter / X"
              className="h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 hover:text-orange-400 text-emerald-50/60 flex items-center justify-center transition-colors"
            >
              <Twitter className="h-4 w-4" />
            </a>
            <a
              href="#"
              aria-label="Instagram"
              className="h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 hover:text-orange-400 text-emerald-50/60 flex items-center justify-center transition-colors"
            >
              <Instagram className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
