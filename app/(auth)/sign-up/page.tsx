"use client"

import { Suspense, useState } from "react"
import { authClient } from "@/lib/auth-client"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
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
  MailCheck,
} from "lucide-react"
import { Button, Input, Label } from "@be-in-digital/ui/components"

/**
 * Where to land after authenticating.
 *
 * Read from `?redirect=`, and deliberately restricted to a path on this site:
 * an absolute URL here would turn either auth page into an open redirect, and
 * these are exactly the two pages a phishing link wants to borrow. A protocol-
 * relative `//evil.example` is a URL to a browser and a path to a naive check,
 * so it is refused as well.
 */
function safeRedirect(raw: string | null): string {
  if (!raw) return "/menu"
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/menu"
  return raw
}

function SignUpForm() {
  const router = useRouter()
  const redirectTo = safeRedirect(useSearchParams().get("redirect"))
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  /**
   * The address the account was created for, once sign-up returned WITHOUT a
   * session. Better Auth only hands back a token when the address needs no
   * verification; when `requireEmailVerification` is on it answers
   * `{ token: null }` and mails a link instead. This page used to read that as
   * success and route to `/menu` — signed out, with nothing to show for it.
   */
  const [awaitingVerification, setAwaitingVerification] = useState<string | null>(null)
  const [resending, setResending] = useState(false)

  const handleResend = async () => {
    if (!awaitingVerification) return
    setResending(true)
    const { error } = await authClient.sendVerificationEmail({
      email: awaitingVerification,
      callbackURL: redirectTo,
    })
    setResending(false)
    if (error) {
      toast.error(error.message ?? "Impossible de renvoyer l'email")
      return
    }
    toast.success("Email renvoyé")
  }

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
        // Where the link in the verification email lands once the address is
        // confirmed. Auto-sign-in runs first, so the visitor arrives signed in.
        callbackURL: redirectTo,
      })

      if (result.error) {
        toast.error(result.error.message ?? "Échec de la création du compte")
      } else if (result.data?.token == null) {
        // Account created, no session: the deployment requires verification.
        // Say so, and stay on this page — routing to /menu here is what made
        // sign-up a dead end.
        setAwaitingVerification(email)
      } else {
        toast.success("Compte créé avec succès !")
        router.push(redirectTo)
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
          {awaitingVerification ? (
            <div
              className="p-8 md:p-12 text-center space-y-6"
              data-testid="verification-pending"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
                <MailCheck className="h-8 w-8 text-[#0D5C3F]" />
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-black tracking-tight text-zinc-800">
                  Vérifiez votre boîte mail
                </h2>
                <p className="text-zinc-500 font-medium leading-relaxed">
                  Nous avons envoyé un lien de confirmation à{" "}
                  <span className="font-black text-zinc-800">{awaitingVerification}</span>.
                  Cliquez dessus pour activer votre compte — vous serez connecté
                  automatiquement.
                </p>
                <p className="text-sm text-zinc-400">
                  Le lien expire dans une heure. Pensez à regarder vos spams.
                </p>
              </div>
              <div className="space-y-3 pt-2">
                <Button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="w-full h-14 rounded-2xl bg-[#0D5C3F] hover:bg-[#0A412D] text-white font-black uppercase tracking-widest text-xs disabled:opacity-60"
                >
                  {resending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="sr-only">Envoi en cours...</span>
                    </>
                  ) : (
                    "Renvoyer l'email"
                  )}
                </Button>
                <Link
                  href={`/sign-in?redirect=${encodeURIComponent(redirectTo)}`}
                  className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-600"
                >
                  Retour à la connexion
                </Link>
              </div>
            </div>
          ) : (
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
          )}
        </div>

        {/* Footer link */}
        <p className="text-center mt-12 text-zinc-500 font-medium">
          Déjà un compte ?{" "}
          <Link
            href={`/sign-in?redirect=${encodeURIComponent(redirectTo)}`}
            className="text-[#0D5C3F] font-black hover:underline underline-offset-4"
          >
            Se connecter
          </Link>
        </p>
      </motion.div>
    </div>
  )
}


/**
 * `useSearchParams` forces this tree to render on the client, and Next refuses
 * to prerender the route without a boundary to fall back to. The skeleton is
 * the page's own frame, so the transition is a fill rather than a flash.
 */
export default function SignUpPage() {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <SignUpForm />
    </Suspense>
  )
}

/** The page frame, shown while the client half of the route hydrates. */
function AuthPageFallback() {
  return (
    <div className="min-h-screen bg-[#FDFCF6] flex items-center justify-center px-6">
      <div className="w-full max-w-xl rounded-[3rem] border border-zinc-100 bg-white p-12 shadow-2xl shadow-emerald-950/5">
        <div className="h-6 w-40 animate-pulse rounded-full bg-zinc-100" />
        <div className="mt-8 space-y-4">
          <div className="h-14 animate-pulse rounded-2xl bg-zinc-50" />
          <div className="h-14 animate-pulse rounded-2xl bg-zinc-50" />
          <div className="h-16 animate-pulse rounded-2xl bg-zinc-100" />
        </div>
      </div>
    </div>
  )
}
