const RESERVED_WITHDRAWAL_STATUSES = ["review", "processing", "sent"];
const SETTLEMENT_STATUSES = ["processing", "sent", "completed", "rejected"];
const BATCHABLE_WITHDRAWAL_STATUSES = ["review", "processing"];

function money(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function normalizeStatusList(statuses) {
  const source = Array.isArray(statuses)
    ? statuses
    : String(statuses || "").split(",");
  const normalized = source.map((status) => String(status || "").trim()).filter(Boolean);
  return normalized.length ? normalized : BATCHABLE_WITHDRAWAL_STATUSES;
}

function csvValue(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

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

function withdrawalBatchRows(store, filters = {}) {
  const statuses = normalizeStatusList(filters.statuses);
  const ids = Array.isArray(filters.ids)
    ? new Set(filters.ids.map((id) => String(id).toLowerCase()))
    : null;

  return store.list("withdrawals")
    .filter((withdrawal) => {
      if (ids && !ids.has(String(withdrawal.id).toLowerCase())) return false;
      return statuses.includes(withdrawal.status);
    })
    .sort((left, right) => String(left.createdAt || "").localeCompare(String(right.createdAt || "")))
    .map((withdrawal) => ({
      id: withdrawal.id,
      sellerId: withdrawal.sellerId,
      grossAmount: money(withdrawal.grossAmount || withdrawal.amount),
      networkFee: money(withdrawal.networkFee || 0),
      netAmount: money(withdrawal.netAmount || Math.max(Number(withdrawal.grossAmount || withdrawal.amount || 0) - Number(withdrawal.networkFee || 0), 0)),
      coin: withdrawal.coin || "USDT",
      network: withdrawal.network || "TRC20",
      address: withdrawal.address || "",
      status: withdrawal.status,
      batchId: withdrawal.batchId || "",
      riskNote: withdrawal.riskNote || "",
      createdAt: withdrawal.createdAt || "",
    }));
}

function withdrawalBatchCsv(store, filters = {}) {
  const rows = withdrawalBatchRows(store, filters);
  const header = ["id", "sellerId", "grossAmount", "networkFee", "netAmount", "coin", "network", "address", "status", "batchId", "createdAt"];
  return [
    header.join(","),
    ...rows.map((row) => header.map((key) => csvValue(row[key])).join(",")),
  ].join("\n");
}

function createWithdrawalBatch(store, payload = {}, options = {}) {
  const rows = withdrawalBatchRows(store, {
    ids: payload.ids,
    statuses: payload.statuses || BATCHABLE_WITHDRAWAL_STATUSES,
  }).filter((row) => !row.batchId);

  if (!rows.length) return { error: "no_withdrawals_for_batch" };

  const now = new Date().toISOString();
  const batch = store.create("payoutBatches", {
    id: payload.id || `PB-${Date.now()}`,
    withdrawalIds: rows.map((row) => row.id),
    withdrawalCount: rows.length,
    totalGross: money(rows.reduce((sum, row) => sum + row.grossAmount, 0)),
    totalNetworkFee: money(rows.reduce((sum, row) => sum + row.networkFee, 0)),
    totalNet: money(rows.reduce((sum, row) => sum + row.netAmount, 0)),
    coin: payload.coin || "USDT",
    status: payload.status || "exported",
    createdBy: options.actorId || payload.actorId || "system",
    exportedAt: now,
    _actorId: options.actorId || payload.actorId || "system",
  });

  const withdrawals = rows.map((row) => store.patch("withdrawals", row.id, {
    status: row.status === "review" ? "processing" : row.status,
    batchId: batch.id,
    batchedAt: now,
    _actorId: options.actorId || payload.actorId || "system",
  }));

  return {
    batch,
    withdrawals,
    csv: withdrawalBatchCsv(store, { ids: rows.map((row) => row.id), statuses: ["processing"] }),
  };
}

function settleWithdrawal(store, withdrawalId, payload = {}, options = {}) {
  const withdrawal = store.find("withdrawals", withdrawalId);
  if (!withdrawal) return { error: "withdrawal_not_found" };

  const nextStatus = payload.status || "completed";
  if (!SETTLEMENT_STATUSES.includes(nextStatus)) return { error: "invalid_status" };
  if ((nextStatus === "sent" || nextStatus === "completed") && !payload.txHash && !withdrawal.txHash) {
    return { error: "transaction_id_required" };
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
  createWithdrawalBatch,
  requestWithdrawal,
  settleWithdrawal,
  sellerAvailableBalance,
  sellerLedgerCredits,
  sellerReservedWithdrawals,
  withdrawalBatchCsv,
  withdrawalBatchRows,
};
