This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## API configuration

No API URL is baked into the build, so one image runs on any host:

- **Browser code** always calls the API on the same origin at the relative
  path `/api` (e.g. `/api/clinics`). No CORS is involved.
- **Server-side code** (server components, route handlers, SSR) cannot use a
  relative URL, so it calls `API_INTERNAL_URL`, read from the environment at
  request time (default: `http://localhost:8080/api`).

| Variable                  | When it is read                 | Purpose                                                                                                                                        |
| ------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `API_INTERNAL_URL`        | Runtime (server)                | API base URL for server-side code, e.g. `http://api:8080/api` in Docker. In `npm run dev` it is also where `/api/*` is forwarded.              |
| `NEXT_PUBLIC_DATA_SOURCE` | Build time                      | `rest` to use the API, `mock` (default) for in-browser sample data. The Docker image is built with `rest`.                                     |
| `KEYCLOAK_URL`            | Runtime (served to the browser) | Keycloak base URL including its relative path, e.g. `http://localhost:8081/auth`. Default (unset or empty): same origin, `<page origin>/auth`. |
| `KEYCLOAK_REALM`          | Runtime (served to the browser) | Keycloak realm. Default `clinic`.                                                                                                              |
| `KEYCLOAK_CLIENT_ID`      | Runtime (served to the browser) | Public OIDC client used for sign-in. Default `clinic-spa`.                                                                                     |
| `PUBLIC_DOCTORS`          | Runtime (served to the browser) | `true` (default): `/doctors` and `/doctors/[id]` open without sign-in. `false`: they redirect to sign-in like every other page.                |

Copy `.env.example` to `.env` to get started.

## Sign-in (Keycloak) and runtime settings

In `rest` mode sign-in uses Keycloak with the Authorization Code flow and PKCE
(S256) against the public client `clinic-spa`, via
[`oidc-client-ts`](https://github.com/authts/oidc-client-ts). The access token is
sent as `Authorization: Bearer` on every API call, refreshed with the refresh
token shortly before it expires, and kept in `localStorage`, so all tabs share
one sign-in. Refreshes take a cross-tab Web Lock (the realm rotates refresh
tokens, so two tabs refreshing at once would revoke each other), and signing out
in one tab signs out the others.
Sign-out also ends the Keycloak session (RP-initiated logout). "Create account"
on `/login` opens Keycloak's registration form. Keycloak sends the browser back
to `/login/callback` and, after sign-out, to `/`; both must be allowed for the
`clinic-spa` client in the realm.

The browser reads the Keycloak and public-page settings at runtime from
`GET /runtime-config`, which this app renders from its environment on every
request (`KEYCLOAK_*` and `PUBLIC_DOCTORS` in the table above). Nothing
host-specific is inlined at build time, so one image runs on any host; change
a value and restart the container.

Served over plain HTTP on a non-localhost address the page is not a "secure
context", so browsers hide `crypto.subtle` and `crypto.randomUUID`. The app then
fills in just SHA-256 (for PKCE) and UUID generation
(`src/infrastructure/oidc/insecure-context-crypto.ts`). Serve the app over
HTTPS in production; the shim then does nothing.

For `npm run dev` against a Keycloak on another port, set e.g.
`KEYCLOAK_URL=http://localhost:8081/auth` in `.env`; `http://localhost:3000` must
be an allowed redirect origin of `clinic-spa` (it is in the deploy realm by default).

**Local development:** `npm run dev` forwards `/api/*` to `API_INTERNAL_URL`
(a dev-only rewrite in `next.config.ts`), so the browser reaches a local API on
`http://localhost:8080/api` without a proxy.

**Production:** a reverse proxy on the same origin must route `/api/` to the
API and everything else to this app, for example with nginx:

```nginx
location /api/ { proxy_pass http://api:8080; }   # path kept: /api/clinics -> api:8080/api/clinics
location /     { proxy_pass http://frontend:3000; }
```

and run the container with `API_INTERNAL_URL=http://api:8080/api` (the image's
default). Every `/api/*` path belongs to the API, so this app serves no routes
under `/api`.

The app requests `GET /api/allergy-severities` for the available allergy
severity values and `GET /api/appointment-settings` for
`appointmentDurationMinutes`, `clinicOpeningTime`, and `clinicClosingTime`.
These values drive the allergy form and appointment scheduling controls.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
