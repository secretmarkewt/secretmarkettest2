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
  const manualStatus = String(payload.status || "").trim();
  const confirmations = manualStatus
    ? Math.max(Number(payload.confirmations ?? payment.confirmations ?? 0), 0)
    : Math.max(Number(payload.confirmations ?? payment.confirmations ?? 0), required);
  const status = manualStatus || (confirmations >= required ? "paid" : "confirming");

  return {
    adminNote: payload.adminNote || payment.adminNote || "",
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
  if (updatedPayment.orderId) {
    const order = store.find("orders", updatedPayment.orderId);
    if (order && updatedPayment.status === "paid") {
      const nextOrderStatus = ["created", "awaiting_payment"].includes(order.status) ? "paid" : order.status;
      updatedOrder = store.patch("orders", order.id, {
        paymentStatus: "paid",
        orderStatus: nextOrderStatus,
        status: nextOrderStatus,
        escrowStatus: order.escrowStatus || "hold",
        _actorId: options.actorId || "system",
      });
    } else if (order && ["underpaid", "network_error"].includes(updatedPayment.status)) {
      updatedOrder = store.patch("orders", order.id, {
        paymentStatus: updatedPayment.status,
        orderStatus: "awaiting_payment",
        status: "awaiting_payment",
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
