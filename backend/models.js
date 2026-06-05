const models = {
  User: { collection: "users", statuses: ["active", "limited", "blocked"] },
  Product: { collection: "products", statuses: ["draft", "moderation", "published", "paused", "blocked"] },
  Order: { collection: "orders", statuses: ["created", "awaiting_payment", "paid", "in_progress", "awaiting_buyer", "completed", "dispute", "refunded", "cancelled"] },
  Payment: { collection: "payments", statuses: ["waiting", "found", "confirming", "paid", "underpaid", "expired", "network_error"] },
  Dispute: { collection: "disputes", statuses: ["open", "waiting_support", "need_more_data", "resolved_buyer", "resolved_seller", "partial_refund", "closed"] },
  Ticket: { collection: "tickets", statuses: ["open", "waiting_user", "waiting_support", "resolved", "closed"] },
  Withdrawal: { collection: "withdrawals", statuses: ["created", "review", "processing", "sent", "completed", "rejected"] },
  Moderation: { collection: "moderation", statuses: ["queued", "approved", "rejected", "blocked"] },
};

const resourceModels = {
  users: "User",
  products: "Product",
  orders: "Order",
  payments: "Payment",
  disputes: "Dispute",
  tickets: "Ticket",
  withdrawals: "Withdrawal",
  moderation: "Moderation",
};

module.exports = { models, resourceModels };
