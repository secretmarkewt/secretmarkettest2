const REQUIRED_CONFIRMATIONS = {
  TRC20: 3,
  TON: 1,
  BEP20: 12,
};

function requiredConfirmations(network) {
  return REQUIRED_CONFIRMATIONS[network] || 3;
}

function nextPaymentState(payment, payload = {}) {
  const required = requiredConfirmations(payment.network);
  const txHash = payload.txHash || payment.txHash || `mock-${String(payment.network || "chain").toLowerCase()}-${payment.orderId}`;
  const confirmations = Math.max(Number(payload.confirmations ?? payment.confirmations ?? 0), required);
  const status = confirmations >= required ? "paid" : "confirming";

  return {
    confirmations,
    status,
    txHash,
    watcher: "mock",
    watchedAt: new Date().toISOString(),
  };
}

function syncPayment(store, paymentId, options = {}) {
  const payment = store.find("payments", paymentId);
  if (!payment) return null;

  const paymentPatch = nextPaymentState(payment, options.payload);
  const updatedPayment = store.patch("payments", payment.id, {
    ...paymentPatch,
    _actorId: options.actorId || "system",
  });

  let updatedOrder = null;
  if (updatedPayment.status === "paid" && updatedPayment.orderId) {
    const order = store.find("orders", updatedPayment.orderId);
    if (order) {
      const nextOrderStatus = ["created", "awaiting_payment"].includes(order.status) ? "paid" : order.status;
      updatedOrder = store.patch("orders", order.id, {
        paymentStatus: "paid",
        orderStatus: nextOrderStatus,
        status: nextOrderStatus,
        escrowStatus: order.escrowStatus || "hold",
        _actorId: options.actorId || "system",
      });
    }
  }

  return {
    payment: updatedPayment,
    order: updatedOrder,
    requiredConfirmations: requiredConfirmations(updatedPayment.network),
  };
}

module.exports = { REQUIRED_CONFIRMATIONS, syncPayment };
