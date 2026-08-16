// PATCH BOILERPLATE vs engine: metadata + fonts + theme come from the site
// zone (site.config.ts, site/fonts.ts, site/theme.css). All other logic must
// stay identical to the engine (see docs/UPDATES.md § Patched files).
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
