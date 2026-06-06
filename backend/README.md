# SecMarket Backend Skeleton

This folder is the backend-ready layer for the SPA prototype.

## Run

```powershell
node backend/server.js
```

Default API URL: `http://127.0.0.1:4174/api/health`

## Storage

The prototype API now uses a file-backed JSON store instead of only in-memory data.

- Default database file: `data/secmarket-db.json`
- Override path: `SECMARKET_DB_FILE=C:\path\to\db.json`
- Test TRC20 master wallet: `TYJmyeYEVHpF2CEZTXheWp1kM6zVUoeWsB`
- Reset demo data: `POST /api/reset`

This is still a lightweight MVP store, but orders, payments, disputes, withdrawals and moderation changes now survive server restarts.

## Resources

- `POST /api/auth/login`
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

The API allows CORS for local frontend development, so the static SPA can call `http://127.0.0.1:4174/api/*` directly while the frontend server runs on `4173`.

## Auth Notes

Auth is demo-level for now: `POST /api/auth/login` accepts an active demo user email and role, then returns a bearer token stored in the JSON database. This creates the backend contract for sessions before adding password hashing and 2FA.

## Role Guards

- Public: `GET /api/products`
- Buyer/seller/admin: orders, payments, disputes and tickets
- Seller/admin: product creation and edits
- Admin: users, sessions, moderation and audit
- Seller/admin: withdrawals
- Owner-level filters: buyers and sellers only see their own orders, payments, disputes and tickets; admins see all records.

## Payment Watcher

`POST /api/payments/:id/sync` is an admin-only mock watcher. It accepts optional `txHash` and `confirmations`, applies network confirmation rules, marks the payment as paid when ready, and updates the linked order payment status.

## Auto Delivery

`POST /api/orders/:id/deliver` issues an auto-delivery secret for paid auto-delivery products, links it to the order, moves the order to `awaiting_buyer`, decrements product stock and stays idempotent if called twice.

## Escrow Release

`POST /api/orders/:id/confirm` confirms receipt, completes the order, releases escrow, and posts an `escrow_release` ledger entry for the seller. Sellers cannot confirm their own orders on behalf of buyers.

## Withdrawals

`GET /api/withdrawals/balance` returns the seller's available balance after posted ledger entries and active withdrawal reservations. `POST /api/withdrawals` lets a seller request a payout only within that available balance; new requests start in `review` for admin approval.

## Payout Settlement

`POST /api/withdrawals/:id/settle` is admin-only. It writes the payout tx hash, moves the withdrawal through `processing`, `sent`, `completed` or `rejected`, and posts a negative `payout` ledger entry when the withdrawal is completed. Repeated completed settlements are idempotent and do not double-post the payout.

## Next Backend Work

- Move the JSON store to SQLite/PostgreSQL when auth and payment workers are ready.
- Add password hashing and 2FA.
- Add file storage for dispute evidence and ticket attachments.
- Replace the mock payment watcher with real TRC20, TON and BEP20 workers.
- Encrypt auto-delivery secrets before moving from JSON storage to production storage.
- Add payout batching, risk review notes and withdrawal export for admins.
