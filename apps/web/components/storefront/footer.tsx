import Link from "next/link"

/**
 * Storefront footer — minimal, neutral. Customize per client.
 */
export function StorefrontFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-50">
              <span className="inline-block h-7 w-7 rounded-lg bg-zinc-900 dark:bg-zinc-50" />
              BeInDigital
            </div>
            <p className="mt-2 text-sm text-zinc-500">
              Votre restaurant en ligne, livre rapidement.
            </p>
          </div>

          <FooterColumn title="Commander">
            <FooterLink href="/menu">Menu</FooterLink>
            <FooterLink href="/stores">Restaurants</FooterLink>
            <FooterLink href="/cart">Panier</FooterLink>
          </FooterColumn>

          <FooterColumn title="Compte">
            <FooterLink href="/account">Mon compte</FooterLink>
            <FooterLink href="/account/orders">Mes commandes</FooterLink>
            <FooterLink href="/account/loyalty">Fidelite</FooterLink>
          </FooterColumn>

          <FooterColumn title="Legal">
            <FooterLink href="/legal/cgv">CGV</FooterLink>
            <FooterLink href="/legal/privacy">Confidentialite</FooterLink>
            <FooterLink href="/legal/cookies">Cookies</FooterLink>
          </FooterColumn>
        </div>

        <div className="mt-10 flex flex-col items-start gap-2 border-t border-zinc-200 pt-6 text-sm text-zinc-500 md:flex-row md:items-center md:justify-between dark:border-zinc-800">
          <p>© {new Date().getFullYear()} BeInDigital. Tous droits reserves.</p>
          <p>
            Propulse par{" "}
            <Link
              href="https://beindigital.fr"
              className="underline hover:text-zinc-900 dark:hover:text-zinc-50"
            >
              BeInDigital
            </Link>
          </p>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </h3>
      <ul className="mt-3 space-y-2">{children}</ul>
    </div>
  )
}

function FooterLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <li>
      <Link
        href={href}
        className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        {children}
      </Link>
    </li>
  )
}
