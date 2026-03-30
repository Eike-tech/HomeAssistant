#!/usr/bin/env bash
set -e

log() {
    echo "[INFO] $1"
}

# Read long-lived token from add-on config
HASS_TOKEN=""
if [ -n "${SUPERVISOR_TOKEN:-}" ]; then
    ADDON_TOKEN=$(curl -s -H "Authorization: Bearer ${SUPERVISOR_TOKEN}" \
        http://supervisor/addons/self/options | jq -r '.data.hass_token // empty' 2>/dev/null || true)
    if [ -n "$ADDON_TOKEN" ]; then
        HASS_TOKEN="$ADDON_TOKEN"
    fi
fi

# Get HA external URL from Core API (this is what the browser can reach)
HASS_URL=""
if [ -n "${SUPERVISOR_TOKEN:-}" ]; then
    HASS_URL=$(curl -s -H "Authorization: Bearer ${SUPERVISOR_TOKEN}" \
        http://supervisor/core/api/config | jq -r '.external_url // empty' 2>/dev/null || true)
    # Fallback to internal URL if no external URL configured
    if [ -z "$HASS_URL" ]; then
        HASS_URL=$(curl -s -H "Authorization: Bearer ${SUPERVISOR_TOKEN}" \
            http://supervisor/core/api/config | jq -r '.internal_url // empty' 2>/dev/null || true)
    fi
fi

# Fallback for non-addon environments
if [ -z "$HASS_URL" ]; then
    HASS_URL="${NEXT_PUBLIC_HASS_URL:-http://homeassistant.local:8123}"
fi

# Remove trailing slash
HASS_URL="${HASS_URL%/}"

# Get Ingress path from Supervisor API
INGRESS_PATH=""
if [ -n "${SUPERVISOR_TOKEN:-}" ]; then
    INGRESS_PATH=$(curl -s -H "Authorization: Bearer ${SUPERVISOR_TOKEN}" \
        http://supervisor/addons/self/info | jq -r '.data.ingress_entry // empty' 2>/dev/null || true)
    log "Ingress path: ${INGRESS_PATH}"
fi

log "Starting Dashboard..."
log "HA URL for browser: ${HASS_URL}"
log "Token configured: $([ -n "$HASS_TOKEN" ] && echo 'yes' || echo 'NO - configure hass_token in add-on settings!')"

# Replace build-time placeholders with runtime values
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
