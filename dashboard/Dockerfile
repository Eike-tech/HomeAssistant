ARG BUILD_FROM
FROM ${BUILD_FROM}

# Install Node.js and npm
RUN apk add --no-cache nodejs npm

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY src ./src
COPY public ./public
COPY next.config.ts tsconfig.json ./

# Build with placeholders (replaced at runtime by run.sh)
ENV NEXT_PUBLIC_HASS_URL=__HASS_URL_PLACEHOLDER__
ENV NEXT_PUBLIC_HASS_TOKEN=__HASS_TOKEN_PLACEHOLDER__
RUN npm run build

# Clean up build dependencies to save space
RUN rm -rf node_modules src
RUN cp -r .next/standalone/* . && cp -r .next/static .next/static

# Copy startup script
COPY run.sh /run.sh
RUN chmod a+x /run.sh

CMD ["/run.sh"]
