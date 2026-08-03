"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { motion } from "framer-motion"
import { PartyPopperIcon, Loader2Icon } from "lucide-react"
import { gameSounds, haptics, type GamePrize } from "@/lib/game"

/**
 * Winner contact form — the last step before the ticket.
 * Kept to 4 fields; the email receives the redemption code.
 */

const claimSchema = z.object({
  firstName: z.string().trim().min(2, "Votre prénom (2 caractères min.)"),
  lastName: z.string().trim().min(2, "Votre nom (2 caractères min.)"),
  email: z.string().trim().email("Adresse email invalide"),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^[+0-9 ().-]{6,20}$/.test(value), "Numéro invalide"),
})

export type ClaimValues = z.infer<typeof claimSchema>

interface ClaimFormProps {
  prize: GamePrize | null
  onSubmit: (values: ClaimValues) => Promise<void>
}

export function ClaimForm({ prize, onSubmit }: ClaimFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClaimValues>({
    resolver: zodResolver(claimSchema),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "" },
  })

  const submit = handleSubmit(async (values) => {
    setSubmitError(null)
    gameSounds.pop()
    haptics.light()
    try {
      await onSubmit(values)
    } catch {
      setSubmitError("Impossible d'enregistrer votre lot. Vérifiez votre connexion et réessayez.")
    }
  })

  const inputClass = (hasError: boolean) =>
    `w-full rounded-2xl border bg-white/[0.06] px-4 py-3.5 text-[15px] text-white placeholder:text-white/30 outline-none backdrop-blur transition-colors focus:border-amber-300/70 focus:bg-white/[0.09] ${
      hasError ? "border-red-400/60" : "border-white/10"
    }`

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 24 }}
      className="flex flex-1 flex-col pt-4"
    >
      <div className="mb-7 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 14 }}
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-400/15 text-amber-300"
        >
          <PartyPopperIcon className="h-7 w-7" />
        </motion.div>
        <h2 className="font-heading text-2xl font-bold">Votre lot vous attend</h2>
        <p className="mt-1.5 text-sm text-white/55">
          {prize ? `« ${prize.name} » est réservé.` : "Votre lot est réservé."} Dites-nous à qui
          l&apos;envoyer.
        </p>
      </div>

      <form onSubmit={submit} className="flex flex-1 flex-col gap-3.5" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <input
              {...register("firstName")}
              placeholder="Prénom"
              autoComplete="given-name"
              className={inputClass(!!errors.firstName)}
            />
            {errors.firstName && (
              <p className="mt-1 pl-1 text-[11px] text-red-300">{errors.firstName.message}</p>
            )}
          </div>
          <div>
            <input
              {...register("lastName")}
              placeholder="Nom"
              autoComplete="family-name"
              className={inputClass(!!errors.lastName)}
            />
            {errors.lastName && (
              <p className="mt-1 pl-1 text-[11px] text-red-300">{errors.lastName.message}</p>
            )}
          </div>
        </div>
        <div>
          <input
            {...register("email")}
            type="email"
            placeholder="Email — pour recevoir votre code"
            autoComplete="email"
            inputMode="email"
            className={inputClass(!!errors.email)}
          />
          {errors.email && (
            <p className="mt-1 pl-1 text-[11px] text-red-300">{errors.email.message}</p>
          )}
        </div>
        <div>
          <input
            {...register("phone")}
            type="tel"
            placeholder="Téléphone (optionnel)"
            autoComplete="tel"
            inputMode="tel"
            className={inputClass(!!errors.phone)}
          />
          {errors.phone && (
            <p className="mt-1 pl-1 text-[11px] text-red-300">{errors.phone.message}</p>
          )}
        </div>

        {submitError && (
          <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-center text-xs text-red-200">
            {submitError}
          </p>
        )}

        <div className="mt-auto pt-6">
          <motion.button
            type="submit"
            disabled={isSubmitting}
            whileTap={{ scale: 0.96 }}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-amber-400 to-orange-600 py-4 font-heading text-base font-bold uppercase tracking-widest text-white shadow-[0_10px_35px_rgba(249,115,22,0.5)] disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2Icon className="h-4 w-4 animate-spin" /> Un instant…
              </>
            ) : (
              "Recevoir mon code"
            )}
          </motion.button>
          <p className="mt-3 text-center text-[11px] leading-relaxed text-white/35">
            Vos coordonnées servent uniquement à vous remettre votre lot.
          </p>
        </div>
      </form>
    </motion.div>
  )
}
