const { calculateCommission } = require("../fees");
const { balanceForUser } = require("./balanceService");

function money(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function existingRefund(store, orderId) {
  return store.list("transactions").find((transaction) => (
    transaction.type === "adjustment" &&
    transaction.status === "completed" &&
    String(transaction.details?.refundOrderId || "") === String(orderId)
  )) || null;
}

function refundOrder(store, orderId, payload = {}, options = {}) {
  const order = store.find("orders", orderId);
  if (!order) return { error: "order_not_found" };
  if (order.status === "refunded" || order.escrowStatus === "refunded") {
    return { order, alreadyRefunded: true, balance: balanceForUser(store, order.buyerId) };
  }
  if (order.paymentStatus !== "paid") return { error: "payment_not_paid" };

  const priorRefund = existingRefund(store, order.id);
  if (priorRefund) {
    return { order, transaction: priorRefund, alreadyRefunded: true, balance: balanceForUser(store, order.buyerId) };
  }

  const fees = calculateCommission(order.itemAmount ?? order.amount ?? 0);
  const maxRefund = money(order.buyerTotal || fees.buyerTotal || order.amount || 0);
  const requested = payload.refundAmount ?? payload.amount ?? maxRefund;
  const refundAmount = money(requested);
  if (!(refundAmount > 0)) return { error: "refund_amount_required" };
  if (refundAmount > maxRefund) return { error: "refund_amount_too_high", maxRefund };

  const actorId = options.actorId || payload.actorId || "system";
  const buyer = store.find("users", order.buyerId);
  if (!buyer) return { error: "buyer_not_found" };

  const updatedBuyer = store.patch("users", buyer.id, {
    balance: money((buyer.balance || 0) + refundAmount),
    _actorId: actorId,
  });
  const transaction = store.create("transactions", {
    userId: buyer.id,
    type: "adjustment",
    amount: refundAmount,
    status: "completed",
    paymentMethod: "refund",
    details: {
      refundOrderId: order.id,
      reason: payload.reason || "order refund",
    },
    idempotencyKey: `refund-${order.id}`,
    _actorId: actorId,
  });
  const ledgerEntry = store.create("ledger", {
    orderId: order.id,
    buyerId: order.buyerId,
    sellerId: order.sellerId,
    amount: -refundAmount,
    coin: "USDT",
    type: "refund",
    status: "posted",
    note: payload.reason || "order refund",
    _actorId: actorId,
  });
  const updatedOrder = store.patch("orders", order.id, {
    orderStatus: "refunded",
    status: "refunded",
    escrowStatus: "refunded",
    refundAmount,
    refundedAt: new Date().toISOString(),
    _actorId: actorId,
  });

  let dispute = null;
  const disputeId = payload.disputeId || store.list("disputes").find((item) => String(item.orderId) === String(order.id))?.id;
  if (disputeId) {
    dispute = store.patch("disputes", disputeId, {
      status: refundAmount >= maxRefund ? "resolved_buyer" : "partial_refund",
      decision: payload.reason || "refund completed",
      refundAmount,
      _actorId: actorId,
    });
  }

  return {
    balance: balanceForUser(store, order.buyerId),
    buyer: updatedBuyer,
    dispute,
    ledgerEntry,
    order: updatedOrder,
    transaction,
  };
}

module.exports = { refundOrder };
