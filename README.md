# Secret Market

Secret Market is a digital-goods marketplace prototype focused on game accounts, keys, subscriptions, seller ratings, protected orders, chats, disputes, admin moderation and a lightweight Node API.

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

The frontend API URL can be changed in `/account/settings`. GitHub Pages builds can inject a public API URL through the `SECMARKET_PUBLIC_API_URL` repository variable.

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
npm run verify:github-pages-assets
npm run verify:api-client
npm run verify:live-sync
npm run verify:live-ui
npm run verify:pages
npm run verify:routes
npm run verify:public-config
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
- `SECMARKET_TELEGRAM_BOT_TOKEN=<secret bot token>`
- `SECMARKET_TELEGRAM_REGISTRATION_CHAT_ID=7391093210`

Use `.env.example` as the local template. Keep real `.env` files out of git.

When `NODE_ENV=production`, `/api/reset` is disabled by default even if `SECMARKET_ALLOW_RESET` is not set. Keep `SECMARKET_ALLOW_RESET=false` in public host settings so the intended state is visible in `/api/health`.

In production, `/api/ready` returns `503` with `deploymentIssues` if CORS is open to `*`, reset is enabled, persistent storage is not configured or rate limiting is disabled.

After the API is deployed, add a GitHub repository variable named `SECMARKET_PUBLIC_API_URL` with the public API origin, for example `https://secret-market-api.onrender.com`. The Pages workflow writes that value into `dist/config.js` during deployment. Local builds keep `apiBaseUrl` empty and fall back to `http://127.0.0.1:4174`.

## Frontend Tooling

The project includes a modern redesign toolchain without forcing a React migration: Tailwind CSS, Tailwind animation utilities, class composition helpers, Zod, ESLint, Prettier, VS Code recommendations and MCP server templates.

See `FRONTEND_TOOLING.md` for the installed tools, scripts and the React-only packages that should wait until a React/Vite or Next.js migration.

## Current Launch State

Ready as a public marketplace demo:

- Static GitHub Pages frontend.
- Live API contract for products, orders, payments, delivery, disputes, withdrawals, audit and auth sessions.
- Password-gated demo auth with PBKDF2 hashes and bearer sessions.
- Registration flow with safe Telegram notifications that never include plaintext passwords.
- Support ticket flow with Telegram notifications to the same support chat.
- File-backed JSON store for MVP persistence.
- CORS allowlist, reset protection, rate limiting and basic security headers.
- CI verification before Pages deployment.
- Pages deploy can inject the public API URL from a GitHub repository variable.

Still needed before real-money production:

- Real account registration, password reset and 2FA.
- Real TRC20, TON and BEP20 payment watchers.
- Production database such as PostgreSQL.
- Encrypted auto-delivery secrets.
- Attachment/file storage for disputes and tickets.
- Operational admin controls for risk review, refunds and payout batching.
