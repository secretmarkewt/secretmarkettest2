const RESERVED_WITHDRAWAL_STATUSES = ["review", "processing", "sent"];
const SETTLEMENT_STATUSES = ["processing", "sent", "completed", "rejected"];

function sellerReservedWithdrawals(store, sellerId) {
  return store.list("withdrawals")
    .filter((item) => item.sellerId === sellerId && RESERVED_WITHDRAWAL_STATUSES.includes(item.status))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

function sellerLedgerCredits(store, sellerId) {
  return store.list("ledger")
    .filter((entry) => entry.sellerId === sellerId && entry.status === "posted")
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
}

function sellerAvailableBalance(store, sellerId) {
  return Math.max(sellerLedgerCredits(store, sellerId) - sellerReservedWithdrawals(store, sellerId), 0);
}

function requestWithdrawal(store, payload, options = {}) {
  const sellerId = options.sellerId || payload.sellerId;
  if (!sellerId) return { error: "seller_required" };

  const amount = Number(payload.grossAmount || payload.amount || 0);
  if (!(amount > 0)) return { error: "amount_required" };
  const networkFee = Math.max(Number(payload.networkFee || 0), 0);
  const netAmount = Math.max(Number(payload.netAmount || (amount - networkFee)), 0);
  if (networkFee >= amount) return { error: "network_fee_too_high" };

  const available = sellerAvailableBalance(store, sellerId);
  if (amount > available) {
    return { error: "insufficient_balance", availableBalance: available };
  }

  const withdrawal = store.create("withdrawals", {
    sellerId,
    amount,
    grossAmount: amount,
    networkFee,
    netAmount,
    coin: payload.coin || "USDT",
    network: payload.network || "TRC20",
    address: payload.address || "",
    txHash: "",
    status: "review",
    riskNote: payload.riskNote || "seller requested withdrawal",
    _actorId: options.actorId || sellerId,
  });

  return {
    withdrawal,
    availableBalance: sellerAvailableBalance(store, sellerId),
  };
}

function existingPayout(store, withdrawalId) {
  return store.list("ledger").find((entry) => entry.withdrawalId === withdrawalId && entry.type === "payout") || null;
}

function settleWithdrawal(store, withdrawalId, payload = {}, options = {}) {
  const withdrawal = store.find("withdrawals", withdrawalId);
  if (!withdrawal) return { error: "withdrawal_not_found" };

  const nextStatus = payload.status || "completed";
  if (!SETTLEMENT_STATUSES.includes(nextStatus)) return { error: "invalid_status" };
  if ((nextStatus === "sent" || nextStatus === "completed") && !payload.txHash && !withdrawal.txHash) {
    return { error: "tx_hash_required" };
  }

  const actorId = options.actorId || payload.actorId || "system";
  const alreadyPaid = existingPayout(store, withdrawal.id);
  const shouldPostPayout = nextStatus === "completed" && !alreadyPaid;
  const settledAt = new Date().toISOString();
  const patch = {
    status: nextStatus,
    txHash: payload.txHash || withdrawal.txHash || "",
    riskNote: payload.riskNote || withdrawal.riskNote || "",
    processedAt: nextStatus === "processing" ? settledAt : withdrawal.processedAt,
    sentAt: nextStatus === "sent" ? settledAt : withdrawal.sentAt,
    completedAt: nextStatus === "completed" ? settledAt : withdrawal.completedAt,
    rejectedAt: nextStatus === "rejected" ? settledAt : withdrawal.rejectedAt,
    _actorId: actorId,
  };

  const updatedWithdrawal = store.patch("withdrawals", withdrawal.id, patch);
  const ledgerEntry = shouldPostPayout
    ? store.create("ledger", {
      sellerId: withdrawal.sellerId,
      withdrawalId: withdrawal.id,
      type: "payout",
      amount: -Math.abs(Number(withdrawal.amount || 0)),
      coin: withdrawal.coin || "USDT",
      status: "posted",
      note: `Payout ${payload.txHash || withdrawal.txHash}`,
      _actorId: actorId,
    })
    : alreadyPaid;

  return {
    withdrawal: updatedWithdrawal,
    ledgerEntry,
    alreadySettled: Boolean(alreadyPaid && nextStatus === "completed"),
    availableBalance: sellerAvailableBalance(store, withdrawal.sellerId),
  };
}

module.exports = {
  requestWithdrawal,
  settleWithdrawal,
  sellerAvailableBalance,
  sellerLedgerCredits,
  sellerReservedWithdrawals,
};
