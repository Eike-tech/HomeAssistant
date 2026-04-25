#!/usr/bin/env bash
set -e

log() {
    echo "[INFO] $1"
}

# Read long-lived token from add-on config
HASS_TOKEN=""
TIBBER_TOKEN=""
if [ -n "${SUPERVISOR_TOKEN:-}" ]; then
    ADDON_INFO=$(curl -s -H "Authorization: Bearer ${SUPERVISOR_TOKEN}" \
        http://supervisor/addons/self/info 2>/dev/null || true)
    ADDON_TOKEN=$(echo "$ADDON_INFO" | jq -r '.data.options.hass_token // empty' 2>/dev/null || true)
    if [ -n "$ADDON_TOKEN" ]; then
        HASS_TOKEN="$ADDON_TOKEN"
    fi
    TIBBER_OPT=$(echo "$ADDON_INFO" | jq -r '.data.options.tibber_token // empty' 2>/dev/null || true)
    if [ -n "$TIBBER_OPT" ]; then
        TIBBER_TOKEN="$TIBBER_OPT"
    fi
fi
export TIBBER_TOKEN

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
log "Tibber token: $([ -n "$TIBBER_TOKEN" ] && echo 'yes' || echo 'no (Auswertung wird auf HA Recorder zurückfallen)')"

# Write runtime config for the client (replaces fragile sed-based placeholder system)
mkdir -p /app/public
cat > /app/public/config.json <<CFGEOF
{
  "hassUrl": "${HASS_URL}",
  "hassToken": "${HASS_TOKEN}",
  "ingressPath": "${INGRESS_PATH}"
}
CFGEOF
log "Runtime config written to /app/public/config.json"

# Replace asset prefix placeholder in built files (still needed for Next.js static paths)
if [ -n "$INGRESS_PATH" ]; then
    find /app/.next -type f \( -name "*.js" -o -name "*.html" -o -name "*.json" -o -name "*.rsc" \) \
        -exec sed -i "s|/__HA_INGRESS__|${INGRESS_PATH}|g" {} +
    find /app -maxdepth 1 -name "*.js" \
        -exec sed -i "s|/__HA_INGRESS__|${INGRESS_PATH}|g" {} +
    log "Asset prefix replaced: /__HA_INGRESS__ -> ${INGRESS_PATH}"
fi

# Start the Next.js server
export NODE_ENV=production
export HOSTNAME=0.0.0.0
export PORT=3000

exec node /app/server.js
