const { decryptSecret, encryptSecret, maskSecret } = require("./cryptoVault");

function deliveryCode(order, product) {
  return `AUTO-${String(product.category || "ITEM").toUpperCase()}-${order.id}-${Date.now().toString(36).toUpperCase()}`;
}

function normalizeDeliverySecrets(payload = {}) {
  const secrets = Array.isArray(payload.deliverySecrets)
    ? payload.deliverySecrets
    : String(payload.deliverySecrets || "").split(/\r?\n/);
  const cleanSecrets = secrets.map((secret) => String(secret || "").trim()).filter(Boolean);
  const { deliverySecrets, ...cleanPayload } = payload;
  if (!cleanSecrets.length) return cleanPayload;
  return {
    ...cleanPayload,
    deliverySecretsEncrypted: cleanSecrets.map(encryptSecret),
    deliverySecretsCount: cleanSecrets.length,
    stock: Math.max(Number(cleanPayload.stock || 0), cleanSecrets.length),
  };
}

function sanitizeProduct(product) {
  if (!product) return null;
  const { deliverySecrets, deliverySecretsEncrypted, ...safeProduct } = product;
  const count = Array.isArray(deliverySecretsEncrypted)
    ? deliverySecretsEncrypted.length
    : Number(product.deliverySecretsCount || 0);
  return {
    ...safeProduct,
    deliverySecretsCount: count,
  };
}

function revealDelivery(delivery) {
  if (!delivery) return null;
  const encrypted = delivery.secretEncrypted || delivery.secret || "";
  const secret = decryptSecret(encrypted);
  return {
    ...delivery,
    secret,
    secretMasked: maskSecret(encrypted),
  };
}

function issueDelivery(store, orderId, options = {}) {
  const order = store.find("orders", orderId);
  if (!order) return { error: "order_not_found" };
  if (order.paymentStatus !== "paid") return { error: "payment_not_paid" };

  const product = store.find("products", order.productId);
  if (!product) return { error: "product_not_found" };
  if (product.deliveryType !== "auto") return { error: "manual_delivery_required" };
  if (Number(product.stock || 0) <= 0) return { error: "out_of_stock" };

  const existing = store.list("deliveries").find((item) => String(item.orderId) === String(order.id));
  if (existing) return { delivery: revealDelivery(existing), order, product: sanitizeProduct(product), alreadyIssued: true };

  const inventory = Array.isArray(product.deliverySecretsEncrypted) ? product.deliverySecretsEncrypted : [];
  const encryptedInventorySecret = inventory[0] || "";
  const secret = options.secret || (encryptedInventorySecret ? decryptSecret(encryptedInventorySecret) : deliveryCode(order, product));

  const delivery = store.create("deliveries", {
    orderId: order.id,
    productId: product.id,
    sellerId: order.sellerId,
    buyerId: order.buyerId,
    deliveryType: "auto",
    secretEncrypted: encryptSecret(secret),
    secretMasked: maskSecret(secret),
    status: "issued",
    _actorId: options.actorId || "system",
  });

  const updatedProduct = store.patch("products", product.id, {
    stock: Math.max(Number(product.stock || 0) - 1, 0),
    deliverySecretsEncrypted: inventory.length ? inventory.slice(1) : product.deliverySecretsEncrypted,
    deliverySecretsCount: inventory.length ? inventory.length - 1 : Number(product.deliverySecretsCount || 0),
    _actorId: options.actorId || "system",
  });

  const updatedOrder = store.patch("orders", order.id, {
    orderStatus: "awaiting_buyer",
    status: "awaiting_buyer",
    deliveryId: delivery.id,
    _actorId: options.actorId || "system",
  });

  return { delivery: revealDelivery(delivery), order: updatedOrder, product: sanitizeProduct(updatedProduct), alreadyIssued: false };
}

module.exports = { issueDelivery, normalizeDeliverySecrets, revealDelivery, sanitizeProduct };
