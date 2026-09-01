#!/usr/bin/env bash
# ===========================================================================
# scripts/setup-convex-env.sh
# ---------------------------------------------------------------------------
# Pushes the Convex-side environment variables onto the deployment selected by
# CONVEX_DEPLOYMENT in .env.local (or onto prod with --prod).
#
# Two sources, and the split is the point:
#
#   .env.convex   PER-CLIENT values — the restaurant's AWS keys, its Stripe
#                 account, its own Deliveroo brand/site ids. One file per
#                 client repo, gitignored, shared with nobody.
#   Infisical     BEYOURS' OWN credentials, byte-identical on every client
#                 deployment: the Uber Eats / Deliveroo partner apps, the
#                 OpenAI key, the BeYours billing Stripe. Opt in with
#                 --infisical.
#
# Why bother: rotating a partner-app secret meant editing N copies of
# .env.convex by hand and hoping none was missed. tasks/secret-rotation-runbook.md
# (A.1) spells that out — "propagate the new value to every store that needs
# it" — and the number of stores grows with every client signed. With
# --infisical the shared half has ONE source, and this script is how it reaches
# a deployment.
#
# Setup and conventions: apps/docs/deployment/infisical.md
#
# Usage:
#   bash scripts/setup-convex-env.sh                      # .env.convex only
#   bash scripts/setup-convex-env.sh .env.convex.staging  # another file
#   bash scripts/setup-convex-env.sh --infisical          # shared + per-client
#   bash scripts/setup-convex-env.sh --infisical --prod   # ...onto prod
#   bash scripts/setup-convex-env.sh --infisical --dry-run
#
# --infisical needs the CLI (https://infisical.com/docs/cli/overview) and:
#   INFISICAL_PROJECT_ID   the BeYours platform project
#   INFISICAL_ENV          environment slug — deliberately no default
#   INFISICAL_PATH         folder, defaults to /
#   INFISICAL_TOKEN        machine identity token, or run `infisical login`
#
# INFISICAL_ENV has no default because the CLI's own default is `dev`, and this
# script writes to a live deployment: an unset variable would quietly push
# development values onto a restaurant's site.
#
# LIMIT: values are pushed one line at a time, so a value containing a newline
# (a PEM key, say) cannot travel through here. None does today.
#
# This script never prints a secret value — only key names.
# ===========================================================================
set -euo pipefail

usage() {
  sed -n '3,46p' "$0" | sed 's/^# \{0,1\}//'
}

ENV_FILE=""
USE_INFISICAL=false
DRY_RUN=false
CONVEX_TARGET=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --infisical) USE_INFISICAL=true ;;
    --prod) CONVEX_TARGET=(--prod) ;;
    --dry-run) DRY_RUN=true ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "Unknown option: $1" >&2; echo "Try --help." >&2; exit 2 ;;
    *) ENV_FILE="$1" ;;
  esac
  shift
done

ENV_FILE="${ENV_FILE:-.env.convex}"

# `${arr[@]}` on an empty array is an unbound variable under `set -u` in bash
# 3.2, which is what macOS still ships. This form expands to nothing instead.
convex_target() { echo "${CONVEX_TARGET[@]+${CONVEX_TARGET[@]}}"; }

