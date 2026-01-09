#!/usr/bin/env bash
set -euo pipefail

API_DEFAULT="https://tangolyft-backend.onrender.com"
RIDER_PHONE_DEFAULT="+2348012345679"
ADMIN_PHONE_DEFAULT="+2348012345688"
DRIVER_PHONE_DEFAULT="+2348012345699"
ENV_FILE="./tangolyft_env.sh"

json_get() {
  local key="$1"
  local json="$2"
  echo "$json" | sed -n "s/.*\"$key\":\"\\([^\"]*\\)\".*/\\1/p" | head -n 1
}

request_otp() {
  local phone="$1"
  curl -s -X POST "${API%/}/auth/request-otp" \
    -H "Content-Type: application/json" \
    -d "{\"phone\":\"$phone\"}"
}

verify_otp() {
  local phone="$1"
  local otp="$2"
  curl -s -X POST "${API%/}/auth/verify-otp" \
    -H "Content-Type: application/json" \
    -d "{\"phone\":\"$phone\",\"otp\":\"$otp\"}"
}

login_with_debug_otp() {
  local phone="$1"
  local label="$2"

  echo "== $label login: $phone =="

  local req otp ver token role
  req="$(request_otp "$phone")"
  echo "$req"

  otp="$(json_get otp "$req")"
  if [[ -z "${otp:-}" ]]; then
    echo "ERROR: OTP not found in request-otp response. Is DEBUG_OTP enabled?"
    exit 1
  fi

  ver="$(verify_otp "$phone" "$otp")"
  echo "$ver"

  token="$(json_get token "$ver")"
  if [[ -z "${token:-}" ]]; then
    echo "ERROR: token not found in verify-otp response."
    exit 1
  fi

  role="$(json_get role "$ver")"
  echo "OK: role=$role"
  echo

  # CRITICAL: ONLY print the token on the final line (so command substitution is clean)
  printf '%s' "$token"
}

export API="${API:-$API_DEFAULT}"
export RIDER_PHONE="${RIDER_PHONE:-$RIDER_PHONE_DEFAULT}"
export ADMIN_PHONE="${ADMIN_PHONE:-$ADMIN_PHONE_DEFAULT}"
export DRIVER_PHONE="${DRIVER_PHONE:-$DRIVER_PHONE_DEFAULT}"

echo "API=[$API]"
echo

RIDER_JWT="$(login_with_debug_otp "$RIDER_PHONE" "RIDER")"
ADMIN_JWT="$(login_with_debug_otp "$ADMIN_PHONE" "ADMIN (must be role ADMIN in DB)")"
DRIVER_JWT="$(login_with_debug_otp "$DRIVER_PHONE" "DRIVER (must be role DRIVER in DB)")"
# Force-clean: keep only the JWT (3-part token)
RIDER_JWT="$(printf '%s' "$RIDER_JWT" | tr -d '\r' | grep -oE '[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+' | head -n 1)"
ADMIN_JWT="$(printf '%s' "$ADMIN_JWT" | tr -d '\r' | grep -oE '[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+' | head -n 1)"
DRIVER_JWT="$(printf '%s' "$DRIVER_JWT" | tr -d '\r' | grep -oE '[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+' | head -n 1)"

if [[ -z "$RIDER_JWT" || -z "$ADMIN_JWT" || -z "$DRIVER_JWT" ]]; then
  echo "ERROR: Failed to extract one or more JWTs" >&2
  exit 1
fi

# Force-clean: keep only the JWT (3-part token)
RIDER_JWT="$(printf '%s' "$RIDER_JWT" | tr -d '\r' | grep -oE '[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+' | head -n 1)"
ADMIN_JWT="$(printf '%s' "$ADMIN_JWT" | tr -d '\r' | grep -oE '[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+' | head -n 1)"
DRIVER_JWT="$(printf '%s' "$DRIVER_JWT" | tr -d '\r' | grep -oE '[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+' | head -n 1)"

if [[ -z "$RIDER_JWT" || -z "$ADMIN_JWT" || -z "$DRIVER_JWT" ]]; then
  echo "ERROR: Failed to extract one or more JWTs" >&2
  exit 1
fi


export RIDER_TOKEN="Bearer $RIDER_JWT"
export ADMIN_TOKEN="Bearer $ADMIN_JWT"
export DRIVER_TOKEN="Bearer $DRIVER_JWT"

# Write a CLEAN env file: exports only, no logs
cat > "$ENV_FILE" <<EOF
# Auto-generated. Usage: source ./tangolyft_env.sh
export API="$API"
export RIDER_PHONE="$RIDER_PHONE"
export ADMIN_PHONE="$ADMIN_PHONE"
export DRIVER_PHONE="$DRIVER_PHONE"
export RIDER_TOKEN="Bearer $RIDER_JWT"
export ADMIN_TOKEN="Bearer $ADMIN_JWT"
export DRIVER_TOKEN="Bearer $DRIVER_JWT"
# Optional: set after first run if you want to reuse driver id
# export DRIVER_ID="..."
EOF

echo "Saved clean env to: $ENV_FILE"
