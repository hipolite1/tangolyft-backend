#!/usr/bin/env bash
set -euo pipefail

API="${API:-https://tangolyft-backend.onrender.com}"

if [[ -z "${RIDER_TOKEN:-}" || -z "${DRIVER_TOKEN:-}" ]]; then
  echo "Missing tokens. Run: ./setup_tokens.sh && source ./tangolyft_env.sh"
  exit 1
fi

echo "== 1) Create trip =="
RESP="$(curl -s -X POST "$API/trips/request" \
  -H "Authorization: $RIDER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "city":"ABUJA",
    "serviceType":"BIKE_DELIVERY",
    "paymentMethod":"PAY_ON_DROPOFF",
    "pickupAddress":"Wuse 2, Abuja",
    "pickupLat":9.0765,
    "pickupLng":7.3986,
    "dropoffAddress":"Garki, Abuja",
    "dropoffLat":9.0339,
    "dropoffLng":7.4833,
    "recipientName":"Receiver One",
    "recipientPhone":"+2348022222222",
    "itemDescription":"Documents",
    "noteToCourier":"Handle with care"
  }')"

echo "$RESP"

# IMPORTANT: extract trip.id (not delivery.id)
TRIP_ID="$(printf '%s' "$RESP" | tr -d '\n' | sed -n 's/.*"trip":{"id":"\([0-9a-f-]\{36\}\)".*/\1/p')"

if [[ -z "${TRIP_ID:-}" ]]; then
  echo "ERROR: Could not parse TRIP_ID (trip.id)."
  exit 1
fi

echo "TRIP_ID=$TRIP_ID"
echo

echo "== 2) Accept =="
curl -s -X POST "$API/trips/$TRIP_ID/accept" -H "Authorization: $DRIVER_TOKEN"
echo; echo

echo "== 3) Start =="
curl -s -X POST "$API/trips/$TRIP_ID/start" -H "Authorization: $DRIVER_TOKEN"
echo; echo

echo "== 4) Complete (Option B fallback) =="
curl -s -X POST "$API/trips/$TRIP_ID/complete" \
  -H "Authorization: $DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
echo; echo

echo "== 5) Wallet check =="
curl -s "$API/wallet/me" -H "Authorization: $DRIVER_TOKEN"
echo; echo

echo "== 6) Idempotency check (complete again; should NOT credit) =="
curl -s -X POST "$API/trips/$TRIP_ID/complete" \
  -H "Authorization: $DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
echo; echo

echo "DONE. MVP PASS if second complete shows walletUpdated:false and alreadyCompleted:true."