if [[ ${#CONVEX_TARGET[@]} -gt 0 ]]; then
  echo "Target: PRODUCTION deployment (--prod)."
else
  echo "Target: the deployment named by CONVEX_DEPLOYMENT in .env.local."
fi
$DRY_RUN && echo "Dry run — nothing will be written."
echo

# Keys already pushed, so the local file cannot silently undo the shared store.
# A plain string rather than an associative array, for the same bash 3.2 reason.
seen=""
is_seen() { case " $seen " in *" $1 "*) return 0 ;; *) return 1 ;; esac; }

overridden=""
count=0

set_var() {
  local key="$1" value="$2"
  if $DRY_RUN; then
    echo "  would set $key"
  else
    echo "  -> set $key"
    # shellcheck disable=SC2046
    pnpx convex env set "$key" "$value" $(convex_target) >/dev/null
  fi
  seen="$seen $key"
  count=$((count + 1))
}

# Turns the right-hand side of a KEY=VALUE line into the value.
#
# This is the same rule as `parseValue` in apps/reference/e2e/load-env.ts, on
# purpose: the two must agree about what a line means. It is not academic.
# `npx convex dev` writes
#
#   CONVEX_DEPLOYMENT=dev:youthful-goose-352 # team: …, project: beyours-reference
#
# and taking everything after the `=` pushes the comment into the value. The
# Convex CLI then answers "InvalidDeploymentName", pointing nowhere near the
# file that caused it. An inline comment needs whitespace before the `#`, so a
# value containing `#` with no space survives; anything stranger must be quoted.
parse_value() {
  local v="$1"
  v="${v#"${v%%[![:space:]]*}"}"          # ltrim
  v="${v%"${v##*[![:space:]]}"}"          # rtrim
  case "$v" in
    '"'*) v="${v#\"}"; v="${v%%\"*}" ;;
    "'"*) v="${v#\'}"; v="${v%%\'*}" ;;
    *)
      # %% takes the LONGEST matching suffix, which is the FIRST " #".
      if [[ "$v" == *[[:space:]]#* ]]; then
        v="${v%%[[:space:]]#*}"
        v="${v%"${v##*[![:space:]]}"}"
      fi
      ;;
  esac
  printf '%s' "$v"
}

# Reads KEY=VALUE lines. $2 is "shared" for the Infisical export (authoritative)
# or "local" for the .env.convex file (yields to whatever the shared store set).
read_dotenv() {
  local file="$1" origin="$2" line key value raw
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    if [[ "$line" =~ ^(export[[:space:]]+)?([A-Z_][A-Z0-9_]*)=(.*)$ ]]; then
      key="${BASH_REMATCH[2]}"
      raw="${BASH_REMATCH[3]}"
      # `KEY=   # left blank on purpose` is a line with a comment and no value.
      # parse_value returns "# left blank..." for it — and so does load-env.ts,
      # which is why the rule above is not the place to fix this. There it lands
      # in process.env; here it would be pushed onto a live deployment, so the
      # push is where it gets caught.
      [[ "$(printf '%s' "$raw" | sed -E 's/^[[:space:]]+//')" == "#"* ]] && continue
      value="$(parse_value "$raw")"
      [[ -z "$value" ]] && continue
      if [[ "$origin" == "local" ]] && is_seen "$key"; then
        overridden="$overridden $key"
        continue
      fi
      set_var "$key" "$value"
    fi
  done < "$file"
}

# ── Shared half — BeYours' own credentials ─────────────────────────────────
if $USE_INFISICAL; then
  if ! command -v infisical >/dev/null 2>&1; then
    echo "Error: the Infisical CLI is not on PATH." >&2
    echo "  brew install infisical/get-cli/infisical" >&2
    echo "  See apps/docs/deployment/infisical.md" >&2
    exit 1
  fi
  : "${INFISICAL_PROJECT_ID:?set INFISICAL_PROJECT_ID (see apps/docs/deployment/infisical.md)}"
  : "${INFISICAL_ENV:?set INFISICAL_ENV — there is no default, see the header}"

  umask 077
  export_file="$(mktemp)"
  trap 'rm -f "$export_file"' EXIT

  echo "Reading Infisical (env=$INFISICAL_ENV path=${INFISICAL_PATH:-/})..."
  # --include-imports defaults to true, so a client folder that imports the
  # platform folder exports both halves in one call.
  INFISICAL_DISABLE_UPDATE_CHECK=true infisical export \
    --format=dotenv \
    --projectId="$INFISICAL_PROJECT_ID" \
    --env="$INFISICAL_ENV" \
    --path="${INFISICAL_PATH:-/}" > "$export_file"

  read_dotenv "$export_file" "shared"
  echo
fi

# ── Per-client half ────────────────────────────────────────────────────────
if [[ ! -f "$ENV_FILE" ]]; then
  if $USE_INFISICAL; then
    echo "Note: $ENV_FILE not found — shared half only."
  else
    echo "Error: $ENV_FILE not found." >&2
    echo "Create it from .env.convex.example, then run again." >&2
    exit 1
  fi
else
  echo "Reading $ENV_FILE..."
  read_dotenv "$ENV_FILE" "local"
fi

echo
if $DRY_RUN; then
  echo "$count variables would be set on Convex."
else
  echo "$count variables set on Convex."
fi

if [[ -n "$overridden" ]]; then
  echo
  echo "Ignored in $ENV_FILE — the shared store is authoritative for these:"
  for key in $overridden; do echo "  - $key"; done
  echo "They are stale local copies of BeYours credentials. Delete them from"
  echo "$ENV_FILE so the next rotation has one place to change, not two."
fi
