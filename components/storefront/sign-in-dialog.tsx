"use client"

import { useState } from "react"
import Link from "next/link"
import { LogIn, Eye, EyeOff } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Button,
  Input,
  Label,
} from "@be-in-digital/ui/components"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"

interface SignInDialogProps {
  trigger?: React.ReactNode
}

export function SignInDialog({ trigger }: SignInDialogProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await authClient.signIn.email({ email, password })

      if (result.error) {
        setError(result.error.message ?? "Identifiants incorrects")
      } else {
        toast.success("Connexion réussie")
        setOpen(false)
        setEmail("")
        setPassword("")
      }
    } catch {
      setError("Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="outline"
            className="h-14 w-full rounded-2xl border-2 border-orange-200 bg-orange-50 font-black uppercase tracking-widest text-orange-700 transition-all hover:border-orange-300 hover:bg-orange-100"
          >
            <LogIn className="mr-2 h-5 w-5" />
            Se connecter
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="rounded-[2rem] border-none bg-white p-0 shadow-2xl sm:max-w-md">
        <div className="rounded-t-[2rem] bg-[#0D5C3F] px-8 pb-6 pt-8">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter text-white">
              Connexion
            </DialogTitle>
          </DialogHeader>
          <p className="mt-1 text-sm text-white/70">
            Connectez-vous pour une commande plus rapide.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-8 pb-8 pt-6">
          {error && (
            <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label className="ml-1 text-[10px] font-black uppercase tracking-widest">
              Email
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="jean@exemple.fr"
              className="h-14 rounded-2xl border-transparent bg-zinc-50 px-6 text-sm font-medium transition-all focus:bg-white focus:ring-emerald-500/20"
            />
          </div>

          <div className="space-y-2">
            <Label className="ml-1 text-[10px] font-black uppercase tracking-widest">
              Mot de passe
            </Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Votre mot de passe"
                className="h-14 rounded-2xl border-transparent bg-zinc-50 px-6 pr-14 text-sm font-medium transition-all focus:bg-white focus:ring-emerald-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors hover:text-zinc-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="h-14 w-full rounded-2xl bg-[#0D5C3F] font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-900/10 transition-all hover:bg-[#0A412D]"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Connexion...
              </span>
            ) : (
              "Se connecter"
            )}
          </Button>

          <p className="text-center text-sm text-zinc-500">
            Pas encore de compte ?{" "}
            <Link
              href="/sign-up"
              className="font-bold text-[#0D5C3F] hover:underline"
            >
              Créer un compte
            </Link>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  )
}
