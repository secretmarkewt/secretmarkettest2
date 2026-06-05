# SecMarket Backend Skeleton

This folder is the backend-ready layer for the SPA prototype.

## Run

```powershell
node backend/server.js
```

Default API URL: `http://127.0.0.1:4174/api/health`

## Resources

- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products`
- `PATCH /api/products/:id`
- `PATCH /api/products/:id/status`
- `GET /api/orders`
- `GET /api/payments`
- `GET /api/disputes`
- `GET /api/tickets`
- `GET /api/withdrawals`
- `GET /api/moderation`
- `GET /api/snapshot`
- `POST /api/reset`

## Next Backend Work

- Replace in-memory repository with SQLite/PostgreSQL.
- Add password hashing, sessions, 2FA and role middleware.
- Add file storage for dispute evidence and ticket attachments.
- Add payment watcher workers for TRC20, TON and BEP20 confirmations.
- Add audit log for admin status changes and payout approvals.
