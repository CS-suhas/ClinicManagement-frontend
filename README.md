# Clinic Management Frontend

Next.js frontend for the clinic management system.

## Getting started

```bash
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:3000.

Other scripts:

- `npm run build` / `npm start`: production build and server
- `npm run lint` / `npm run format`: Biome checks and formatting
- `npm run api:types`: regenerate API types from the spec (`api:update` fetches the spec first)

## Configuration

| Variable                  | Read at           | Purpose                                                                              |
| ------------------------- | ----------------- | ------------------------------------------------------------------------------------ |
| `API_INTERNAL_URL`        | Runtime (server)  | API base URL for server-side code. Default `http://localhost:8080/api`.              |
| `NEXT_PUBLIC_DATA_SOURCE` | Build time        | `rest` to use the API, `mock` (default) for in-browser sample data.                  |
| `KEYCLOAK_URL`            | Runtime (browser) | Keycloak base URL, e.g. `http://localhost:8081/auth`. Default: `<page origin>/auth`. |
| `KEYCLOAK_REALM`          | Runtime (browser) | Keycloak realm. Default `clinic`.                                                    |
| `KEYCLOAK_CLIENT_ID`      | Runtime (browser) | Public OIDC client. Default `clinic-spa`.                                            |
| `PUBLIC_DOCTORS`          | Runtime (browser) | `true` (default) makes `/doctors` pages public; `false` requires sign-in.            |

Nothing host-specific is baked into the build, so one image runs on any host. Browser-facing settings are served from `GET /runtime-config`; change a value and restart the container.

## API

- The browser calls the API on the same origin at `/api`.
- Server-side code calls `API_INTERNAL_URL`.
- In `npm run dev`, `/api/*` is forwarded to `API_INTERNAL_URL` (see `next.config.ts`).

In production, a reverse proxy on the same origin must route `/api/` to the API and everything else to this app:

```nginx
location /api/ { proxy_pass http://api:8080; }
location /     { proxy_pass http://frontend:3000; }
```

## Sign-in

In `rest` mode, sign-in uses Keycloak (Authorization Code + PKCE) via `oidc-client-ts`. Tokens are kept in `localStorage` and shared across tabs. The `clinic-spa` client must allow `/login/callback` as a redirect URI and `/` as a post-logout redirect.

Serve the app over HTTPS in production. Over plain HTTP on a non-localhost address, a small shim (`src/infrastructure/oidc/insecure-context-crypto.ts`) fills in the missing Web Crypto functions.
