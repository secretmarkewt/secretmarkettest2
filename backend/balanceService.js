const MIN_DEPOSIT_AMOUNT = Number(process.env.SECMARKET_MIN_DEPOSIT || 1);
const MIN_WITHDRAWAL_AMOUNT = Number(process.env.SECMARKET_MIN_WITHDRAWAL || 5);

function money(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function balanceForUser(store, userId) {
  const user = store.find("users", userId);
  if (!user) return { error: "user_not_found" };
  return {
    userId,
    balance: money(user.balance || 0),
    frozenBalance: money(user.frozenBalance || 0),
    availableBalance: money((user.balance || 0) - (user.frozenBalance || 0)),
    currency: "USDT",
    minDepositAmount: MIN_DEPOSIT_AMOUNT,
    minWithdrawalAmount: MIN_WITHDRAWAL_AMOUNT,
  };
}

function ownedTransactions(store, auth) {
  return store.list("transactions").filter((item) => auth.user.role === "admin" || item.userId === auth.user.id);
}

function createDeposit(store, userId, payload = {}) {
  const amount = money(payload.amount);
  if (!(amount >= MIN_DEPOSIT_AMOUNT)) return { error: "min_deposit", minAmount: MIN_DEPOSIT_AMOUNT };
  const idempotencyKey = String(payload.idempotencyKey || payload.idempotency_key || "").trim();
  if (!idempotencyKey) return { error: "idempotency_key_required" };
  const existing = store.list("transactions").find((item) => item.userId === userId && item.type === "deposit" && item.idempotencyKey === idempotencyKey);
  if (existing) return { transaction: existing, balance: balanceForUser(store, userId), idempotent: true };

  const transaction = store.create("transactions", {
    userId,
    type: "deposit",
    amount,
    status: "pending",
    paymentMethod: payload.paymentMethod || payload.payment_method || "USDT",
    details: payload.details || {},
    idempotencyKey,
    _actorId: userId,
  });
  return { transaction, balance: balanceForUser(store, userId) };
}

function createWithdrawal(store, userId, payload = {}) {
  const amount = money(payload.amount);
  if (!(amount >= MIN_WITHDRAWAL_AMOUNT)) return { error: "min_withdrawal", minAmount: MIN_WITHDRAWAL_AMOUNT };
  if (!String(payload.address || payload.details?.address || "").trim()) return { error: "address_required" };
  const idempotencyKey = String(payload.idempotencyKey || payload.idempotency_key || "").trim();
  if (!idempotencyKey) return { error: "idempotency_key_required" };
  const existing = store.list("transactions").find((item) => item.userId === userId && item.type === "withdrawal" && item.idempotencyKey === idempotencyKey);
  if (existing) return { transaction: existing, balance: balanceForUser(store, userId), idempotent: true };

  const balance = balanceForUser(store, userId);
  if (balance.error) return balance;
  if (amount > balance.availableBalance) return { error: "insufficient_balance", balance };

  const user = store.find("users", userId);
  store.patch("users", userId, { frozenBalance: money((user.frozenBalance || 0) + amount), _actorId: userId });
  const transaction = store.create("transactions", {
    userId,
    type: "withdrawal",
    amount,
    status: "pending",
    paymentMethod: payload.paymentMethod || payload.payment_method || "USDT",
    details: { address: payload.address || "", network: payload.network || "", ...(payload.details || {}) },
    idempotencyKey,
    _actorId: userId,
  });
  return { transaction, balance: balanceForUser(store, userId) };
}

function approveTransaction(store, transactionId, actorId = "system") {
  const transaction = store.find("transactions", transactionId);
  if (!transaction) return { error: "transaction_not_found" };
  if (transaction.status === "completed") return { transaction, balance: balanceForUser(store, transaction.userId), alreadyProcessed: true };
  if (transaction.status !== "pending") return { error: "transaction_not_pending" };
  const user = store.find("users", transaction.userId);
  if (!user) return { error: "user_not_found" };
  const amount = money(transaction.amount);

  if (transaction.type === "deposit" || transaction.type === "adjustment") {
    store.patch("users", user.id, { balance: money((user.balance || 0) + amount), _actorId: actorId });
  } else if (transaction.type === "withdrawal") {
    store.patch("users", user.id, {
      balance: money((user.balance || 0) - amount),
      frozenBalance: money(Math.max((user.frozenBalance || 0) - amount, 0)),
      _actorId: actorId,
    });
  }

  const updated = store.patch("transactions", transaction.id, {
    status: "completed",
    processedAt: new Date().toISOString(),
    _actorId: actorId,
  });
  return { transaction: updated, balance: balanceForUser(store, transaction.userId) };
}

function rejectTransaction(store, transactionId, actorId = "system", reason = "") {
  const transaction = store.find("transactions", transactionId);
  if (!transaction) return { error: "transaction_not_found" };
  if (transaction.status === "rejected") return { transaction, balance: balanceForUser(store, transaction.userId), alreadyProcessed: true };
  if (transaction.status !== "pending") return { error: "transaction_not_pending" };
  const user = store.find("users", transaction.userId);
  if (!user) return { error: "user_not_found" };
  if (transaction.type === "withdrawal") {
    store.patch("users", user.id, {
      frozenBalance: money(Math.max((user.frozenBalance || 0) - Number(transaction.amount || 0), 0)),
      _actorId: actorId,
    });
  }
  const updated = store.patch("transactions", transaction.id, {
    status: "rejected",
    rejectReason: reason,
    processedAt: new Date().toISOString(),
    _actorId: actorId,
  });
  return { transaction: updated, balance: balanceForUser(store, transaction.userId) };
}

function createAdjustment(store, userId, payload = {}, actorId = "system") {
  const amount = money(payload.amount);
  const comment = String(payload.comment || "").trim();
  if (!(amount > 0)) return { error: "amount_required" };
  if (!comment) return { error: "comment_required" };
  if (!store.find("users", userId)) return { error: "user_not_found" };
  const transaction = store.create("transactions", {
    userId,
    type: "adjustment",
    amount,
    status: "pending",
    paymentMethod: "admin",
    details: { comment },
    idempotencyKey: String(payload.idempotencyKey || `adjust-${userId}-${Date.now()}`),
    _actorId: actorId,
  });
  return approveTransaction(store, transaction.id, actorId);
}

module.exports = {
  MIN_DEPOSIT_AMOUNT,
  MIN_WITHDRAWAL_AMOUNT,
  approveTransaction,
  balanceForUser,
  createAdjustment,
  createDeposit,
  createWithdrawal,
  ownedTransactions,
  rejectTransaction,
};
