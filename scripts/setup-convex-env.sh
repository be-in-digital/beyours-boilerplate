#!/usr/bin/env bash
# ===========================================================================
# scripts/setup-convex-env.sh
# ---------------------------------------------------------------------------
# Definit les variables d'environnement cote Convex a partir d'un fichier
# .env.convex local (non versionne).
#
# Usage:
#   1. Copier .env.convex.example vers .env.convex et remplir les valeurs
#   2. Lancer: bash scripts/setup-convex-env.sh
#
# Le script lit chaque ligne KEY=VALUE non commentee et appelle:
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
  # Ignorer commentaires et lignes vides
  [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
  # Extraire KEY=VALUE
  if [[ "$line" =~ ^([A-Z_][A-Z0-9_]*)=(.*)$ ]]; then
    key="${BASH_REMATCH[1]}"
    value="${BASH_REMATCH[2]}"
    # Trim surrounding quotes si presentes
    value="${value%\"}"
    value="${value#\"}"
    value="${value%\'}"
    value="${value#\'}"
    # Skip si valeur vide
    [[ -z "$value" ]] && continue
    echo "  -> set $key"
    pnpx convex env set "$key" "$value" >/dev/null
    count=$((count + 1))
  fi
done < "$ENV_FILE"

echo ""
echo "$count variables definies cote Convex."
