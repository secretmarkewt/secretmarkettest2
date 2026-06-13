const models = {
  User: { collection: "users", statuses: ["active", "limited", "blocked"] },
  Session: { collection: "sessions", statuses: ["active", "revoked", "expired"] },
  Product: { collection: "products", statuses: ["draft", "moderation", "published", "paused", "blocked"] },
  Order: { collection: "orders", statuses: ["created", "awaiting_payment", "paid", "in_progress", "awaiting_buyer", "completed", "dispute", "refunded", "cancelled"] },
  Payment: { collection: "payments", statuses: ["waiting", "found", "confirming", "paid", "underpaid", "expired", "network_error"] },
  Delivery: { collection: "deliveries", statuses: ["created", "issued", "viewed", "revoked"] },
  Evidence: { collection: "evidence", statuses: ["stored", "linked", "archived", "deleted"] },
  LedgerEntry: { collection: "ledger", statuses: ["posted", "void"] },
  Dispute: { collection: "disputes", statuses: ["open", "waiting_support", "need_more_data", "resolved_buyer", "resolved_seller", "partial_refund", "closed"] },
  Ticket: { collection: "tickets", statuses: ["open", "waiting_user", "waiting_support", "resolved", "closed"] },
  Withdrawal: { collection: "withdrawals", statuses: ["created", "review", "processing", "sent", "completed", "rejected"] },
  Transaction: { collection: "transactions", statuses: ["pending", "completed", "rejected", "failed"] },
  Moderation: { collection: "moderation", statuses: ["queued", "approved", "rejected", "blocked"] },
  AuditLog: { collection: "audit", statuses: [] },
};

const resourceModels = {
  users: "User",
  sessions: "Session",
  products: "Product",
  orders: "Order",
  payments: "Payment",
  deliveries: "Delivery",
  evidence: "Evidence",
  ledger: "LedgerEntry",
  disputes: "Dispute",
  tickets: "Ticket",
  withdrawals: "Withdrawal",
  transactions: "Transaction",
  moderation: "Moderation",
  audit: "AuditLog",
};

module.exports = { models, resourceModels };
