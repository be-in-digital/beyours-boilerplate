"use client";

/**
 * Segment error boundary — the one that catches almost everything.
 *
 * App Router bubbles a render error to the nearest `error.tsx`, and only to
 * `global-error.tsx` when there is none. So this file has to report as well as
 * apologise: if it rendered without capturing, adding it would make the app
 * *less* observable than having no boundary at all.
 *
 * It also has to tell two different things apart. A `useQuery` that a guard
 * refused rethrows DURING RENDER and lands here exactly like a crash — a staff
 * member opening a page above their permission got "Une erreur est survenue"
 * and a Sentry event, for a system working precisely as designed. A refusal now
 * says what it is, and is not reported: filing authorisation as an incident
 * buries the real ones.
 */

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { convexErrorPayload } from "@/lib/convex-error";

/** Copy for the refusals a page can hit mid-render. */
const DENIALS: Record<string, string> = {
  not_authenticated: "Votre session a expiré. Reconnectez-vous pour continuer.",
  no_profile:
    "Aucun rôle n'est attribué à ce compte. Demandez une invitation, ou désignez le premier administrateur du déploiement.",
  store_not_granted: "Vous n'avez pas accès à cet établissement.",
  permission_denied: "Votre rôle ne vous permet pas d'ouvrir cette page.",
  module_denied: "Ce module ne vous a pas été accordé.",
  staff_only: "Cet espace est réservé à l'équipe.",
};

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const denial = convexErrorPayload(error);
  const denialMessage = denial ? (DENIALS[denial.code] ?? denial.message) : null;

  useEffect(() => {
    // A refusal is an answer, not an incident.
    if (!denialMessage) Sentry.captureException(error);
  }, [error, denialMessage]);

  if (denialMessage) {
    return (
      <div
        className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center"
        data-testid="access-denied"
      >
        <h1 className="text-2xl font-semibold text-foreground">Accès refusé</h1>
        <p className="max-w-md text-sm text-muted-foreground">{denialMessage}</p>
        <a
          href="/menu"
          className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Retour au site
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold text-foreground">Une erreur est survenue</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        La page n&apos;a pas pu s&apos;afficher. L&apos;incident a été signalé automatiquement.
      </p>
      {error.digest && (
        // The digest is the only handle a restaurant owner can quote to
        // support, and the same value Sentry files the event under.
        <p className="font-mono text-xs text-muted-foreground">Référence : {error.digest}</p>
      )}
      <button
        type="button"
        onClick={reset}
        className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Réessayer
      </button>
    </div>
  );
}
