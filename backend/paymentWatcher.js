const REQUIRED_CONFIRMATIONS = {
  TRC20: 3,
  TON: 1,
  BEP20: 12,
};

const WATCHER_ENV = {
  TRC20: "SECMARKET_TRC20_WATCHER_URL",
  TON: "SECMARKET_TON_WATCHER_URL",
  BEP20: "SECMARKET_BEP20_WATCHER_URL",
};

function requiredConfirmations(network) {
  return REQUIRED_CONFIRMATIONS[network] || 3;
}

function watcherTimeoutMs() {
  return Math.max(Number(process.env.SECMARKET_PAYMENT_WATCHER_TIMEOUT_MS || 8000), 1000);
}

function watcherEndpointSummary(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return "invalid_url";
  }
}

function watcherUrl(network) {
  return String(process.env[WATCHER_ENV[network]] || "").trim();
}

function watcherReadiness() {
  return Object.fromEntries(Object.keys(REQUIRED_CONFIRMATIONS).map((network) => {
    const url = watcherUrl(network);
    return [network, {
      configured: Boolean(url),
      env: WATCHER_ENV[network],
      confirmationsRequired: requiredConfirmations(network),
      endpoint: watcherEndpointSummary(url),
      timeoutMs: watcherTimeoutMs(),
      apiKeyConfigured: Boolean(process.env.SECMARKET_PAYMENT_WATCHER_API_KEY),
      provider: url ? "http" : "manual",
    }];
  }));
}

function missingWatcherNetworks() {
  return Object.entries(watcherReadiness())
    .filter(([, config]) => !config.configured)
    .map(([network]) => network);
}

async function fetchWatcherState(payment) {
  const network = String(payment.network || "").toUpperCase();
  const url = watcherUrl(network);
  if (!url) return null;
  const requestUrl = new URL(url);
  requestUrl.searchParams.set("paymentId", payment.id);
  requestUrl.searchParams.set("orderId", payment.orderId);
  requestUrl.searchParams.set("address", payment.address || "");
  requestUrl.searchParams.set("amount", String(payment.amount || 0));
  requestUrl.searchParams.set("network", network);
  const headers = {};
  if (process.env.SECMARKET_PAYMENT_WATCHER_API_KEY) {
    headers.Authorization = `Bearer ${process.env.SECMARKET_PAYMENT_WATCHER_API_KEY}`;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), watcherTimeoutMs());
  let response;
  try {
    response = await fetch(requestUrl, { headers, signal: controller.signal });
  } catch (error) {
    if (error.name === "AbortError") throw new Error(`watcher_${network.toLowerCase()}_timeout`, { cause: error });
    throw error;
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) throw new Error(`watcher_${network.toLowerCase()}_${response.status}`);
  const body = await response.json();
  return {
    txHash: body.txHash || body.transactionId || body.id || "",
    confirmations: Number(body.confirmations || 0),
    status: body.status || "",
    adminNote: body.note || body.adminNote || "",
    watcher: `http:${network}`,
  };
}

function nextPaymentState(payment, payload = {}, watcherPayload = null) {
  const required = requiredConfirmations(payment.network);
  const source = { ...(watcherPayload || {}), ...(payload || {}) };
  const txHash = source.txHash || payment.txHash || `mock-${String(payment.network || "chain").toLowerCase()}-${payment.orderId}`;
  const manualStatus = String(source.status || "").trim();
  const confirmations = manualStatus
    ? Math.max(Number(source.confirmations ?? payment.confirmations ?? 0), 0)
    : Math.max(Number(source.confirmations ?? payment.confirmations ?? 0), required);
  const status = manualStatus || (confirmations >= required ? "paid" : "confirming");

  return {
    adminNote: source.adminNote || payment.adminNote || "",
    confirmations,
    status,
    txHash,
    watcher: source.watcher || "manual",
    watchedAt: new Date().toISOString(),
  };
}

async function syncPayment(store, paymentId, options = {}) {
  const payment = store.find("payments", paymentId);
  if (!payment) return null;

  const hasManualPayload = Boolean(options.payload?.txHash || options.payload?.status);
  const network = String(payment.network || "").toUpperCase();
  if (!hasManualPayload && !watcherUrl(network)) {
    return { error: "payment_watcher_not_configured", network };
  }

  const watcherPayload = hasManualPayload
    ? null
    : await fetchWatcherState(payment);
  const paymentPatch = nextPaymentState(payment, options.payload, watcherPayload);
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

module.exports = {
  REQUIRED_CONFIRMATIONS,
  missingWatcherNetworks,
  requiredConfirmations,
  syncPayment,
  watcherReadiness,
};
