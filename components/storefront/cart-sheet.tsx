"use client"

import React, { useRef, useSyncExternalStore } from "react"
import Link from "next/link"
import { ShoppingBag, X, Plus, Minus, Trash2, ArrowRight } from "lucide-react"
import {
  Button,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@be-in-digital/ui/components"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"
import { useCartStore, formatPrice, useTranslation } from "@be-in-digital/restaurant"

interface CartSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CartSheet({ open, onOpenChange }: CartSheetProps) {
  const { t } = useTranslation()
  const items = useCartStore((s) => s.items)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem = useCartStore((s) => s.removeItem)
  const clearCart = useCartStore((s) => s.clearCart)
  const getSubtotal = useCartStore((s) => s.getSubtotal)
  const getItemCount = useCartStore((s) => s.getItemCount)

  const subtotal = getSubtotal()
  const itemCount = getItemCount()

  const hasMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  const displayCount = hasMounted ? itemCount : 0

  const closeButtonRef = useRef<HTMLButtonElement>(null)

  return (
    /*
      A drawer that is actually a dialog.

      This was a bare `<div>`, permanently rendered and merely pushed off-screen
      with `translate-x-full`. It carried no `role`, no `aria-modal`, no focus
      trap and no Escape handler — and because it was never unmounted, its seven
      buttons sat in the tab order of EVERY page: a keyboard user tabbing
      through the homepage walked into an invisible cart.

      `Sheet` is the repository's own Radix wrapper (`components/ui/sheet.tsx`),
      unused here until now. It brings the dialog role, `aria-modal`, the focus
      trap, focus restored to the trigger on close, Escape, and — through Radix
      Presence — unmounting that still plays the slide-out animation, so nothing
      is left behind in the accessibility tree or the tab order.
    */
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        // Radix marks the rest of the document `aria-hidden` and leaves
        // `aria-modal` off. Both are valid; stating it as well costs nothing
        // and is what a screen reader older than that convention looks for.
        aria-modal="true"
        // Left to itself, Radix focuses the first tabbable element — which here
        // is "Tout vider", a tooltip trigger. Focusing it opens the tooltip,
        // the tooltip becomes the topmost dismissable layer, and the first
        // Escape closes the TOOLTIP instead of the cart: the customer has to
        // press it twice, and the first press looks like nothing happened.
        // The close button is both the safe landing and the obvious one.
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          closeButtonRef.current?.focus()
        }}
        className="flex w-full flex-col gap-0 overflow-hidden rounded-l-[3rem] border-none bg-white p-0 shadow-xl sm:max-w-md"
      >
        {/* Header — green */}
        <div className="bg-[#0D5C3F] p-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <div>
                <SheetTitle className="text-2xl font-black uppercase italic tracking-tighter text-white">
                  {t("cart.boxTitleFull")}
                </SheetTitle>
                <SheetDescription className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                  {displayCount}{" "}
                  {displayCount > 1
                    ? t("cart.itemsSelected")
                    : t("cart.itemSelected")}
                </SheetDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {displayCount > 0 && (
                <TooltipProvider delayDuration={300}>
                  <AlertDialog>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[10px] font-bold uppercase tracking-widest text-white/40 hover:bg-white/10 hover:text-white"
                          >
                            Tout vider
                          </Button>
                        </AlertDialogTrigger>
                      </TooltipTrigger>
                      <TooltipContent className="rounded-xl border-none bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#0D5C3F]">
                        Vider ma Box
                      </TooltipContent>
                    </Tooltip>
                    <AlertDialogContent className="rounded-[2rem] border-none p-10">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-3xl font-black uppercase italic tracking-tighter text-zinc-800">
                          Vider votre Box ?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-lg font-medium text-zinc-500">
                          Cela supprimera tous les articles de votre sélection.
                          Êtes-vous sûr de vouloir recommencer ?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="mt-8 gap-4">
                        <AlertDialogCancel className="h-14 rounded-2xl text-xs font-black uppercase tracking-widest border-zinc-100 hover:bg-zinc-50">
                          {t("common.cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={clearCart}
                          className="h-14 rounded-2xl bg-rose-500 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-rose-500/20 hover:bg-rose-600"
                        >
                          Oui, tout vider
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TooltipProvider>
              )}

              <button
                type="button"
                ref={closeButtonRef}
                onClick={() => onOpenChange(false)}
                aria-label="Fermer la Box"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D5C3F]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Items — scrollable */}
        <div className="flex-1 overflow-y-auto bg-white">
          {items.length === 0 ? (
            <Empty className="h-full p-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ShoppingBag className="h-5 w-5" />
                </EmptyMedia>
                <EmptyTitle>{t("cart.boxEmpty")}</EmptyTitle>
                <EmptyDescription>{t("cart.boxEmptyMessage")}</EmptyDescription>
              </EmptyHeader>
              <Button
                onClick={() => onOpenChange(false)}
                className="h-12 rounded-xl bg-[#0D5C3F] px-8 font-bold text-white hover:bg-[#0A412D]"
              >
                {t("cart.browseMenu")}
              </Button>
            </Empty>
          ) : (
            <div className="space-y-6 px-8 py-8">
              <TooltipProvider delayDuration={300}>
                {items.map((item) => {
                  const optionsTotal = item.options.reduce(
                    (s, o) => s + o.priceModifier,
                    0
                  )
                  const unitPrice = item.price + optionsTotal
                  const lineTotal = unitPrice * item.quantity
                  // Two lines of one dish differ only by their options, so the
                  // options are what an icon-only button has to say out loud.
                  const lineLabel = item.options.length
                    ? `${item.name} (${item.options.map((o) => o.choice).join(", ")})`
                    : item.name

                  return (
                    <div
                      key={item.lineId}
                      data-line-id={item.lineId}
                      className="group flex gap-4"
                    >
                      {/* Image */}
                      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-100">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ShoppingBag className="h-8 w-8 text-zinc-300" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex flex-1 flex-col justify-between py-1">
                        <div>
                          <div className="flex items-start justify-between">
                            <h4 className="mb-1 text-sm font-black uppercase leading-tight tracking-tight text-zinc-800">
                              {item.name}
                            </h4>

                            {/* Remove item */}
                            <AlertDialog>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertDialogTrigger asChild>
                                    <button className="p-1 text-zinc-300 transition-colors hover:text-rose-500">
                                      <X className="h-4 w-4" />
                                    </button>
                                  </AlertDialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent className="rounded-xl border-none bg-rose-500 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white">
                                  Retirer de la Box
                                </TooltipContent>
                              </Tooltip>
                              <AlertDialogContent className="rounded-[2rem] border-none p-10">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-3xl font-black uppercase italic tracking-tighter text-zinc-800">
                                    Retirer l&apos;article ?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="text-lg font-medium text-zinc-500">
                                    Êtes-vous sûr de vouloir retirer{" "}
                                    <span className="font-bold text-zinc-800">
                                      {item.name}
                                    </span>{" "}
                                    de votre Box ?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="mt-8 gap-4">
                                  <AlertDialogCancel className="h-14 rounded-2xl text-xs font-black uppercase tracking-widest border-zinc-100 hover:bg-zinc-50">
                                    Le garder
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      removeItem(item.lineId)
                                    }
                                    className="h-14 rounded-2xl bg-rose-500 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-rose-500/20 hover:bg-rose-600"
                                  >
                                    Retirer maintenant
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>

                          {/* Unit price */}
                          <p className="text-sm font-black text-emerald-700">
                            {formatPrice(unitPrice)}
                          </p>

                          {/* Options badges */}
                          {item.options.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {item.options.map((opt, i) => (
                                <span
                                  key={i}
                                  className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-black uppercase text-emerald-600"
                                >
                                  + {opt.name}: {opt.choice}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Quantity controls + line total */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center rounded-lg border border-zinc-100 bg-zinc-50 p-1">
                            {item.quantity === 1 ? (
                              <AlertDialog>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertDialogTrigger asChild>
                                      <button
                                        aria-label={`Retirer ${lineLabel}`}
                                        className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 dark:text-zinc-400 transition-all hover:bg-white hover:text-rose-500 hover:shadow-sm"
                                      >
                                        <Minus className="h-3 w-3" />
                                      </button>
                                    </AlertDialogTrigger>
                                  </TooltipTrigger>
                                  <TooltipContent className="rounded-xl border-none bg-zinc-800 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white">
                                    Retirer
                                  </TooltipContent>
                                </Tooltip>
                                <AlertDialogContent className="rounded-[2rem] border-none p-10">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-3xl font-black uppercase italic tracking-tighter text-zinc-800">
                                      Retirer l&apos;article ?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="text-lg font-medium text-zinc-500">
                                      Êtes-vous sûr de vouloir retirer{" "}
                                      <span className="font-bold text-zinc-800">
                                        {item.name}
                                      </span>{" "}
                                      de votre Box ?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className="mt-8 gap-4">
                                    <AlertDialogCancel className="h-14 rounded-2xl text-xs font-black uppercase tracking-widest border-zinc-100 hover:bg-zinc-50">
                                      Le garder
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        updateQuantity(item.lineId, 0)
                                      }
                                      className="h-14 rounded-2xl bg-rose-500 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-rose-500/20 hover:bg-rose-600"
                                    >
                                      Retirer maintenant
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() =>
                                      updateQuantity(
                                        item.lineId,
                                        item.quantity - 1
                                      )
                                    }
                                    aria-label={`Diminuer la quantité de ${lineLabel}`}
                                    className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 dark:text-zinc-400 transition-all hover:bg-white hover:text-zinc-600 hover:shadow-sm"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="rounded-xl border-none bg-zinc-800 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white">
                                  Diminuer
                                </TooltipContent>
                              </Tooltip>
                            )}

                            <span className="w-10 text-center text-xs font-black text-zinc-800">
                              {item.quantity}
                            </span>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() =>
                                    updateQuantity(
                                      item.lineId,
                                      item.quantity + 1
                                    )
                                  }
                                  aria-label={`Augmenter la quantité de ${lineLabel}`}
                                  className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 dark:text-zinc-400 transition-all hover:bg-white hover:text-zinc-600 hover:shadow-sm"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="rounded-xl border-none bg-zinc-800 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white">
                                Augmenter
                              </TooltipContent>
                            </Tooltip>
                          </div>

                          {/* Line total */}
                          <span className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                            {formatPrice(lineTotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </TooltipProvider>
            </div>
          )}
        </div>

        {/* Footer — summary + checkout */}
        {items.length > 0 && (
          <div className="flex flex-col gap-4 border-t border-zinc-100 bg-zinc-50 p-8">
            <div className="w-full space-y-2">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                <span>{t("common.subtotal")}</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between pt-4">
                <span className="text-xl font-black uppercase tracking-tighter text-zinc-800">
                  {t("cart.totalPrice")}
                </span>
                <span className="text-2xl font-black tracking-tighter text-[#0D5C3F]">
                  {formatPrice(subtotal)}
                </span>
              </div>
            </div>
            <Link
              href="/checkout"
              className="mt-4 w-full"
              onClick={() => onOpenChange(false)}
            >
              <Button className="group h-16 w-full rounded-2xl bg-[#0D5C3F] text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-900/10 hover:bg-[#0A412D]">
                {t("cart.orderNow")}
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
