#!/usr/bin/env bash
set -e

log() {
    echo "[INFO] $1"
}

# Read token: try Supervisor API for add-on config, then SUPERVISOR_TOKEN
HASS_TOKEN=""
if [ -n "${SUPERVISOR_TOKEN:-}" ]; then
    # Try to read token from add-on options via Supervisor API
    ADDON_TOKEN=$(curl -s -H "Authorization: Bearer ${SUPERVISOR_TOKEN}" \
        http://supervisor/addons/self/options | jq -r '.data.hass_token // empty' 2>/dev/null || true)
    if [ -n "$ADDON_TOKEN" ]; then
        HASS_TOKEN="$ADDON_TOKEN"
    else
        HASS_TOKEN="${SUPERVISOR_TOKEN}"
    fi
fi

# Determine HA URL
if [ -n "${SUPERVISOR_TOKEN:-}" ]; then
    HASS_URL="http://supervisor/core"
else
    HASS_URL="${NEXT_PUBLIC_HASS_URL:-http://homeassistant.local:8123}"
fi

# Get Ingress path from Supervisor API (e.g. /api/hassio/ingress/abc123)
INGRESS_PATH=""
if [ -n "${SUPERVISOR_TOKEN:-}" ]; then
    INGRESS_PATH=$(curl -s -H "Authorization: Bearer ${SUPERVISOR_TOKEN}" \
        http://supervisor/addons/self/info | jq -r '.data.ingress_entry // empty' 2>/dev/null || true)
    log "Ingress path: ${INGRESS_PATH}"
fi

log "Starting Dashboard..."
log "Connecting to Home Assistant at ${HASS_URL}"

# Replace build-time placeholders with runtime values in all relevant files
find /app/.next -type f \( -name "*.js" -o -name "*.html" -o -name "*.json" -o -name "*.rsc" \) -exec sed -i \
    -e "s|__HASS_URL_PLACEHOLDER__|${HASS_URL}|g" \
    -e "s|__HASS_TOKEN_PLACEHOLDER__|${HASS_TOKEN}|g" \
    -e "s|/__HA_INGRESS__|${INGRESS_PATH}|g" \
    {} +

find /app -maxdepth 1 -name "*.js" -exec sed -i \
    -e "s|__HASS_URL_PLACEHOLDER__|${HASS_URL}|g" \
    -e "s|__HASS_TOKEN_PLACEHOLDER__|${HASS_TOKEN}|g" \
    -e "s|/__HA_INGRESS__|${INGRESS_PATH}|g" \
    {} +

# Start the Next.js server
export NODE_ENV=production
export HOSTNAME=0.0.0.0
export PORT=3000

exec node /app/server.js
