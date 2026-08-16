import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Convex auto-generated files:
    "convex/_generated/**",
    ".convex-build/**",
    // PATCH BOILERPLATE: areas outside the web app — the Expo app has its own
    // ESLint config, and the dormant snapshot is never linted.
    "mobile/**",
    ".template/**",
    // PATCH BOILERPLATE: static sales demos (browser JS + a CommonJS
    // serverless function), outside the scope of the Next/TS config.
    "demos/**",
  ]),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
]);

export default eslintConfig;
