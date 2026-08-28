#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# check-ses-status.sh — can this deployment email a real customer yet?
#
# A new AWS account starts in the SES *sandbox*: mail only reaches addresses
# you have verified yourself, capped at 200 messages a day. A restaurant that
# opens in the sandbox takes orders and confirms none of them, and nothing
# errors visibly — SES simply refuses the send.
#
# Leaving the sandbox is a request AWS reviews by hand, so it is the one step
# of an onboarding that cannot be done on go-live day. This script answers
# where that request stands, without opening the console.
#
# Usage:
#   ./scripts/check-ses-status.sh                     # account only
#   DOMAIN=chez-mario.fr ./scripts/check-ses-status.sh   # + that identity
#   AWS_REGION=eu-west-1 ./scripts/check-ses-status.sh
#
# Exit codes:
#   0  ready — production access granted, sending enabled, reputation healthy
#      (and, when DOMAIN is given, its DKIM verified)
#   1  not ready — every reason is named
#   2  could not tell (no AWS CLI, not authenticated, no node)
#
# Prerequisites: AWS CLI authenticated to the account you mean, and node on
# PATH to read the JSON. Both are already required by setup-aws.sh.
#
# See tasks/client-aws-onboarding-runbook.md — this is its step 4 gate.
# ============================================================================

REGION="${AWS_REGION:-eu-west-3}"
DOMAIN="${DOMAIN:-}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log_info()    { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_success() { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error()   { echo -e "${RED}[ERR]${NC}   $1"; }

for tool in aws node; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    log_error "$tool not found on PATH — cannot determine SES status."
    exit 2
  fi
done

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || true)
if [ -z "$ACCOUNT_ID" ]; then
  log_error "AWS CLI not authenticated. Run: aws configure"
  exit 2
fi
log_info "Account: $ACCOUNT_ID   Region: $REGION"

# ── The account: sandbox or not ─────────────────────────────────────────────
# Reported verbatim from sesv2 GetAccount. ProductionAccessEnabled=false IS the
# sandbox — there is no need to infer it from a failed send.
ACCOUNT_JSON=$(aws sesv2 get-account --region "$REGION" --output json 2>/dev/null || true)
if [ -z "$ACCOUNT_JSON" ]; then
  log_error "sesv2 get-account failed. Wrong region, or the caller lacks ses:GetAccount."
  exit 2
fi

# Node rather than jq: jq is not a stated prerequisite anywhere in this repo,
# node already is. Emits one `key=value` line per fact for the shell to read.
eval "$(printf '%s' "$ACCOUNT_JSON" | node -e '
  let s = "";
  process.stdin.on("data", (d) => (s += d)).on("end", () => {
    let a = {};
    try { a = JSON.parse(s); } catch { process.stdout.write("PARSE_FAILED=1\n"); return; }
    const q = a.SendQuota || {};
    const review = (a.Details || {}).ReviewDetails || {};
    const out = {
      PROD_ACCESS: a.ProductionAccessEnabled === true ? "yes" : "no",
      SENDING: a.SendingEnabled === true ? "yes" : "no",
      ENFORCEMENT: a.EnforcementStatus || "UNKNOWN",
      MAX24: q.Max24HourSend == null ? "?" : String(q.Max24HourSend),
      SENT24: q.SentLast24Hours == null ? "?" : String(q.SentLast24Hours),
      RATE: q.MaxSendRate == null ? "?" : String(q.MaxSendRate),
      REVIEW_STATUS: review.Status || "",
      REVIEW_CASE: review.CaseId || "",
    };
    for (const [k, v] of Object.entries(out)) {
      process.stdout.write(`${k}=${JSON.stringify(String(v))}\n`);
    }
  });
')"

# An unparseable response, or a node that died, must read as "could not tell"
# rather than as "not in the sandbox". Without this guard `set -u` would kill
# the script on the first unset variable below, with exit 1 — the code that
# means "not ready", which is a different claim from "I do not know".
if [ "${PARSE_FAILED:-}" = "1" ] || [ -z "${PROD_ACCESS:-}" ]; then
  log_error "Could not parse the sesv2 get-account response."
  exit 2
fi

READY=0
note_blocker() { READY=1; log_error "$1"; }

echo ""
if [ "$PROD_ACCESS" = "yes" ]; then
  log_success "Production access: GRANTED — mail can reach any address."
else
  note_blocker "Production access: NOT granted — this account is in the SANDBOX."
  echo "         Only verified identities receive mail; 200 messages / 24h; 1 per second."
  echo "         Request it: https://console.aws.amazon.com/ses/home?region=$REGION#/account"
  if [ -n "$REVIEW_STATUS" ]; then
    log_info "Review of your request: $REVIEW_STATUS${REVIEW_CASE:+  (support case $REVIEW_CASE)}"
  else
    log_warn "No review on file — the request has not been submitted yet."
  fi
fi

[ "$SENDING" = "yes" ] \
  && log_success "Sending: enabled." \
  || note_blocker "Sending: DISABLED for this account in $REGION."

case "$ENFORCEMENT" in
  HEALTHY)   log_success "Reputation: HEALTHY." ;;
  PROBATION) note_blocker "Reputation: PROBATION — AWS is reviewing this account." ;;
  SHUTDOWN)  note_blocker "Reputation: SHUTDOWN — sending is paused by AWS." ;;
  *)         log_warn   "Reputation: $ENFORCEMENT (unrecognised)." ;;
esac

log_info "Quota: $SENT24 / $MAX24 sent in the last 24h, max $RATE per second."

# ── The identity, when one is named ─────────────────────────────────────────
if [ -n "$DOMAIN" ]; then
  echo ""
  IDENTITY_JSON=$(aws sesv2 get-email-identity --email-identity "$DOMAIN" \
    --region "$REGION" --output json 2>/dev/null || true)
  if [ -z "$IDENTITY_JSON" ]; then
    note_blocker "Identity '$DOMAIN' not found in SES ($REGION). Run setup-aws.sh first."
  else
    DKIM=$(printf '%s' "$IDENTITY_JSON" | node -e '
      let s = "";
      process.stdin.on("data", (d) => (s += d)).on("end", () => {
        try {
          const i = JSON.parse(s);
          const dkim = (i.DkimAttributes || {}).Status || "UNKNOWN";
          process.stdout.write(`${dkim} ${i.VerifiedForSendingStatus === true ? "yes" : "no"}`);
        } catch { process.stdout.write("UNKNOWN no"); }
      });
    ')
    DKIM_STATUS="${DKIM%% *}"
    VERIFIED="${DKIM##* }"
    case "$DKIM_STATUS" in
      SUCCESS) log_success "DKIM for $DOMAIN: SUCCESS." ;;
      PENDING) note_blocker "DKIM for $DOMAIN: PENDING — SES has not read the CNAMEs yet. It gives up after 72h." ;;
      FAILED)  note_blocker "DKIM for $DOMAIN: FAILED — the records were never found. Re-run setup-aws.sh." ;;
      *)       note_blocker "DKIM for $DOMAIN: $DKIM_STATUS." ;;
    esac
    [ "$VERIFIED" = "yes" ] \
      && log_success "Identity verified for sending." \
      || note_blocker "Identity '$DOMAIN' is not verified for sending."
  fi
fi

echo ""
if [ "$READY" -eq 0 ]; then
  log_success "READY — this account can email real customers."
else
  log_error "NOT READY — the reasons above block customer email. Do not go live."
fi
exit "$READY"
