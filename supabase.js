const SUPABASE_CONFIG = window.SECMARKET_CONFIG || {};
const SUPABASE_URL = String(SUPABASE_CONFIG.supabaseUrl || "").replace(/\/$/, "");
const SUPABASE_ANON_KEY = String(SUPABASE_CONFIG.supabaseAnonKey || "").trim();
const SUPABASE_TOKEN_KEY = "secmarket-supabase-token";
const SUPABASE_TABLE = "secmarket_items";
const SUPABASE_ADMIN_EMAILS = new Set(["milkiees6faceit@gmail.com", "hardpleilol@gmail.com"]);

function supabaseEnabled() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function supabaseHeaders(token = getSupabaseToken()) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  };
}

function getSupabaseToken() {
  return localStorage.getItem(SUPABASE_TOKEN_KEY) || "";
}

function setSupabaseToken(token) {
  const cleanToken = String(token || "").trim();
  if (!cleanToken) localStorage.removeItem(SUPABASE_TOKEN_KEY);
  else localStorage.setItem(SUPABASE_TOKEN_KEY, cleanToken);
  return getSupabaseToken();
}

async function supabaseRequest(path, options = {}) {
  if (!supabaseEnabled()) throw new Error("Supabase не настроен");
  const { token = getSupabaseToken(), headers = {}, ...requestOptions } = options;
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...requestOptions,
    headers: {
      ...supabaseHeaders(token),
      ...headers,
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = body?.msg || body?.message || body?.error_description || body?.error || `Supabase request failed: ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

async function notify(type, payload, token = getSupabaseToken()) {
  if (!token) return { enabled: true, sent: false, error: "no_supabase_session" };
  try {
    return await supabaseRequest("/functions/v1/secmarket-notify", {
      method: "POST",
      token,
      body: JSON.stringify({ type, payload }),
    });
  } catch (error) {
    return { enabled: true, sent: false, error: error.message };
  }
}

function cleanUser(authUser, fallbackRole = "buyer") {
  const metadata = authUser?.user_metadata || authUser?.raw_user_meta_data || {};
  const email = String(authUser?.email || "").toLowerCase();
  const role = SUPABASE_ADMIN_EMAILS.has(email) ? "admin" : metadata.role || fallbackRole;
  return {
    id: authUser?.id,
    email: authUser?.email,
    name: metadata.name || authUser?.email?.split("@")[0] || "Пользователь",
    telegram: metadata.telegram || "",
    promoCode: metadata.promoCode || "",
    promoTitle: metadata.promoTitle || "",
    role,
    status: "active",
  };
}

function sessionFromAuth(body, fallbackRole = "buyer") {
  const token = body?.access_token || body?.session?.access_token || "";
  if (token) setSupabaseToken(token);
  return {
    token,
    user: cleanUser(body?.user, fallbackRole),
    provider: "supabase",
  };
}

function rowToItem(row) {
  if (!row) return null;
  return {
    ...(row.payload || {}),
    id: row.id,
    status: row.status || row.payload?.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function itemStatus(payload = {}) {
  return payload.status || payload.orderStatus || payload.paymentStatus || "active";
}

async function register(payload) {
  const email = String(payload.email || "").toLowerCase();
  const role = SUPABASE_ADMIN_EMAILS.has(email) ? "admin" : payload.role || "buyer";
  const body = await supabaseRequest("/auth/v1/signup", {
    method: "POST",
    token: "",
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
      data: {
        name: payload.name,
        telegram: payload.telegram,
        promoCode: payload.promoCode || "",
        promoTitle: payload.promoTitle || "",
        role,
      },
    }),
  });
  const session = sessionFromAuth(body, role);
  const registrationNotice = await notify("registration", {
    name: payload.name,
    email: payload.email,
    telegram: payload.telegram,
    promoCode: payload.promoCode || "",
    promoTitle: payload.promoTitle || "",
    role,
  }, session.token);
  return {
    ...session,
    registrationNotice,
  };
}

async function login(email, password, fallbackRole = "buyer") {
  const body = await supabaseRequest("/auth/v1/token?grant_type=password", {
    method: "POST",
    token: "",
    body: JSON.stringify({ email, password }),
  });
  return sessionFromAuth(body, fallbackRole);
}

async function session(token = getSupabaseToken()) {
  const user = await supabaseRequest("/auth/v1/user", { token });
  return { token, user: cleanUser(user), provider: "supabase" };
}

async function logout(token = getSupabaseToken()) {
  try {
    await supabaseRequest("/auth/v1/logout", { method: "POST", token });
  } finally {
    setSupabaseToken("");
  }
  return { ok: true };
}

async function list(collectionName) {
  if (collectionName === "profiles") return listProfiles();
  const rows = await supabaseRequest(`/rest/v1/${SUPABASE_TABLE}?collection=eq.${encodeURIComponent(collectionName)}&select=*&order=created_at.desc`);
  return rows.map(rowToItem);
}

async function listProfiles() {
  const rows = await supabaseRequest("/rest/v1/profiles?select=id,email,name,telegram,role,status,created_at,updated_at&order=created_at.desc");
  return rows.map((profile) => ({
    id: profile.id,
    email: profile.email,
    name: profile.name,
    telegram: profile.telegram,
    role: profile.role,
    status: profile.status,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  }));
}

async function findById(collectionName, id) {
  const rows = await supabaseRequest(`/rest/v1/${SUPABASE_TABLE}?collection=eq.${encodeURIComponent(collectionName)}&id=eq.${encodeURIComponent(id)}&select=*&limit=1`);
  return rowToItem(rows[0]) || null;
}

async function create(collectionName, payload) {
  const id = String(payload.id || `${collectionName}-${Date.now()}`);
  const rows = await supabaseRequest(`/rest/v1/${SUPABASE_TABLE}`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      id,
      collection: collectionName,
      status: itemStatus(payload),
      payload: { ...payload, id },
    }),
  });
  const item = rowToItem(rows[0]);
  if (collectionName === "tickets") item.ticketNotice = await notify("ticket", item);
  return item;
}

async function update(collectionName, id, payload) {
  const current = (await findById(collectionName, id)) || {};
  const nextPayload = { ...current, ...payload, id };
  const rows = await supabaseRequest(`/rest/v1/${SUPABASE_TABLE}?collection=eq.${encodeURIComponent(collectionName)}&id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      status: itemStatus(nextPayload),
      payload: nextPayload,
      updated_at: new Date().toISOString(),
    }),
  });
  return rowToItem(rows[0]);
}

