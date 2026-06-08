# Secret Market

Secret Market is an MVP prototype for a digital-goods marketplace with USDT payments, escrow-style order flow, seller payouts, disputes, admin moderation and a lightweight Node API.

## Local Run

Run the static frontend:

```powershell
npm run start:web
```

Default frontend URL: `http://127.0.0.1:4173`

Preview the built GitHub Pages artifact after `npm run build:pages`:

```powershell
npm run start:pages
```

Run the API:

```powershell
npm run start:api
```

Default API health URL: `http://127.0.0.1:4174/api/health`

The frontend API URL can be changed in `/account/settings` or by editing `config.js`.

## Verification

Run the full local check suite:

```powershell
npm run verify
```

The suite checks backend contracts, frontend live API integration, GitHub Pages routing, static route responses, security headers and the Pages build.

Useful focused checks:

```powershell
npm run verify:backend
npm run verify:env
npm run verify:api-client
npm run verify:live-sync
npm run verify:live-ui
npm run verify:pages
npm run verify:routes
npm run verify:build
npm run verify:dist
```

## GitHub Pages Build

Build the static artifact:

```powershell
npm run build:pages
```

The build writes only frontend files to `dist/`: HTML, CSS, browser JS, `assets/`, `renderers/`, `config.js` and `.nojekyll`. Backend, workflows, test scripts and data files are not published.

GitHub Pages deploys from `dist/` after the verification job succeeds.

## Backend Deploy

`render.yaml` is included as a starter Render blueprint for the API. Recommended public environment:

- `HOST=0.0.0.0`
- `PORT=<provided by host>`
- `SECMARKET_DB_FILE=/data/secmarket-db.json`
- `SECMARKET_ALLOWED_ORIGINS=https://penisxxxl.github.io,http://127.0.0.1:4173`
- `SECMARKET_ALLOW_RESET=false`
- `SECMARKET_RATE_LIMIT_MAX=240`
- `SECMARKET_RATE_LIMIT_WINDOW_MS=60000`

Use `.env.example` as the local template. Keep real `.env` files out of git.

After the API is deployed, set `window.SECMARKET_CONFIG.apiBaseUrl` in `config.js` to the public API URL, then rebuild and push the Pages artifact through GitHub Actions.

## Current Launch State

Ready as a public MVP demo:

- Static GitHub Pages frontend.
- Live API contract for products, orders, payments, delivery, disputes, withdrawals, audit and auth sessions.
- Password-gated demo auth with PBKDF2 hashes and bearer sessions.
- File-backed JSON store for MVP persistence.
- CORS allowlist, reset protection, rate limiting and basic security headers.
- CI verification before Pages deployment.

Still needed before real-money production:

- Real account registration, password reset and 2FA.
- Real TRC20, TON and BEP20 payment watchers.
- Production database such as PostgreSQL.
- Encrypted auto-delivery secrets.
- Attachment/file storage for disputes and tickets.
- Operational admin controls for risk review, refunds and payout batching.
