FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
# NEXT_PUBLIC_* values are inlined at build time. The API URL is deliberately
# not one of them: browsers call /api on the same origin and the server reads
# API_INTERNAL_URL at runtime, so one image runs on any host.
ARG NEXT_PUBLIC_DATA_SOURCE=rest
ENV NEXT_PUBLIC_DATA_SOURCE=$NEXT_PUBLIC_DATA_SOURCE \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
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
