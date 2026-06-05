# SecMarket

SPA-prototype for a digital goods marketplace with crypto payments, escrow statuses, seller tools, disputes, support and admin flows.

## Run Frontend

```powershell
node server.js
```

Open `http://127.0.0.1:4173/`.

## GitHub Pages

After GitHub Pages deploys, the static prototype opens here:

`https://t1lt54.github.io/secretmarket/`

The project includes `404.html` fallback and `/secretmarket` base-path handling for direct SPA links.

## Run Backend Prototype

```powershell
node backend/server.js
```

Health check: `http://127.0.0.1:4174/api/health`.

## Verify

```powershell
node verify.js
node verify-backend.js
node verify-api-client.js
node verify-pages.js
```

## Structure

- `data.js` - demo collections and marketplace content.
- `routes.js` - SPA route map.
- `models.js` - frontend model contracts.
- `api.js` - browser mock API over localStorage.
- `api.js` also has `SECMARKET_API.live` for real `/api/*` calls.
- `backend/` - Node HTTP API skeleton with in-memory repository.
- `renderers/` - page renderers split by domain.
- `state.js`, `session.js`, `selectors.js` - app state, demo session and data selectors.
- `router.js`, `events.js`, `ui.js` - routing, DOM events and shared UI helpers.

## Done In MVP Structure

- Rich game category pages.
- Product create/edit page structure.
- Seller profile, seller dashboard and finance flows.
- Detailed dispute and support ticket pages.
- Admin moderation, payment and payout detail pages.
- Mobile navigation, compact filters and simplified checkout flow.
- Backend-ready frontend split.
- Backend API skeleton for products, orders, payments, disputes, tickets, withdrawals and moderation.
- Browser API client that can switch from localStorage mock data to live `/api/*`.

## Next Work

- Replace in-memory backend store with SQLite or PostgreSQL.
- Add real auth: password hashing, sessions, 2FA and role middleware.
- Connect frontend pages to `/api/*` instead of demo arrays.
- Add file uploads for dispute evidence and support attachments.
- Add blockchain payment watcher workers for TRC20, TON and BEP20.
- Add admin audit log for status changes, blocking and payout approvals.