async function updateStatus(collectionName, id, status) {
  return update(collectionName, id, { status });
}

async function syncPayment(id, payload = {}) {
  const payment = await update("payments", id, {
    ...payload,
    confirmations: payload.confirmations ?? 24,
    status: payload.status || "paid",
  });
  let order = null;
  if (payment?.orderId && payment.status === "paid") {
    order = await update("orders", payment.orderId, {
      paymentStatus: "paid",
      orderStatus: "paid",
      status: "paid",
    });
  } else if (payment?.orderId && ["underpaid", "network_error"].includes(payment.status)) {
    order = await update("orders", payment.orderId, {
      paymentStatus: payment.status,
      orderStatus: "awaiting_payment",
      status: "awaiting_payment",
    });
  }
  return { payment, order };
}

async function issueDelivery(orderId) {
  const delivery = await create("deliveries", {
    id: `del-${orderId}`,
    orderId,
    secret: `SECRET-${Date.now()}`,
    status: "issued",
  });
  const order = await update("orders", orderId, {
    orderStatus: "awaiting_buyer",
    status: "awaiting_buyer",
  });
  return { delivery, order, product: null };
}

async function confirmOrder(orderId) {
  const currentOrder = (await findById("orders", orderId)) || {};
  const fees = window.SECMARKET_FEES.calculateCommission(currentOrder.itemAmount ?? currentOrder.amount ?? 0);
  const order = await update("orders", orderId, {
    ...fees,
    amount: fees.itemAmount,
    orderStatus: "completed",
    escrowStatus: "released",
    status: "completed",
  });
  const ledgerEntry = await create("ledger", {
    id: `led-${Date.now()}`,
    orderId,
    sellerId: order.sellerId,
    buyerId: order.buyerId,
    amount: fees.sellerNet,
    coin: "USDT",
    type: "escrow_release",
    status: "posted",
    ...fees,
  });
  return { order, ledgerEntry };
}

