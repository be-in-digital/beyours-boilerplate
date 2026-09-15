"use client"

import { useState, useId } from "react"
import Link from "next/link"
import { Facebook, Twitter, Instagram, MapPin, Phone, Clock, Mail } from "lucide-react"
import { useMutation } from "convex/react"
import { z } from "zod"
import { Button, Input } from "@be-in-digital/ui"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useStoreId } from "@/lib/hooks"
import { convexErrorCode } from "@/lib/convex-error"
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

/**
 * The same shape the server enforces, checked here so a typo costs no round
 * trip and does not spend one of the visitor's five hourly signups.
 *
 * The server check is the real one — this form is not the only caller of a
 * public mutation — and both have to exist for the same reason a client-side
 * check alone is never enough.
 */
const newsletterEmailSchema = z
  .string()
  .trim()
  .min(1, "Renseignez votre adresse email.")
  .email("Vérifiez votre adresse email.")

export function StorefrontFooter() {
  const { storeId, store } = useStoreId()
  const [email, setEmail] = useState("")
  const [subscribing, setSubscribing] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const inputId = useId()
  const emailInputId = `${inputId}-newsletter-email`
  const emailErrorId = `${inputId}-newsletter-error`
  const subscribe = useMutation(api.emailSubscribers.subscribe)

  /**
   * This form called no mutation at all.
   *
   * It read the address, discarded it, and showed "Vous êtes maintenant
   * inscrit" — so a visitor who signed up in the footer was never recorded
   * anywhere, in any state, and had no way of knowing. The two other signup
   * surfaces at least write a row.
   *
   * It then accepted anything shaped like text. `pas-un-email` was written to
   * the list and answered with the same "check your inbox" — a row SES can only
   * bounce, on the ratio AWS suspends the account over.
   */
  async function handleNewsletterSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (subscribing || !storeId) return

    const parsed = newsletterEmailSchema.safeParse(email)
    if (!parsed.success) {
      setEmailError(parsed.error.issues[0]?.message ?? "Vérifiez votre adresse email.")
      return
    }
    setEmailError(null)

    setSubscribing(true)
    try {
      await subscribe({ storeId: storeId as Id<"stores">, email: parsed.data })
      // Deliberately not "vous êtes inscrit": they are not, yet. The row is
      // `pending` until they open the link, and only `active` subscribers are
      // ever mailed.
      toast.success("Presque fini", {
        description:
          "Ouvrez le lien que nous venons de vous envoyer pour confirmer votre inscription.",
      })
      setEmail("")
    } catch (error) {
      // `subscribe` refuses with a ConvexError code, so each case gets the
      // answer that is true of it. Anything else genuinely failed to write, and
      // must not be reported as anything but that.
      const code = convexErrorCode(error)
      if (code === "already_subscribed") {
        toast.error("Cette adresse est déjà inscrite.")
      } else if (code === "invalid_email") {
        setEmailError("Vérifiez votre adresse email.")
      } else {
        toast.error("Votre inscription n'a pas pu être enregistrée.", {
          description: "Réessayez dans un instant.",
        })
      }
    } finally {
      setSubscribing(false)
    }
  }

  return (
    // `storefront-footer*` are hooks for the `foot` layout family (#507), not
    // styling. A template picks `columns`, `center` or `heavy`, and the rules
    // live in `app/globals.css` under `.storefront-theme` — Tailwind's generated
    // class names are not a contract, so the CSS needs names of its own. The
    // default here IS `columns`, so an unstyled footer is already correct.
    <footer className="storefront-footer bg-primary-hover pt-24 pb-12 px-6 md:px-12">
      <div className="max-w-7xl mx-auto">
        {/* 4-column grid */}
        <div className="storefront-footer-cols grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16">

          {/* Column 1 — Brand + contact */}
          <div>
            <h2 className="storefront-footer-brand text-2xl font-black tracking-tighter text-primary-foreground mb-4">
              {store?.name ?? "BeYours"}
            </h2>
            <p className="text-sm text-primary-foreground leading-relaxed mb-8">
              Commandez en ligne, retirez en magasin ou faites-vous livrer directement chez vous.
            </p>

            <div className="flex flex-col gap-4">
              <div className={`flex items-start gap-3 ${store?.address ? "" : "hidden"}`}>
                <MapPin className="h-4 w-4 text-primary-foreground flex-shrink-0 mt-0.5" />
                <span className="text-sm text-primary-foreground">
                  {store?.address ? `${store.address.street}, ${store.address.postalCode} ${store.address.city}` : ""}
                </span>
              </div>

              <div className={`flex items-center gap-3 ${store?.phone ? "" : "hidden"}`}>
                <Phone className="h-4 w-4 text-primary-foreground flex-shrink-0" />
                <span className="text-sm text-primary-foreground">{store?.phone ?? ""}</span>
              </div>

              <div className={`flex items-center gap-3 ${store?.email ? "" : "hidden"}`}>
                <Mail className="h-4 w-4 text-primary-foreground flex-shrink-0" />
                <span className="text-sm text-primary-foreground">{store?.email ?? ""}</span>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-primary-foreground flex-shrink-0" />
                <span className="text-sm text-primary-foreground">Voir les horaires sur le menu</span>
              </div>
            </div>
          </div>

          {/* Column 2 — Navigation */}
          <div>
            <h3 className="text-lg font-black uppercase tracking-widest text-primary-foreground mb-8 border-b border-white/10 pb-4">
              Navigation
            </h3>
            <nav className="flex flex-col gap-3">
              {productLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-primary-foreground font-bold text-sm transition-colors hover:underline hover:underline-offset-4"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Column 3 — Liens utiles */}
          <div>
            <h3 className="text-lg font-black uppercase tracking-widest text-primary-foreground mb-8 border-b border-white/10 pb-4">
              Liens utiles
            </h3>
            <nav className="flex flex-col gap-3">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-primary-foreground font-bold text-sm transition-colors hover:underline hover:underline-offset-4"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Column 4 — Newsletter */}
          <div>
            <h3 className="text-lg font-black uppercase tracking-widest text-primary-foreground mb-8 border-b border-white/10 pb-4">
              Newsletter
            </h3>
            <p className="text-sm text-primary-foreground mb-6 leading-relaxed">
              Recevez nos offres exclusives et nouveautés directement dans votre boîte mail.
            </p>

            <form onSubmit={handleNewsletterSubmit} noValidate>
              {/* A placeholder is not a label: it disappears on the first
                  keystroke and screen readers are not required to announce it. */}
              <label htmlFor={emailInputId} className="sr-only">
                Votre adresse email
              </label>
              <div className="relative">
                <Input
                  id={emailInputId}
                  type="email"
                  placeholder="Votre adresse email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (emailError) setEmailError(null)
                  }}
                  aria-invalid={emailError ? true : undefined}
                  aria-describedby={emailError ? emailErrorId : undefined}
                  className="bg-primary-hover border-white/20 h-14 rounded-xl text-primary-foreground placeholder:text-primary-foreground pr-28 focus-visible:ring-primary focus-visible:border-primary aria-invalid:border-destructive"
                  required
                />
                <Button
                  type="submit"
                  disabled={subscribing || !storeId}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 h-11 bg-primary hover:bg-primary-hover font-black text-[10px] uppercase tracking-widest rounded-lg px-4 text-primary-foreground transition-colors"
                >
                  {subscribing ? "Envoi…" : "S'inscrire"}
                </Button>
              </div>
              {emailError && (
                <p
                  id={emailErrorId}
                  role="alert"
                  className="mt-2 pl-1 text-xs font-bold text-primary-foreground"
                >
                  {emailError}
                </p>
              )}
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="storefront-footer-note border-t border-white/10 pt-12 mt-16 flex flex-col sm:flex-row items-center justify-between gap-6">
          <p className="text-xs font-bold text-primary-foreground uppercase tracking-widest">
            &copy; {new Date().getFullYear()} {store?.name ?? "Restaurant"}. Tous droits réservés.
          </p>

          {/* Social icons */}
          <div className="flex items-center gap-3">
            <a
              href="#"
              aria-label="Facebook"
              className="h-10 w-10 rounded-full bg-primary-hover text-primary-foreground flex items-center justify-center transition-colors"
            >
              <Facebook className="h-4 w-4" />
            </a>
            <a
              href="#"
              aria-label="Twitter / X"
              className="h-10 w-10 rounded-full bg-primary-hover text-primary-foreground flex items-center justify-center transition-colors"
            >
              <Twitter className="h-4 w-4" />
            </a>
            <a
              href="#"
              aria-label="Instagram"
              className="h-10 w-10 rounded-full bg-primary-hover text-primary-foreground flex items-center justify-center transition-colors"
            >
              <Instagram className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
