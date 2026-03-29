#!/usr/bin/with-contenv bashio
# shellcheck shell=bash

# Read configuration from Add-on options
HASS_TOKEN=$(bashio::config 'hass_token')

# If no token configured, try Supervisor API token
if [ -z "$HASS_TOKEN" ]; then
    HASS_TOKEN="${SUPERVISOR_TOKEN}"
fi

# HA internal URL (accessible from Add-on containers)
HASS_URL="http://supervisor/core"

bashio::log.info "Starting Dashboard..."
bashio::log.info "Connecting to Home Assistant at ${HASS_URL}"

# Replace build-time placeholders with runtime values in all JS files
find /app/.next -name "*.js" -exec sed -i \
    -e "s|__HASS_URL_PLACEHOLDER__|${HASS_URL}|g" \
    -e "s|__HASS_TOKEN_PLACEHOLDER__|${HASS_TOKEN}|g" \
    {} +

# Also replace in the standalone server
find /app -maxdepth 1 -name "*.js" -exec sed -i \
    -e "s|__HASS_URL_PLACEHOLDER__|${HASS_URL}|g" \
    -e "s|__HASS_TOKEN_PLACEHOLDER__|${HASS_TOKEN}|g" \
    {} +

# Start the Next.js server
export NODE_ENV=production
export HOSTNAME=0.0.0.0
export PORT=3000

exec node /app/server.js
