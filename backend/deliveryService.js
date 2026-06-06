function deliveryCode(order, product) {
  return `AUTO-${String(product.category || "ITEM").toUpperCase()}-${order.id}-${Date.now().toString(36).toUpperCase()}`;
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
  if (existing) return { delivery: existing, order, product, alreadyIssued: true };

  const delivery = store.create("deliveries", {
    orderId: order.id,
    productId: product.id,
    sellerId: order.sellerId,
    buyerId: order.buyerId,
    deliveryType: "auto",
    secret: options.secret || deliveryCode(order, product),
    status: "issued",
    _actorId: options.actorId || "system",
  });

  const updatedProduct = store.patch("products", product.id, {
    stock: Math.max(Number(product.stock || 0) - 1, 0),
    _actorId: options.actorId || "system",
  });

  const updatedOrder = store.patch("orders", order.id, {
    orderStatus: "awaiting_buyer",
    status: "awaiting_buyer",
    deliveryId: delivery.id,
    _actorId: options.actorId || "system",
  });

  return { delivery, order: updatedOrder, product: updatedProduct, alreadyIssued: false };
}

module.exports = { issueDelivery };
