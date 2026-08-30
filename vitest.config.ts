import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  // The app imports itself as `@/…`. Type-only imports erase before Vitest ever
  // resolves them, which is why this was not needed until a tested module
  // imported a *value* that way.
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    globals: true,
    // 30s was sized for the convex-test cold start on a machine doing nothing
    // else: each of the 27 suites compiles the whole `convex/` module graph on
    // its first call. Under contention that cost is not linear — a run measured
    // 433s of collection where an idle one takes 16s, and
    // `unsubscribe-link.test.ts` crossed 30s on its first `t.fetch`, which is
    // the cold start and not the assertion. 60s still catches a genuine hang,
    // and no longer turns a busy runner into a red build.
    testTimeout: 60_000,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      // Playwright owns the *.spec.ts files under e2e/. The *.test.ts files
      // there are Vitest suites (the Deliveroo scenarios) and must stay
      // visible: excluding all of e2e/ hid eleven of them from both runners.
      // `reference` fixed exactly this and the fix was never carried over.
      '**/e2e/**/*.spec.ts',
      '**/e2e/**/*.setup.ts',
      '**/.{idea,git,cache,output,temp}/**',
    ],
  },
})
