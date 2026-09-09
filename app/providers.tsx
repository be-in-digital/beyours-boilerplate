"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { MotionConfig } from "framer-motion";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { authClient } from "@/lib/auth-client";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({
  children,
  initialToken,
}: {
  children: React.ReactNode;
  initialToken?: string | null;
}) {
  return (
    <ConvexBetterAuthProvider
      client={convex}
      authClient={authClient}
      initialToken={initialToken}
    >
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {/*
          `prefers-reduced-motion`, for the animations that do not go through
          CSS at all.

          `globals.css` carries a reduced-motion block and it reached NOTHING
          that framer-motion draws: framer animates by writing inline `style`
          on each frame, which no stylesheet rule can override, and the block
          was scoped to `.animate-in` besides — one occurrence in the whole
          app. So a diner who had asked their operating system to stop moving
          things still met every `motion.*` element on the buying path, the
          floating hero badges included.

          `reducedMotion="user"` is the framework's own answer and it is a
          context: it reaches every `motion` component under it — the
          storefront, the auth pages, the admin — without each one asking. It
          suppresses transform and layout animation and keeps opacity and
          colour, which is the distinction the preference is actually about.
        */}
        <MotionConfig reducedMotion="user">
          {children}
          <Toaster position="bottom-right" richColors closeButton />
        </MotionConfig>
      </ThemeProvider>
    </ConvexBetterAuthProvider>
  );
}
