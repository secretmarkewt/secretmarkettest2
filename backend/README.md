# Secret Market Backend

This folder is the backend-ready layer for the SPA prototype.

## Run

```powershell
npm run start:api
```

Default API URL: `http://127.0.0.1:4174/api/health`

`GET /api/health` returns deployment metadata such as API version, environment, storage mode, CORS origins, reset availability and rate-limit settings.

`GET /api/ready` returns readiness metadata for hosting checks: required collections, storage mode, collection counts and production deployment issues. It returns `503` if a required collection is missing or production settings are unsafe.

The server also supports direct Node startup:

```powershell
node backend/server.js
```

When started directly, the API reads `.env` from the repository root if the file exists. Existing environment variables always win over `.env` values.

## Deploy

Hosting platforms usually provide `PORT` automatically. Set `HOST=0.0.0.0` for a public web service and point `SECMARKET_DB_FILE` at persistent storage.

Recommended environment variables:

- `HOST=0.0.0.0`
- `PORT=<provided by host>`
- `SECMARKET_DB_FILE=/data/secmarket-db.json`
- `SECMARKET_ALLOWED_ORIGINS=https://penisxxxl.github.io,http://127.0.0.1:4173`
- `SECMARKET_ALLOW_RESET=false`
- `SECMARKET_RATE_LIMIT_MAX=240`
- `SECMARKET_RATE_LIMIT_WINDOW_MS=60000`

`render.yaml` is included as a starter Render blueprint with a persistent disk mounted at `/data`.

Use `.env.example` from the repository root as the local template. Real `.env` files are ignored by git.

After the API is deployed, add a GitHub repository variable named `SECMARKET_PUBLIC_API_URL`:

```text
SECMARKET_PUBLIC_API_URL=https://your-api-host.example.com
```

The Pages workflow writes that value into `dist/config.js`. The frontend still falls back to `http://127.0.0.1:4174` when `apiBaseUrl` is empty.

## Storage

The prototype API now uses a file-backed JSON store instead of only in-memory data.

- Default database file: `data/secmarket-db.json`
- Override path: `SECMARKET_DB_FILE=C:\path\to\db.json`
- Test TRC20 master wallet: `TYJmyeYEVHpF2CEZTXheWp1kM6zVUoeWsB`
- Reset demo data: `POST /api/reset`

This is still a lightweight MVP store, but orders, payments, disputes, withdrawals and moderation changes now survive server restarts.

Set `SECMARKET_ALLOW_RESET=false` for any public deployment. The reset route stays enabled by default only to keep local demo development fast.

When `NODE_ENV=production`, reset is disabled by default even if `SECMARKET_ALLOW_RESET` is missing. Keeping `SECMARKET_ALLOW_RESET=false` in the host environment still makes the public setting explicit in `GET /api/health`.

In production, `GET /api/ready` also reports `deploymentIssues` and blocks readiness when CORS is open to `*`, reset is enabled, storage is not configured or rate limiting is disabled.

## Resources

- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/health`
- `GET /api/ready`
- `GET /api/auth/session`
- `POST /api/auth/logout`
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products`
- `PATCH /api/products/:id`
- `PATCH /api/products/:id/status`
- `GET /api/orders`
- `GET /api/payments`
- `POST /api/payments/:id/sync`
- `POST /api/orders/:id/deliver`
- `POST /api/orders/:id/confirm`
- `GET /api/ledger`
- `GET /api/withdrawals/balance`
- `POST /api/withdrawals`
- `POST /api/withdrawals/:id/settle`
- `GET /api/disputes`
- `GET /api/tickets`
- `GET /api/withdrawals`
- `GET /api/moderation`
- `GET /api/audit`
- `GET /api/snapshot`
- `POST /api/reset`

The API allows CORS for local frontend development. By default it accepts all origins for the prototype. Set `SECMARKET_ALLOWED_ORIGINS` to a comma-separated list before public deployment, for example `https://penisxxxl.github.io,http://127.0.0.1:4173`.

## Auth Notes

Auth is demo-level but now password-gated: `POST /api/auth/login` accepts an active demo user email, role and password, verifies the stored PBKDF2 hash, then returns a bearer token stored in the JSON database. Demo users use `password` as the password. Existing local JSON databases without `passwordHash` remain accepted so old demo data is not locked out.

