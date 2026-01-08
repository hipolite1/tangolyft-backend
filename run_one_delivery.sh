#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="./tangolyft_env.sh"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE."
  echo "Run: ./setup_tokens.sh"
  exit 1
fi

# Load tokens + API
# shellcheck disable=SC1090
source "$ENV_FILE"

json_get() {
  local key="$1"
  local json="$2"
  echo "$json" | sed -n "s/.*\"$key\":\"\\([^\"]*\\)\".*/\\1/p" | head -n 1
}

assert_set() {
  local name="$1"
  local val="${!name:-}"
  if [[ -z "$val" ]]; then
    echo "ERROR: $name is empty."
    echo "Fix: run ./setup_tokens.sh again, then re-run this script."
    exit 1
  fi
}

# Preconditions
assert_set API
assert_set RIDER_TOKEN
assert_set ADMIN_TOKEN
assert_set DRIVER_TOKEN

# Trip payload (flat)
TRIP_PAYLOAD="$(cat <<'JSON'
{
  "serviceType": "BIKE_DELIVERY",
  "city": "ABUJA",

  "pickupAddress": "Wuse Market, Abuja",
  "pickupLat": 9.0765,
  "pickupLng": 7.3986,

  "dropoffAddress": "Garki Area 11, Abuja",
  "dropoffLat": 9.0339,
  "dropoffLng": 7.4891,

  "itemDescription": "Documents",
  "recipientName": "Receiver One",
  "recipientPhone": "+2348022222222",

  "paymentMode": "PAY_ON_DROPOFF"
}
JSON
)"

echo "== Create trip =="
TRIP_CREATE_JSON="$(curl -s -X POST "${API%/}/trips/request" \
  -H "Authorization: $RIDER_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary "$TRIP_PAYLOAD")"

echo "$TRIP_CREATE_JSON"

TRIP_ID="$(echo "$TRIP_CREATE_JSON" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -n 1)"
if [[ -z "${TRIP_ID:-}" ]]; then
  echo "ERROR: Could not parse TRIP_ID. Response above."
  exit 1
fi
export TRIP_ID
echo "TRIP_ID=$TRIP_ID"

echo
echo "== Admin waive commitment =="
WAIVE_JSON="$(curl -s -X POST "${API%/}/admin/trips/$TRIP_ID/waive-commitment" \
  -H "Authorization: $ADMIN_TOKEN")"
echo "$WAIVE_JSON"

echo
echo "== Ensure driver profile exists (apply if needed) =="
INBOX_JSON="$(curl -s "${API%/}/trips/inbox" -H "Authorization: $DRIVER_TOKEN")"
echo "$INBOX_JSON"

if echo "$INBOX_JSON" | grep -q "Driver profile not found"; then
  echo
  echo "Driver profile missing => applying..."
  APPLY_JSON="$(curl -s -X POST "${API%/}/driver/apply" \
    -H "Authorization: $DRIVER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"driverType":"BIKE_COURIER","city":"ABUJA"}')"

  echo "$APPLY_JSON"

  DRIVER_ID="$(echo "$APPLY_JSON" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -n 1)"
  if [[ -z "${DRIVER_ID:-}" ]]; then
    echo "ERROR: Could not parse DRIVER_ID."
    exit 1
  fi
  export DRIVER_ID
  echo "DRIVER_ID=$DRIVER_ID"

  echo
  echo "Approving driver (admin)..."
  APPROVE_JSON="$(curl -s -X POST "${API%/}/admin/drivers/$DRIVER_ID/approve" \
    -H "Authorization: $ADMIN_TOKEN")"
  echo "$APPROVE_JSON"

  echo
  echo "Driver go-online..."
  ONLINE_JSON="$(curl -s -X POST "${API%/}/driver/go-online" \
    -H "Authorization: $DRIVER_TOKEN")"
  echo "$ONLINE_JSON"
fi

echo
echo "== Driver inbox =="
INBOX_JSON2="$(curl -s "${API%/}/trips/inbox" -H "Authorization: $DRIVER_TOKEN")"
echo "$INBOX_JSON2"

echo
echo "== Accept =="
ACCEPT_JSON="$(curl -s -X POST "${API%/}/trips/$TRIP_ID/accept" \
  -H "Authorization: $DRIVER_TOKEN")"
echo "$ACCEPT_JSON"

echo
echo "== Start =="
START_JSON="$(curl -s -X POST "${API%/}/trips/$TRIP_ID/start" \
  -H "Authorization: $DRIVER_TOKEN")"
echo "$START_JSON"

echo
echo "== Complete =="
COMPLETE_JSON="$(curl -s -X POST "${API%/}/trips/$TRIP_ID/complete" \
  -H "Authorization: $DRIVER_TOKEN")"
echo "$COMPLETE_JSON"

if echo "$COMPLETE_JSON" | grep -q "distanceKmEst and durationMinEst are required"; then
  echo
  echo "=== ACTION REQUIRED (Neon Production SQL) ==="
  echo "Run this in Neon Production, then re-run only the complete call:"
  echo
  echo "update \"Trip\" set \"distanceKmEst\"=5.2, \"durationMinEst\"=18 where id = '$TRIP_ID';"
  echo
  echo "Then run:"
  echo "curl -i -X POST \"\${API%/}/trips/$TRIP_ID/complete\" -H \"Authorization: \$DRIVER_TOKEN\""
  exit 2
fi

echo
echo "== Wallet check =="
WALLET_JSON="$(curl -s "${API%/}/wallet/me" -H "Authorization: $DRIVER_TOKEN")"
echo "$WALLET_JSON"

TXS_JSON="$(curl -s "${API%/}/wallet/transactions" -H "Authorization: $DRIVER_TOKEN")"
echo "$TXS_JSON"

echo
echo "DONE. Look for CREDIT/TRIP_EARNING with tripId=$TRIP_ID."
