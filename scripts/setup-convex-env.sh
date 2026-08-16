#!/usr/bin/env bash
# ===========================================================================
# scripts/setup-convex-env.sh
# ---------------------------------------------------------------------------
# Sets the Convex-side environment variables from a local, untracked
# .env.convex file.
#
# Usage:
#   1. Copy .env.convex.example to .env.convex and fill in the values
#   2. Run: bash scripts/setup-convex-env.sh
#
# The script reads each uncommented KEY=VALUE line and calls:
#   pnpx convex env set <KEY> <VALUE>
# ===========================================================================
set -euo pipefail

ENV_FILE="${1:-.env.convex}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Erreur: $ENV_FILE introuvable."
  echo "Creer le fichier a partir de .env.convex.example puis relancer."
  exit 1
fi

echo "Lecture de $ENV_FILE..."
count=0
while IFS= read -r line || [[ -n "$line" ]]; do
  # Skip comments and blank lines
  [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
  # Extract KEY=VALUE
  if [[ "$line" =~ ^([A-Z_][A-Z0-9_]*)=(.*)$ ]]; then
    key="${BASH_REMATCH[1]}"
    value="${BASH_REMATCH[2]}"
    # Trim surrounding quotes if present
    value="${value%\"}"
    value="${value#\"}"
    value="${value%\'}"
    value="${value#\'}"
    # Skip if the value is empty
    [[ -z "$value" ]] && continue
    echo "  -> set $key"
    pnpx convex env set "$key" "$value" >/dev/null
    count=$((count + 1))
  fi
done < "$ENV_FILE"

echo ""
echo "$count variables definies cote Convex."
