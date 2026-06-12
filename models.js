const SECMARKET_MODELS = {
  User: {
    fields: ["id", "role", "email", "telegram", "promoCode", "twoFactorEnabled", "status", "createdAt"],
    statuses: ["active", "limited", "blocked"],
    roles: ["guest", "buyer", "seller", "admin"],
  },
  Session: {
    fields: ["id", "userId", "role", "token", "status", "expiresAt", "createdAt"],
    statuses: ["active", "revoked", "expired"],
  },
  Product: {
    fields: ["id", "sellerId", "title", "category", "price", "stock", "deliveryType", "moderationStatus", "createdAt"],
    statuses: ["draft", "moderation", "published", "paused", "blocked"],
    deliveryTypes: ["auto", "manual"],
  },
  Order: {
    fields: ["id", "buyerId", "sellerId", "productId", "amount", "paymentStatus", "orderStatus", "escrowStatus", "createdAt"],
    statuses: ["created", "awaiting_payment", "paid", "in_progress", "awaiting_buyer", "completed", "dispute", "refunded", "cancelled"],
  },
  Payment: {
    fields: ["id", "orderId", "amount", "coin", "network", "address", "txHash", "confirmations", "status", "createdAt"],
    statuses: ["waiting", "found", "confirming", "paid", "underpaid", "expired", "network_error"],
    networks: ["TRC20", "TON", "BEP20"],
  },
  Delivery: {
    fields: ["id", "orderId", "productId", "sellerId", "buyerId", "deliveryType", "secret", "status", "createdAt"],
    statuses: ["created", "issued", "viewed", "revoked"],
  },
  LedgerEntry: {
    fields: ["id", "orderId", "sellerId", "buyerId", "amount", "coin", "type", "status", "createdAt"],
    types: ["escrow_release", "refund", "payout"],
  },
  Chat: {
    fields: ["id", "orderId", "participants", "messages", "files", "createdAt"],
    messageTypes: ["user", "seller", "support", "system"],
  },
  Dispute: {
    fields: ["id", "orderId", "buyerId", "sellerId", "reason", "evidence", "decision", "refundAmount", "status", "createdAt"],
    statuses: ["open", "waiting_support", "need_more_data", "resolved_buyer", "resolved_seller", "partial_refund", "closed"],
  },
  Withdrawal: {
    fields: ["id", "sellerId", "amount", "coin", "network", "address", "txHash", "status", "riskNote", "createdAt"],
    statuses: ["created", "review", "processing", "sent", "completed", "rejected"],
  },
  AuditLog: {
    fields: ["id", "actorId", "action", "resource", "itemId", "details", "createdAt"],
    actions: ["create", "patch", "reset", "seed"],
  },
};

function requiredFieldsFor(modelName) {
  return SECMARKET_MODELS[modelName]?.fields || [];
}

function validateEntity(modelName, entity) {
  const fields = requiredFieldsFor(modelName);
  const missing = fields.filter((fieldName) => !(fieldName in entity));
  return {
    ok: missing.length === 0,
    missing,
  };
}

window.SECMARKET_MODELS = SECMARKET_MODELS;
window.SECMARKET_MODEL_HELPERS = {
  requiredFieldsFor,
  validateEntity,
};
