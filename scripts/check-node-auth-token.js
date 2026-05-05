#!/usr/bin/env node
/**
 * Pre-install guard.
 *
 * The boilerplate consumes private packages from GitHub Packages
 * (@be-in-digital/*). Those packages require a `NODE_AUTH_TOKEN`
 * environment variable to be set during `pnpm install`.
 *
 * Without this token, `pnpm install` fails with an opaque
 * "401 Unauthorized" error. This script detects the missing
 * token early and prints a clear setup message.
 */

const skip =
  process.env.SKIP_NODE_AUTH_TOKEN_CHECK === "1" ||
  process.env.npm_lifecycle_event === "postinstall"

if (skip) {
  process.exit(0)
}

const token = process.env.NODE_AUTH_TOKEN

if (token && token.trim() !== "") {
  process.exit(0)
}

const RED = "\x1b[31m"
const YELLOW = "\x1b[33m"
const CYAN = "\x1b[36m"
const RESET = "\x1b[0m"
const BOLD = "\x1b[1m"

console.error("")
console.error(`${RED}${BOLD}NODE_AUTH_TOKEN is not set.${RESET}`)
console.error("")
console.error(
  "This boilerplate uses private packages (@be-in-digital/*) hosted on",
)
console.error("GitHub Packages. Installation requires a Personal Access Token.")
console.error("")
console.error(`${BOLD}Setup steps:${RESET}`)
console.error("")
console.error(
  `  1. Create a fine-grained PAT at ${CYAN}https://github.com/settings/tokens${RESET}`,
)
console.error(`     Scope required: ${YELLOW}read:packages${RESET}`)
console.error("")
console.error("  2. Export it in your shell:")
console.error("")
console.error(`     ${CYAN}export NODE_AUTH_TOKEN=ghp_xxxxxxxxxxxxx${RESET}`)
console.error("")
console.error(
  "     (add to ~/.zshrc or ~/.bashrc to persist across sessions)",
)
console.error("")
console.error("  3. Re-run the install command.")
console.error("")
console.error(
  `${YELLOW}To bypass this check (CI only): SKIP_NODE_AUTH_TOKEN_CHECK=1 pnpm install${RESET}`,
)
console.error("")

process.exit(1)
