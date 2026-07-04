"use client"

import { useState } from "react"
import { authClient } from "@/lib/auth-client"
import Link from "next/link"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { Mail, ArrowLeft, ArrowRight, Loader2, CheckCircle2 } from "lucide-react"
import { Button, Input, Label } from "@be-in-digital/ui/components"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: "/reset-password",
      })

      if (result.error) {
        toast.error(result.error.message ?? "Erreur lors de l\u2019envoi")
      } else {
        setSent(true)
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
        href="/sign-in"
        className="absolute top-8 left-8 flex items-center gap-2 text-[#0D5C3F] font-black uppercase tracking-widest text-[10px] hover:translate-x-[-4px] transition-transform z-20"
      >
        <ArrowLeft className="h-4 w-4" /> Connexion
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
            Mot de passe <br />
            <span className="text-orange-500 not-italic">oublié ?</span>
          </h1>
          <p className="mt-6 text-lg text-zinc-500 font-medium max-w-md mx-auto">
            Entrez votre adresse email et nous vous enverrons un lien pour
            réinitialiser votre mot de passe.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-[3rem] shadow-2xl shadow-emerald-950/5 border border-zinc-100 overflow-hidden">
          <div className="p-8 md:p-12">
            {sent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="flex justify-center mb-6">
                  <div className="h-20 w-20 rounded-[2rem] bg-emerald-50 flex items-center justify-center text-[#0D5C3F]">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                </div>
                <h2 className="text-2xl font-black tracking-tighter text-zinc-800 mb-3">
                  Email envoyé !
                </h2>
                <p className="text-zinc-500 font-medium mb-2">
                  Vérifiez votre boîte de réception à
                </p>
                <p className="text-zinc-900 font-black tracking-tight underline decoration-emerald-500/30 decoration-4 mb-8">
                  {email}
                </p>
                <Button
                  onClick={() => setSent(false)}
                  variant="outline"
                  className="rounded-2xl border-zinc-100 font-black uppercase tracking-widest text-[10px] h-12 px-8"
                >
                  Renvoyer l&apos;email
                </Button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
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

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-16 rounded-2xl bg-[#0D5C3F] hover:bg-[#0A412D] text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-950/20 transition-all hover:scale-[1.02] active:scale-[0.98] group disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Envoyer le lien
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center mt-12 text-zinc-500 font-medium">
          Vous vous souvenez ?{" "}
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
