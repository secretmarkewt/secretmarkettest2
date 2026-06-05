const now = "2026-06-05T09:00:00.000Z";

const seed = {
  users: [
    { id: "usr-buyer", role: "buyer", name: "Artem", email: "buyer@example.com", telegram: "@buyer", status: "active", createdAt: now },
    { id: "usr-seller", role: "seller", name: "PixelTrade", email: "seller@example.com", telegram: "@pixeltrade", status: "active", createdAt: now },
    { id: "usr-admin", role: "admin", name: "SupportOne", email: "support@example.com", telegram: "@support", status: "active", createdAt: now },
  ],
  products: [
    { id: 12345, sellerId: "usr-seller", title: "Robux 10 000", category: "roblox", price: 88.3, stock: 42, deliveryType: "auto", moderationStatus: "published", status: "published", createdAt: now },
    { id: 22341, sellerId: "usr-seller", title: "Steam Gift Card 50", category: "steam", price: 50, stock: 18, deliveryType: "auto", moderationStatus: "published", status: "published", createdAt: now },
    { id: 33412, sellerId: "usr-seller", title: "Telegram Premium 12 мес", category: "telegram", price: 36.9, stock: 25, deliveryType: "manual", moderationStatus: "moderation", status: "moderation", createdAt: now },
  ],
  orders: [
    { id: 12345, buyerId: "usr-buyer", sellerId: "usr-seller", productId: 12345, amount: 88.3, paymentStatus: "paid", orderStatus: "awaiting_buyer", escrowStatus: "hold", status: "awaiting_buyer", createdAt: now },
    { id: 22341, buyerId: "usr-buyer", sellerId: "usr-seller", productId: 22341, amount: 50, paymentStatus: "paid", orderStatus: "completed", escrowStatus: "released", status: "completed", createdAt: now },
  ],
  payments: [
    { id: "pay-12345", orderId: 12345, amount: 88.3, coin: "USDT", network: "TRC20", address: "TX9a...F2Lm", txHash: "TXHASH-12345", confirmations: 22, status: "paid", createdAt: now },
    { id: "pay-22341", orderId: 22341, amount: 50, coin: "USDT", network: "BEP20", address: "0x49...A12", txHash: "0xabc12345", confirmations: 14, status: "paid", createdAt: now },
  ],
  disputes: [
    { id: 123, orderId: 12345, buyerId: "usr-buyer", sellerId: "usr-seller", reason: "Код не активируется", evidence: [], decision: "", refundAmount: 0, status: "waiting_support", createdAt: now },
  ],
  tickets: [
    { id: "SUP-104", orderId: 12345, userId: "usr-buyer", topic: "Оплата не нашлась", messages: [], status: "open", createdAt: now },
  ],
  withdrawals: [
    { id: "WD-120", sellerId: "usr-seller", amount: 320.5, coin: "USDT", network: "TRC20", address: "TX7p...D90", txHash: "", status: "review", riskNote: "Проверить адрес", createdAt: now },
  ],
  moderation: [
    { id: "MOD-1", type: "product", targetId: 33412, title: "Telegram Premium 12 мес", status: "queued", createdAt: now },
  ],
};

module.exports = { seed };
