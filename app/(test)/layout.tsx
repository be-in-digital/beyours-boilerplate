// FICHIER BOILERPLATE (n'existe pas dans l'engine — jamais écrasé par la
// resync). Les routes du groupe (test) sont des harnais Playwright
// (ex. /address-test) : utiles en dev et en e2e (serveur `pnpm dev`),
// elles n'ont rien à faire sur un site client en production.
// Issue engine ouverte pour adopter cette garde upstream.
import { notFound } from "next/navigation";

export default function TestRoutesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_ENABLE_TEST_ROUTES !== "true"
  ) {
    notFound();
  }
  return children;
}
