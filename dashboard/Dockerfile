ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:3.20
FROM node:22-alpine AS base

# --- Clone & install dependencies ---
FROM base AS deps
RUN apk add --no-cache git
WORKDIR /app
RUN git clone --depth 1 https://github.com/Eike-tech/HomeAssistant.git .
RUN npm ci

# --- Build with placeholders (replaced at runtime) ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app ./

ENV NEXT_PUBLIC_HASS_URL=__HASS_URL_PLACEHOLDER__
ENV NEXT_PUBLIC_HASS_TOKEN=__HASS_TOKEN_PLACEHOLDER__

RUN npm run build

# --- Runtime (HA base image with Node.js) ---
FROM ${BUILD_FROM}

RUN apk add --no-cache nodejs

WORKDIR /app

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

COPY run.sh /run.sh
RUN chmod a+x /run.sh

CMD ["/run.sh"]
