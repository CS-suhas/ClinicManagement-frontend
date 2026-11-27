FROM node:22.23.5-alpine@sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22.23.5-alpine@sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a AS build
WORKDIR /app
# Nothing host-specific is inlined at build time: browsers call /api on the same
# origin and the server reads API_INTERNAL_URL at runtime, so one image runs on any host.
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22.23.5-alpine@sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a AS runtime
# Patch OS packages and drop the bundled npm/corepack: server.js runs on plain
# node, and npm's own dependencies were most of the image scanner's findings.
RUN apk upgrade --no-cache \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
WORKDIR /app
# API_INTERNAL_URL: base URL server-side code uses to reach the API. Read at
# runtime, so override it per deployment (docker run -e / compose environment).
# Also read at runtime and served to browsers at /runtime-config (see README):
# KEYCLOAK_URL (unset: <page origin>/auth), KEYCLOAK_REALM (clinic),
# KEYCLOAK_CLIENT_ID (clinic-spa), PUBLIC_DOCTORS (true).
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    API_INTERNAL_URL=http://api:8080/api
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
