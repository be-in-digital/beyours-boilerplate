// PATCH BOILERPLATE vs engine : métadonnées + polices + thème via la zone
// site (site.config.ts, site/fonts.ts, site/theme.css). Toute autre logique
// doit rester identique à l'engine (voir docs/UPDATES.md § fichiers patchés).
import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import "@/site/theme.css";
import { Providers } from "./providers";
import { siteConfig } from "@/site.config";
import { fontVariables } from "@/site/fonts";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: siteConfig.titleTemplate,
  },
  description: siteConfig.description,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const lang = cookieStore.get("beid_locale")?.value || siteConfig.defaultLocale;

  return (
    <html lang={lang} suppressHydrationWarning className={fontVariables}>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
