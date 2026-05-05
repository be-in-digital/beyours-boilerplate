"use client"

import { useState } from "react"
import { toast } from "sonner"
import { authClient } from "@/lib/auth-client"

type Mode = "sign-in" | "sign-up"

/**
 * Customer-facing sign-in / sign-up form. Distinct from the admin
 * `/sign-in` flow which redirects to /dashboard — this one keeps
 * the customer in the storefront after auth.
 */
export function CustomerSignIn() {
  const [mode, setMode] = useState<Mode>("sign-in")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (mode === "sign-up") {
        const { error } = await authClient.signUp.email({
          email,
          password,
          name,
        })
        if (error) throw new Error(error.message)
        toast.success("Compte cree, bienvenue !")
      } else {
        const { error } = await authClient.signIn.email({
          email,
          password,
        })
        if (error) throw new Error(error.message)
        toast.success("Connecte")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12 md:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        {mode === "sign-in" ? "Connexion" : "Creer un compte"}
      </h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Connectez-vous pour suivre vos commandes et profiter de la fidelite.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {mode === "sign-up" && (
          <Field
            label="Nom complet"
            value={name}
            onChange={setName}
            autoComplete="name"
            required
          />
        )}
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          required
        />
        <Field
          label="Mot de passe"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
          required
          minLength={8}
        />
        <button
          type="submit"
          disabled={submitting}
          className="flex h-12 w-full items-center justify-center rounded-md bg-zinc-900 text-base font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {submitting
            ? "…"
            : mode === "sign-in"
              ? "Se connecter"
              : "Creer mon compte"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
        {mode === "sign-in" ? (
          <>
            Pas encore de compte ?{" "}
            <button
              type="button"
              onClick={() => setMode("sign-up")}
              className="font-medium text-zinc-900 underline dark:text-zinc-50"
            >
              Inscrivez-vous
            </button>
          </>
        ) : (
          <>
            Deja un compte ?{" "}
            <button
              type="button"
              onClick={() => setMode("sign-in")}
              className="font-medium text-zinc-900 underline dark:text-zinc-50"
            >
              Connectez-vous
            </button>
          </>
        )}
      </p>
    </div>
  )
}

function Field({
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  required,
  minLength,
}: {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
  required?: boolean
  minLength?: number
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-50"
      />
    </label>
  )
}
