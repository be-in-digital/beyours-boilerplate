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
  // The automatic JSX runtime, stated here rather than left to tsconfig
  // discovery. esbuild resolves `jsx` from the tsconfig NEAREST THE FILE, and
  // the engine packages ship `files: ["src"]` — source, no tsconfig. So a
  // `.tsx` inside `node_modules/@be-in-digital/*` got the classic transform,
  // which emits `React.createElement` into a module that never imports React:
  // `ReferenceError: React is not defined`, from `ui/src/components/Empty.tsx`
  // and `admin/src/game/actions-screen.tsx`. This app's own tsconfig already
  // says `"jsx": "react-jsx"`; this makes that true for everything Vitest
  // transforms, not only for the files it happens to find a tsconfig beside.
  esbuild: { jsx: "automatic" },
  test: {
    globals: true,
    // The engine packages ship TypeScript SOURCE, not a build: `admin`,
    // `convex-functions`, `convex-schema` and `ui` all declare `files: ["src"]`
    // and point `main` at `./src/index.ts`. Inside the monorepo that is
    // invisible — pnpm symlinks `node_modules/@be-in-digital/*` to
    // `packages/*`, so the resolved path falls OUTSIDE `node_modules` and gets
    // transformed like first-party source. A client installs a real directory
    // inside `node_modules`, where Vitest transforms nothing by default, and
    // the suite dies twice over: `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`
    // when Node is handed a `.ts` file, and `React is not defined` when a
    // `.tsx` file reaches the runtime with its JSX uncompiled.
    //
    // `next.config.ts` already says this for the build, with
    // `transpilePackages`. Nothing had said it for the test run, so the first
    // release that published these packages as source (2026-09-06) turned the
    // boilerplate's CI red on a template that compiles perfectly here. Every
    // runner that transforms code needs its own version of this statement.
    server: { deps: { inline: [/@be-in-digital\//] } },
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
