"use client";

/**
 * Segment error boundary — the one that catches almost everything.
 *
 * App Router bubbles a render error to the nearest `error.tsx`, and only to
 * `global-error.tsx` when there is none. So this file has to report as well as
 * apologise: if it rendered without capturing, adding it would make the app
 * *less* observable than having no boundary at all.
 */

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

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
