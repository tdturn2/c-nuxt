# Asbury Connect (Nuxt)

Intranet SPA for Asbury Seminary. This app is the **browser UI + Nitro BFF**. Business data and writes go to **[connect-api](../connect-api)** (Hono + Drizzle + Neon), not Payload CMS.

| Service | Repo | Local port |
|---|---|---|
| Connect UI | `Sites/connect` (this repo) | **3000** |
| Connect API | `Sites/connect-api` | **3003** |
| Entra SSO | Auth.js via `@sidebase/nuxt-auth` | `/api/auth` on Connect |

## Setup

```bash
cp .env.example .env   # if present; otherwise copy keys from a teammate
npm install
```

Required env (see `.env`):

| Variable | Purpose |
|---|---|
| `CONNECT_API` | Base URL of connect-api (`http://localhost:3003` locally) |
| `AUTH_SECRET` / `NUXT_AUTH_SECRET` | Auth.js session encryption (≥32 chars) |
| `AUTH_AZURE_AD_CLIENT_ID` | Entra application (client) ID |
| `AUTH_AZURE_AD_TENANT_ID` | Entra directory (tenant) ID |
| `AUTH_AZURE_AD_CLIENT_SECRET` | Entra client secret |
| `AUTH_URL` | App origin for Auth.js (`http://localhost:3000`) |

Run **connect-api** first (`cd ../connect-api && npm run dev`), then:

```bash
npm run dev
# or free 3000 and start clean:
npm run dev:clean
```

Entra redirect URI must match the port you use, e.g. `http://localhost:3000/api/auth/callback/azure-ad`.

## How requests flow

1. Browser → Connect Nitro `/api/...` (session cookies stay on Connect).
2. Nitro resolves `CONNECT_API`, syncs/authenticates the user (`authenticateWithConnectApi`), and proxies to connect-api.
3. Media for the browser is preferably rewritten to same-origin paths like `/api/connect-user-media/file/...`.

Agent conventions live in `.cursor/rules/` (`connect-core`, `server-api-connect-proxy`, `dashboard-docs-editor`).

## Scripts

```bash
npm run dev          # nuxt dev (may bump port if 3000 is taken)
npm run dev:clean    # kill 3000/3001, then nuxt on 3000
npm run build
npm run preview
npm test
```

## Production notes

- Set `CONNECT_API` to the deployed connect-api origin (no trailing slash).
- Set Auth.js public URL (`NUXT_PUBLIC_AUTH_BASE_URL` / `AUTH_ORIGIN`) to `https://<host>/api/auth`.
- Beeson CMS remains on Payload (`Sites/ops`); Connect does not share that process.
