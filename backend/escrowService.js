const { calculateCommission } = require("../fees");

function sellerLedgerTotal(store, sellerId) {
  return store.list("ledger")
    .filter((entry) => entry.sellerId === sellerId && entry.status === "posted")
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
}

function confirmOrder(store, orderId, options = {}) {
  const order = store.find("orders", orderId);
  if (!order) return { error: "order_not_found" };
  const fees = calculateCommission(order.itemAmount ?? order.amount ?? 0);
  if (order.status === "completed" && order.escrowStatus === "released") {
    return { order, ledgerEntry: null, alreadyConfirmed: true, sellerAvailableBalance: sellerLedgerTotal(store, order.sellerId) };
  }
  if (order.paymentStatus !== "paid") return { error: "payment_not_paid" };
  if (order.status === "dispute") return { error: "order_in_dispute" };
  if (!["awaiting_buyer", "paid", "in_progress"].includes(order.status)) return { error: "order_not_ready" };

  const existingLedger = store.list("ledger").find((entry) => (
    String(entry.orderId) === String(order.id) &&
    entry.type === "escrow_release" &&
    entry.status === "posted"
  ));

  const ledgerEntry = existingLedger || store.create("ledger", {
    orderId: order.id,
    sellerId: order.sellerId,
    buyerId: order.buyerId,
    amount: fees.sellerNet,
    coin: "USDT",
    type: "escrow_release",
    status: "posted",
    ...fees,
    _actorId: options.actorId || "system",
  });

  const updatedOrder = store.patch("orders", order.id, {
    orderStatus: "completed",
    status: "completed",
    escrowStatus: "released",
    completedAt: new Date().toISOString(),
    _actorId: options.actorId || "system",
  });

  return {
    order: updatedOrder,
    ledgerEntry,
    alreadyConfirmed: Boolean(existingLedger),
    sellerAvailableBalance: sellerLedgerTotal(store, order.sellerId),
  };
}

module.exports = { confirmOrder, sellerLedgerTotal };