`POST /api/auth/register` accepts nickname, email, password, Telegram username and role (`buyer` or `seller`). The backend hashes the password immediately and never sends the plaintext password to Telegram. Telegram registration notifications use `SECMARKET_TELEGRAM_BOT_TOKEN` and `SECMARKET_TELEGRAM_REGISTRATION_CHAT_ID`; the default chat id is `7391093210`.

`POST /api/tickets` creates a support ticket for an authenticated buyer/seller/admin and sends a Telegram notification to the same configured chat. The notification includes ticket id, topic, linked order, contact, user id, status and description.

## Role Guards

- Public: `GET /api/products`
- Buyer/seller/admin: orders, payments, disputes and tickets
- Seller/admin: product creation and edits
- Admin: users, sessions, moderation and audit
- Seller/admin: withdrawals
- Owner-level filters: buyers and sellers only see their own orders, payments, disputes and tickets; admins see all records.

## Payment Watcher

`POST /api/payments/:id/sync` is an admin-only mock watcher. It accepts optional `txHash` and `confirmations`, applies network confirmation rules, marks the payment as paid when ready, and updates the linked order payment status.

## Fees

Orders store the item price in `amount`. Payments store the buyer total in `amount`: item price plus the 2% buyer service fee. When an order is confirmed, escrow posts only `sellerNet` to the seller ledger after the 4% seller fee. The shared fee model keeps a 6% total platform fee with a 0.20 USDT minimum and stores `itemAmount`, `buyerFee`, `sellerFee`, `platformFeeTotal`, `buyerTotal`, `sellerNet`, `feeRateBuyer` and `feeRateSeller` on new orders, payments and release ledger entries.

## Auto Delivery

`POST /api/orders/:id/deliver` issues an auto-delivery secret for paid auto-delivery products, links it to the order, moves the order to `awaiting_buyer`, decrements product stock and stays idempotent if called twice. New delivery secrets are stored encrypted with AES-256-GCM in `secretEncrypted`; the API reveals the decrypted `secret` only through authorized delivery responses. Set `SECMARKET_SECRET_KEY` to at least 32 characters before production.

## Escrow Release

`POST /api/orders/:id/confirm` confirms receipt, completes the order, releases escrow, and posts an `escrow_release` ledger entry for the seller. Sellers cannot confirm their own orders on behalf of buyers.

## Withdrawals

`GET /api/withdrawals/balance` returns the seller's available balance after posted ledger entries and active withdrawal reservations. `POST /api/withdrawals` lets a seller request a payout only within that available balance; new requests start in `review` for admin approval.

## Internal Balance

`GET /api/balance` returns the current, available and frozen user balance. `POST /api/deposit` creates a pending deposit with an idempotency key, and admin approval credits it once. `POST /api/withdraw` creates a pending withdrawal and freezes the amount immediately; admin rejection releases the frozen amount, while approval completes the withdrawal. Admin routes are `POST /api/admin/transactions/:id/approve`, `POST /api/admin/transactions/:id/reject` and `POST /api/admin/users/:id/balance-adjustment`.

## Payout Settlement

`POST /api/withdrawals/:id/settle` is admin-only. It writes the payout transaction id, moves the withdrawal through `processing`, `sent`, `completed` or `rejected`, and posts a negative `payout` ledger entry when the withdrawal is completed. Repeated completed settlements are idempotent and do not double-post the payout.

## Evidence Storage

`POST /api/evidence` accepts authenticated evidence uploads for `ticket`, `dispute` and `order` targets. The API validates ownership, stores the file under `SECMARKET_EVIDENCE_DIR` or `data/evidence`, and writes only metadata to the JSON store: file name, MIME type, size, SHA-256, storage key and target link. Buyers and sellers see only evidence linked to their own tickets, disputes or orders; admins can review all evidence.

## Next Backend Work

- Move the JSON store to SQLite/PostgreSQL when auth and payment workers are ready.
- Add registration, password reset and 2FA.
- Move evidence storage from local disk to Supabase Storage or S3 before scaling beyond one backend instance.
- Replace the mock payment watcher with real TRC20, TON and BEP20 workers.
- Add backup automation, monitoring alerts and refund tooling for operations.
- Add payout batching, risk review notes and withdrawal export for admins.
