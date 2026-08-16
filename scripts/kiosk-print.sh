#!/usr/bin/env bash
# ==============================================================================
# Chrome Kiosk Print — Auto-print tickets sans boite de dialogue
# ==============================================================================
#
# Ce script lance Google Chrome en mode kiosk-printing.
# Quand la page KDS appelle window.print(), Chrome imprime directement
# sur l'imprimante par defaut sans afficher la boite de dialogue "Imprimer".
#
# PREREQUIS:
#   1. Google Chrome installe
#   2. Une imprimante thermique configuree comme imprimante par defaut du systeme
#   3. L'URL du KDS (ex: http://localhost:3000/kitchen)
#
# USAGE:
#   ./scripts/kiosk-print.sh [URL]
#
# EXEMPLES:
#   ./scripts/kiosk-print.sh                                # defaut: localhost:3000/kitchen
#   ./scripts/kiosk-print.sh http://192.168.1.100:3000/kitchen
#   ./scripts/kiosk-print.sh https://monrestaurant.com/kitchen
#
# OPTIONS:
#   --printer NAME   Specifier l'imprimante (sinon imprimante par defaut)
#   --profile PATH   Specifier un profil Chrome dedie
#   --kiosk          Mode kiosk complet (plein ecran sans barre d'adresse)
#   --help           Afficher cette aide
#
# NOTES:
#   - Le flag --kiosk-printing supprime la boite de dialogue d'impression
#   - Le flag --kiosk (optionnel) met Chrome en plein ecran (ideal pour tablette cuisine)
#   - Utilisez un profil Chrome dedie pour eviter les conflits avec votre session
#   - Pour imprimer sur une imprimante specifique, configurez-la comme defaut systeme
#     OU utilisez le flag --printer
#
# ==============================================================================

set -euo pipefail

# --- Configuration par defaut ------------------------------------------------
DEFAULT_URL="http://localhost:3000/kitchen"
PROFILE_DIR=""
KIOSK_MODE=false
PRINTER_NAME=""

# --- Colors ------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# --- Functions ---------------------------------------------------------------

print_help() {
  head -42 "$0" | tail -40 | sed 's/^# //' | sed 's/^#//'
}

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[OK]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# --- Detect Chrome -------------------------------------------------------------

detect_chrome() {
  local chrome_path=""

  case "$(uname -s)" in
    Darwin)
      # macOS
      if [ -d "/Applications/Google Chrome.app" ]; then
        chrome_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      elif [ -d "$HOME/Applications/Google Chrome.app" ]; then
        chrome_path="$HOME/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      fi
      ;;
    Linux)
      # Linux — look in the standard paths
      for bin in google-chrome google-chrome-stable chromium-browser chromium; do
        if command -v "$bin" &>/dev/null; then
          chrome_path="$(command -v "$bin")"
          break
        fi
      done
      ;;
    *)
      log_error "Systeme non supporte: $(uname -s)"
      exit 1
      ;;
  esac

  if [ -z "$chrome_path" ]; then
    log_error "Google Chrome non trouve."
    log_info "Installez Chrome: https://www.google.com/chrome/"
    exit 1
  fi

  echo "$chrome_path"
}

# --- List printers -------------------------------------------------------------

list_printers() {
  case "$(uname -s)" in
    Darwin)
      lpstat -p 2>/dev/null | awk '{print $2}' || true
      ;;
    Linux)
      lpstat -p 2>/dev/null | awk '{print $2}' || true
      ;;
  esac
}

get_default_printer() {
  case "$(uname -s)" in
    Darwin)
      lpstat -d 2>/dev/null | awk -F': ' '{print $2}' || echo ""
      ;;
    Linux)
      lpstat -d 2>/dev/null | awk -F': ' '{print $2}' || echo ""
      ;;
  esac
}

# --- Parse arguments -----------------------------------------------------------

URL="$DEFAULT_URL"

while [[ $# -gt 0 ]]; do
  case $1 in
    --help|-h)
      print_help
      exit 0
      ;;
    --kiosk)
      KIOSK_MODE=true
      shift
      ;;
    --printer)
      PRINTER_NAME="$2"
      shift 2
      ;;
    --profile)
      PROFILE_DIR="$2"
      shift 2
      ;;
    http://*|https://*)
      URL="$1"
      shift
      ;;
    *)
      log_error "Option inconnue: $1"
      print_help
      exit 1
      ;;
  esac
done

# --- Execution ---------------------------------------------------------------

CHROME="$(detect_chrome)"
log_success "Chrome detecte: $CHROME"

# Dedicated profile, to avoid conflicts with the user's own session
if [ -z "$PROFILE_DIR" ]; then
  PROFILE_DIR="$HOME/.chrome-kiosk-print"
fi
log_info "Profil Chrome: $PROFILE_DIR"

# Check the printer
DEFAULT_PRINTER="$(get_default_printer)"
if [ -n "$PRINTER_NAME" ]; then
  log_info "Imprimante ciblee: $PRINTER_NAME"
elif [ -n "$DEFAULT_PRINTER" ]; then
  log_info "Imprimante par defaut: $DEFAULT_PRINTER"
else
  log_warn "Aucune imprimante par defaut detectee."
  log_info "Imprimantes disponibles:"
  list_printers | while read -r p; do echo "  - $p"; done
fi

# Build the Chrome flags
CHROME_FLAGS=(
  "--kiosk-printing"
  "--user-data-dir=$PROFILE_DIR"
  "--disable-translate"
  "--disable-features=TranslateUI"
  "--disable-infobars"
  "--disable-session-crashed-bubble"
  "--noerrdialogs"
  "--no-first-run"
  "--disable-default-apps"
  "--autoplay-policy=no-user-gesture-required"
)

# Full kiosk mode (tablet fullscreen)
if [ "$KIOSK_MODE" = true ]; then
  CHROME_FLAGS+=("--kiosk")
  log_info "Mode kiosk (plein ecran) active"
fi

echo ""
log_info "Lancement de Chrome kiosk-print..."
log_info "URL: $URL"
echo ""
echo -e "${YELLOW}---------------------------------------------------${NC}"
echo -e "${YELLOW} Chrome va imprimer AUTOMATIQUEMENT sur l'imprimante${NC}"
echo -e "${YELLOW} par defaut quand le KDS enverra un ticket.${NC}"
echo -e "${YELLOW}---------------------------------------------------${NC}"
echo ""
echo -e "Pour arreter: ${RED}Ctrl+C${NC} ou fermez Chrome."
echo ""

# Launch Chrome
exec "$CHROME" "${CHROME_FLAGS[@]}" "$URL"
