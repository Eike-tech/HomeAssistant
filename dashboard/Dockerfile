ARG BUILD_FROM
FROM node:22-alpine AS base

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- Build with placeholders (replaced at runtime) ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json next.config.ts tsconfig.json ./
COPY src ./src
COPY public ./public

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
