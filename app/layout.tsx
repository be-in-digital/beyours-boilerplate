// PATCH BOILERPLATE vs engine: metadata + fonts + theme + layout come from the
// site zone (site.config.ts, site/fonts.ts, site/theme.css, site/layout.ts).
// All other logic must stay identical to the engine (see docs/UPDATES.md
// § Patched files).
import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import "@/site/theme.css";
import { Providers } from "./providers";
import { siteConfig } from "@/site.config";
import { fontVariables } from "@/site/fonts";
import { siteLayout } from "@/site/layout";
import { layoutAttributes } from "@/lib/layout-families";

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
    // The layout families go on `<html>`, as they do in the demo engine this
    // catalogue is generated from (#507). Every RULE that reads one is confined
    // to `.storefront-theme` in globals.css — `<html>` is the administration's
    // ancestor too, and a template must not repaint the dashboard. That is the
    // lesson #410 and #41 cost, applied one layer up.
    <html
      lang={lang}
      suppressHydrationWarning
      className={fontVariables}
      {...layoutAttributes(siteLayout)}
    >
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
