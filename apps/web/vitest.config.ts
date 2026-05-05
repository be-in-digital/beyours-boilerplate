import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/.next/**", "**/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: [
        "**/*.config.*",
        "**/.next/**",
        "**/e2e/**",
        "**/*.test.*",
        "**/vitest.setup.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
})
