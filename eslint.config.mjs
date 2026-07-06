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
    // PATCH BOILERPLATE : zones hors app web — l'app Expo a sa propre
    // config ESLint, le snapshot dormant n'est jamais linté.
    "mobile/**",
    ".template/**",
    // PATCH BOILERPLATE : démos de vente statiques (JS navigateur + fonction
    // serverless CommonJS), hors périmètre de la config Next/TS.
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
