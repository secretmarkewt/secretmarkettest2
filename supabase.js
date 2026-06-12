const SUPABASE_CONFIG = window.SECMARKET_CONFIG || {};
const SUPABASE_URL = String(SUPABASE_CONFIG.supabaseUrl || "").replace(/\/$/, "");
const SUPABASE_ANON_KEY = String(SUPABASE_CONFIG.supabaseAnonKey || "").trim();
const SUPABASE_TOKEN_KEY = "secmarket-supabase-token";
const SUPABASE_TABLE = "secmarket_items";

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

function cleanUser(authUser, fallbackRole = "buyer") {
  const metadata = authUser?.user_metadata || authUser?.raw_user_meta_data || {};
  return {
    id: authUser?.id,
    email: authUser?.email,
    name: metadata.name || authUser?.email?.split("@")[0] || "Пользователь",
    telegram: metadata.telegram || "",
    role: metadata.role || fallbackRole,
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
  const body = await supabaseRequest("/auth/v1/signup", {
    method: "POST",
    token: "",
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
      data: {
        name: payload.name,
        telegram: payload.telegram,
        role: payload.role || "buyer",
      },
    }),
  });
  return {
    ...sessionFromAuth(body, payload.role || "buyer"),
    registrationNotice: { enabled: false, sent: false },
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
  const rows = await supabaseRequest(`/rest/v1/${SUPABASE_TABLE}?collection=eq.${encodeURIComponent(collectionName)}&select=*&order=created_at.desc`);
  return rows.map(rowToItem);
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
  if (collectionName === "tickets") item.ticketNotice = { enabled: false, sent: false };
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
    confirmations: payload.confirmations || 24,
    status: "paid",
  });
  let order = null;
  if (payment?.orderId) {
    order = await update("orders", payment.orderId, {
      paymentStatus: "paid",
      orderStatus: "paid",
      status: "paid",
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
  const order = await update("orders", orderId, {
    orderStatus: "completed",
    escrowStatus: "released",
    status: "completed",
  });
  return { order, ledgerEntry: null };
}

async function withdrawalBalance() {
  return { available: 0, currency: "USDT", provider: "supabase" };
}

async function requestWithdrawal(payload) {
  const withdrawal = await create("withdrawals", {
    ...payload,
    id: `wd-${Date.now()}`,
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
    amount: withdrawal.amount,
    status: withdrawal.status,
  };
  await create("ledger", ledgerEntry);
  return { withdrawal, ledgerEntry };
}

async function getSnapshot() {
  const collections = ["products", "orders", "payments", "tickets", "disputes", "withdrawals", "deliveries", "ledger"];
  const entries = await Promise.all(collections.map(async (name) => [name, (await list(name)).length]));
  return Object.fromEntries(entries);
}

window.SECMARKET_SUPABASE = {
  confirmOrder,
  create,
  enabled: supabaseEnabled,
  findById,
  getSnapshot,
  getToken: getSupabaseToken,
  health: () => ({ ok: supabaseEnabled(), provider: "supabase" }),
  issueDelivery,
  list,
  login,
  logout,
  register,
  requestWithdrawal,
  session,
  setToken: setSupabaseToken,
  settleWithdrawal,
  syncPayment,
  update,
  updateStatus,
  withdrawalBalance,
};
