"use client"

import { useState } from "react"
import { authClient } from "@/lib/auth-client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { motion } from "framer-motion"
import {
  Mail,
  Lock,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react"
import { Button, Input, Label } from "@be-in-digital/ui/components"

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await authClient.signIn.email({
        email,
        password,
      })

      if (result.error) {
        toast.error(result.error.message ?? "Echec de la connexion")
      } else {
        toast.success("Connexion reussie !")
        router.push("/dashboard")
      }
    } catch {
      toast.error("Une erreur inattendue est survenue")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FDFCF6] text-zinc-900 font-sans overflow-hidden relative flex flex-col items-center justify-center px-6">
      {/* Background blobs */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-emerald-400/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-orange-400/10 rounded-full blur-[100px]" />
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
            Bon retour <br />
            <span className="text-orange-500 not-italic">parmi nous</span>
          </h1>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-[3rem] shadow-2xl shadow-emerald-950/5 border border-zinc-100 overflow-hidden">
          <div className="p-8 md:p-12">
            <form onSubmit={handleSubmit} className="space-y-8">
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
                    className="h-16 pl-12 pr-4 rounded-2xl border-zinc-100 bg-zinc-50 focus:bg-white transition-all text-zinc-900 font-bold placeholder:text-zinc-400 focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/20"
                    placeholder="jean@exemple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <Label
                    htmlFor="password"
                    className="text-zinc-800 font-black uppercase tracking-widest text-[10px]"
                  >
                    Mot de passe
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-[10px] text-orange-600 font-black uppercase tracking-widest hover:underline"
                  >
                    Mot de passe oublie ?
                  </Link>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 group-focus-within:text-emerald-600 transition-colors" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="h-16 pl-12 pr-12 rounded-2xl border-zinc-100 bg-zinc-50 focus:bg-white transition-all text-zinc-900 font-bold placeholder:text-zinc-400 focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/20"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <div className="space-y-4 pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="relative w-full h-16 rounded-2xl bg-[#0D5C3F] hover:bg-[#0A412D] text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-950/20 transition-all hover:scale-[1.02] active:scale-[0.98] group disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <ArrowRight className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      Se connecter
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer link */}
        <p className="text-center mt-12 text-zinc-500 font-medium">
          Pas encore de compte ?{" "}
          <Link
            href="/sign-up"
            className="text-[#0D5C3F] font-black hover:underline underline-offset-4"
          >
            Creer un compte
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
