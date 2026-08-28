"use client"

import { useState } from "react"
import { authClient } from "@/lib/auth-client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { motion } from "framer-motion"
import {
  User,
  Mail,
  Lock,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react"
import { Button, Input, Label } from "@be-in-digital/ui/components"

export default function SignUpPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas")
      return
    }

    if (password.length < 12) {
      toast.error("Le mot de passe doit contenir au moins 12 caractères")
      return
    }

    setLoading(true)

    try {
      const result = await authClient.signUp.email({
        name,
        email,
        password,
      })

      if (result.error) {
        toast.error(result.error.message ?? "Échec de la création du compte")
      } else {
        toast.success("Compte créé avec succès !")
        router.push("/menu")
      }
    } catch {
      toast.error("Une erreur inattendue est survenue")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FDFCF6] text-zinc-900 font-sans overflow-hidden relative flex flex-col items-center justify-center py-20 px-6">
      {/* Background blobs */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-orange-400/10 rounded-full blur-[120px]" />
        <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-emerald-400/10 rounded-full blur-[100px]" />
      </div>

      {/* Back link */}
      <Link
        href="/"
        className="absolute top-8 left-8 flex items-center gap-2 text-[#0D5C3F] font-black uppercase tracking-widest text-[10px] hover:translate-x-[-4px] transition-transform z-20"
      >
        <ArrowLeft className="h-4 w-4" /> Retour
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 w-full max-w-xl"
      >
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-black text-zinc-800 tracking-tighter leading-[0.9] italic">
            Créer un <br />
            <span className="text-orange-500 not-italic">compte</span>
          </h1>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-[3rem] shadow-2xl shadow-emerald-950/5 border border-zinc-100 overflow-hidden">
          <div className="p-8 md:p-12">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div className="space-y-3">
                <Label
                  htmlFor="name"
                  className="text-zinc-800 font-black uppercase tracking-widest text-[10px] ml-1"
                >
                  Nom complet
                </Label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 group-focus-within:text-emerald-600 transition-colors" />
                  <Input
                    id="name"
                    type="text"
                    className="h-14 pl-12 pr-4 rounded-2xl border-zinc-100 bg-zinc-50 focus:bg-white transition-all text-zinc-900 font-bold placeholder:text-zinc-400 focus:ring-4 focus:ring-emerald-500/5"
                    placeholder="Jean Dupont"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-3">
                <Label
                  htmlFor="email"
                  className="text-zinc-800 font-black uppercase tracking-widest text-[10px] ml-1"
                >
                  Adresse email
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 group-focus-within:text-emerald-600 transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    className="h-14 pl-12 pr-4 rounded-2xl border-zinc-100 bg-zinc-50 focus:bg-white transition-all text-zinc-900 font-bold placeholder:text-zinc-400 focus:ring-4 focus:ring-emerald-500/5"
                    placeholder="jean@exemple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Passwords */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label
                    htmlFor="password"
                    className="text-zinc-800 font-black uppercase tracking-widest text-[10px] ml-1"
                  >
                    Mot de passe
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 group-focus-within:text-emerald-600 transition-colors" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      className="h-14 pl-12 pr-12 rounded-2xl border-zinc-100 bg-zinc-50 focus:bg-white transition-all text-zinc-900 font-bold placeholder:text-zinc-400"
                      placeholder="Min. 12 caractères"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={12}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  <Label
                    htmlFor="confirm"
                    className="text-zinc-800 font-black uppercase tracking-widest text-[10px] ml-1"
                  >
                    Confirmer
                  </Label>
                  <div className="relative group">
                    <CheckCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 group-focus-within:text-emerald-600 transition-colors" />
                    <Input
                      id="confirm"
                      type={showPassword ? "text" : "password"}
                      className="h-14 pl-12 pr-4 rounded-2xl border-zinc-100 bg-zinc-50 focus:bg-white transition-all text-zinc-900 font-bold placeholder:text-zinc-400"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={12}
                    />
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="space-y-4 pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-16 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] group disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Créer mon compte
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer link */}
        <p className="text-center mt-12 text-zinc-500 font-medium">
          Déjà un compte ?{" "}
          <Link
            href="/sign-in"
            className="text-[#0D5C3F] font-black hover:underline underline-offset-4"
          >
            Se connecter
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
