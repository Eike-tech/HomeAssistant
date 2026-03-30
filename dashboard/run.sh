#!/usr/bin/env bash
set -e

# Source bashio if available (HA Add-on environment)
if [ -f /usr/lib/bashio/bashio ]; then
    # shellcheck source=/dev/null
    source /usr/lib/bashio/bashio
    HAS_BASHIO=true
else
    HAS_BASHIO=false
fi

log() {
    if [ "$HAS_BASHIO" = true ]; then
        bashio::log.info "$1"
    else
        echo "[INFO] $1"
    fi
}

# Read token from Add-on config, Supervisor, or environment
HASS_TOKEN=""
if [ "$HAS_BASHIO" = true ] && bashio::config.has_value 'hass_token'; then
    HASS_TOKEN=$(bashio::config 'hass_token')
fi
if [ -z "$HASS_TOKEN" ] && [ -n "${SUPERVISOR_TOKEN:-}" ]; then
    HASS_TOKEN="${SUPERVISOR_TOKEN}"
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
        http://supervisor/addons/self/info | jq -r '.data.ingress_entry // empty')
    log "Ingress path: ${INGRESS_PATH}"
fi

log "Starting Dashboard..."
log "Connecting to Home Assistant at ${HASS_URL}"

# Replace build-time placeholders with runtime values in all JS files
# INGRESS_PATH is injected so Next.js asset URLs resolve correctly through HA's ingress proxy
find /app/.next -name "*.js" -exec sed -i \
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