async function balance(token = getSupabaseToken()) {
  const current = await session(token);
  const userTransactions = (await list("transactions")).filter((item) => item.userId === current.user.id);
  const completed = userTransactions
    .filter((item) => item.status === "completed")
    .reduce((sum, item) => sum + (item.type === "withdrawal" ? -Number(item.amount || 0) : Number(item.amount || 0)), 0);
  const frozenBalance = userTransactions
    .filter((item) => item.type === "withdrawal" && item.status === "pending")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  return {
    userId: current.user.id,
    balance: Math.max(completed + frozenBalance, 0),
    frozenBalance,
    availableBalance: Math.max(completed, 0),
    currency: "USDT",
    minDepositAmount: 1,
    minWithdrawalAmount: 5,
  };
}

async function transactions(token = getSupabaseToken()) {
  const current = await session(token);
  const rows = await list("transactions");
  return { items: current.user.role === "admin" ? rows : rows.filter((item) => item.userId === current.user.id) };
}

async function deposit(payload, token = getSupabaseToken()) {
  const current = await session(token);
  const transaction = await create("transactions", {
    userId: current.user.id,
    type: "deposit",
    amount: Number(payload.amount || 0),
    status: "pending",
    paymentMethod: payload.paymentMethod || "USDT",
    details: payload.details || {},
    idempotencyKey: payload.idempotencyKey || `dep-${Date.now()}`,
  });
  return { transaction, balance: await balance(token) };
}

async function withdrawBalance(payload, token = getSupabaseToken()) {
  const current = await session(token);
  const transaction = await create("transactions", {
    userId: current.user.id,
    type: "withdrawal",
    amount: Number(payload.amount || 0),
    status: "pending",
    paymentMethod: "USDT",
    details: { address: payload.address || "", network: payload.network || "" },
    idempotencyKey: payload.idempotencyKey || `wd-${Date.now()}`,
  });
  return { transaction, balance: await balance(token) };
}

async function withdrawalBalance() {
  return { available: 0, currency: "USDT", provider: "supabase" };
}

async function requestWithdrawal(payload) {
  const grossAmount = Number(payload.grossAmount || payload.amount || 0);
  const networkFee = Math.max(Number(payload.networkFee || 0), 0);
  const netAmount = Math.max(Number(payload.netAmount || (grossAmount - networkFee)), 0);
  const withdrawal = await create("withdrawals", {
    ...payload,
    id: `wd-${Date.now()}`,
    amount: grossAmount,
    grossAmount,
    networkFee,
    netAmount,
    status: "review",
  });
  return { withdrawal };
}

async function settleWithdrawal(id, payload = {}) {
  const withdrawal = await update("withdrawals", id, {
    ...payload,
    status: payload.status || "completed",
  });
  const ledgerEntry = {
    id: `led-${Date.now()}`,
    type: "payout",
    withdrawalId: id,
    sellerId: withdrawal.sellerId,
    amount: -Math.abs(Number(withdrawal.grossAmount || withdrawal.amount || 0)),
    coin: withdrawal.coin || "USDT",
    status: withdrawal.status,
  };
  await create("ledger", ledgerEntry);
  return { withdrawal, ledgerEntry };
}

async function getSnapshot() {
  const collections = ["products", "orders", "payments", "tickets", "disputes", "withdrawals", "deliveries", "ledger", "transactions"];
  const entries = await Promise.all(collections.map(async (name) => [name, (await list(name)).length]));
  return Object.fromEntries(entries);
}

window.SECMARKET_SUPABASE = {
  confirmOrder,
  create,
  balance,
  deposit,
  enabled: supabaseEnabled,
  findById,
  getSnapshot,
  getToken: getSupabaseToken,
  health: () => ({ ok: supabaseEnabled(), provider: "supabase" }),
  issueDelivery,
  list,
  login,
  logout,
  notify,
  register,
  requestWithdrawal,
  session,
  setToken: setSupabaseToken,
  settleWithdrawal,
  syncPayment,
  transactions,
  update,
  updateStatus,
  withdrawBalance,
  withdrawalBalance,
};
