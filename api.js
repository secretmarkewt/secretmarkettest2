const API_STORAGE_KEY = "secmarket-mock-api-state";
const API_BASE_URL_KEY = "secmarket-api-base-url";
const API_AUTH_TOKEN_KEY = "secmarket-api-auth-token";
const DEFAULT_API_BASE_URL = (window.SECMARKET_CONFIG && window.SECMARKET_CONFIG.apiBaseUrl) || "http://127.0.0.1:4174";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function initialApiState() {
  const data = window.SECMARKET_DATA;
  return {
    products: clone(data.products),
    orders: clone(data.demoOrders),
    payments: clone(data.demoPayments),
    tickets: clone(data.demoTickets),
    disputes: clone(data.demoDisputes),
    withdrawals: clone(data.demoWithdrawals),
    transactions: clone(data.demoTransactions || []),
    moderation: clone(data.moderationQueue),
    deliveries: [],
    ledger: [],
    audit: [],
  };
}

function readApiState() {
  try {
    const raw = localStorage.getItem(API_STORAGE_KEY);
    return raw ? JSON.parse(raw) : initialApiState();
  } catch {
    localStorage.removeItem(API_STORAGE_KEY);
    return initialApiState();
  }
}

function writeApiState(nextState) {
  localStorage.setItem(API_STORAGE_KEY, JSON.stringify(nextState));
  return nextState;
}

function list(collectionName) {
  const state = readApiState();
  return clone(state[collectionName] || []);
}

function findById(collectionName, id) {
  return list(collectionName).find((item) => String(item.id).toLowerCase() === String(id).toLowerCase()) || null;
}

function updateStatus(collectionName, id, status) {
  const state = readApiState();
  const items = state[collectionName] || [];
  const item = items.find((entry) => String(entry.id).toLowerCase() === String(id).toLowerCase());
  if (!item) return null;
  item.status = status;
  item.updatedAt = new Date().toISOString();
  writeApiState(state);
  return clone(item);
}

function create(collectionName, payload) {
  const state = readApiState();
  const items = state[collectionName] || [];
  const item = {
    ...payload,
    id: payload.id || `${collectionName}-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  items.unshift(item);
  state[collectionName] = items;
  writeApiState(state);
  return clone(item);
}

function reset() {
  localStorage.removeItem(API_STORAGE_KEY);
  return initialApiState();
}

function getSnapshot() {
  const state = readApiState();
  return Object.fromEntries(Object.entries(state).map(([key, value]) => [key, value.length]));
}

function getApiBaseUrl() {
  return localStorage.getItem(API_BASE_URL_KEY) || DEFAULT_API_BASE_URL;
}

function setApiBaseUrl(url) {
  const cleanUrl = String(url || "").replace(/\/$/, "");
  if (!cleanUrl) localStorage.removeItem(API_BASE_URL_KEY);
  else localStorage.setItem(API_BASE_URL_KEY, cleanUrl);
  return getApiBaseUrl();
}

function getAuthToken() {
  return localStorage.getItem(API_AUTH_TOKEN_KEY) || "";
}

function setAuthToken(token) {
  const cleanToken = String(token || "").trim();
  if (!cleanToken) localStorage.removeItem(API_AUTH_TOKEN_KEY);
  else localStorage.setItem(API_AUTH_TOKEN_KEY, cleanToken);
  return getAuthToken();
}

function authHeader(token = getAuthToken()) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function supabaseProvider() {
  return window.SECMARKET_SUPABASE;
}

function isSupabaseEnabled() {
  return Boolean(supabaseProvider()?.enabled?.());
}

function syncSupabaseToken(session) {
  if (session?.token) setAuthToken(session.token);
  return session;
}

async function requestLive(path, options = {}) {
  const { token = getAuthToken(), ...requestOptions } = options;
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...requestOptions,
    headers: {
      "Content-Type": "application/json",
      ...authHeader(token),
      ...(requestOptions.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || `API request failed: ${response.status}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

const live = {
  async register(payload) {
    if (isSupabaseEnabled()) return syncSupabaseToken(await supabaseProvider().register(payload));
    const session = await requestLive("/api/auth/register", {
      method: "POST",
      token: "",
      body: JSON.stringify(payload),
    });
    setAuthToken(session.token);
    return session;
  },
  async login(email, role = "buyer", password = "password") {
    if (isSupabaseEnabled()) return syncSupabaseToken(await supabaseProvider().login(email, password, role));
    const session = await requestLive("/api/auth/login", {
      method: "POST",
      token: "",
      body: JSON.stringify({ email, role, password }),
    });
    setAuthToken(session.token);
    return session;
  },
  async session(token = getAuthToken()) {
    if (isSupabaseEnabled()) return supabaseProvider().session(token);
    return requestLive("/api/auth/session", {
      token,
    });
  },
  async changeRole(role, token = getAuthToken()) {
    if (isSupabaseEnabled()) throw new Error("Смена роли через Supabase пока не подключена");
    return requestLive("/api/auth/role", {
      method: "POST",
      token,
      body: JSON.stringify({ role }),
    });
  },
  async logout(token = getAuthToken()) {
    if (isSupabaseEnabled()) {
      const result = await supabaseProvider().logout(token);
      if (token === getAuthToken()) setAuthToken("");
      return result;
    }
    const result = await requestLive("/api/auth/logout", { method: "POST", token });
    if (token === getAuthToken()) setAuthToken("");
    return result;
  },
  async health() {
    if (isSupabaseEnabled()) return supabaseProvider().health();
    return requestLive("/api/health");
  },
  async heartbeat(payload = {}) {
    if (isSupabaseEnabled()) return { ok: true, skipped: true, provider: "supabase" };
    return requestLive("/api/presence/heartbeat", {
      method: "POST",
      token: "",
      body: JSON.stringify(payload),
    });
  },
  async list(collectionName) {
    if (isSupabaseEnabled()) return supabaseProvider().list(collectionName);
    const response = await requestLive(`/api/${collectionName}`);
    return response.items || [];
  },
  async findById(collectionName, id) {
    if (isSupabaseEnabled()) return supabaseProvider().findById(collectionName, id);
    return requestLive(`/api/${collectionName}/${id}`);
  },
  async create(collectionName, payload, token = getAuthToken()) {
    if (isSupabaseEnabled()) return supabaseProvider().create(collectionName, payload, token);
    return requestLive(`/api/${collectionName}`, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    });
  },
  async update(collectionName, id, payload, token = getAuthToken()) {
    if (isSupabaseEnabled()) return supabaseProvider().update(collectionName, id, payload, token);
    return requestLive(`/api/${collectionName}/${id}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
    });
  },
  async updateStatus(collectionName, id, status, token = getAuthToken()) {
    if (isSupabaseEnabled()) return supabaseProvider().updateStatus(collectionName, id, status, token);
    return requestLive(`/api/${collectionName}/${id}/status`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ status }),
    });
  },
  async syncPayment(id, payload = {}, token = getAuthToken()) {
    if (isSupabaseEnabled()) return supabaseProvider().syncPayment(id, payload, token);
    return requestLive(`/api/payments/${id}/sync`, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    });
  },
  async issueDelivery(orderId, token = getAuthToken()) {
    if (isSupabaseEnabled()) return supabaseProvider().issueDelivery(orderId, token);
    return requestLive(`/api/orders/${orderId}/deliver`, {
      method: "POST",
      token,
    });
  },
  async confirmOrder(orderId, token = getAuthToken()) {
    if (isSupabaseEnabled()) return supabaseProvider().confirmOrder(orderId, token);
    return requestLive(`/api/orders/${orderId}/confirm`, {
      method: "POST",
      token,
    });
  },
  async refundOrder(orderId, payload = {}, token = getAuthToken()) {
    if (isSupabaseEnabled()) throw new Error("Возвраты через Supabase пока не подключены");
    return requestLive(`/api/orders/${orderId}/refund`, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    });
  },
  async withdrawalBalance(token = getAuthToken()) {
    if (isSupabaseEnabled()) return supabaseProvider().withdrawalBalance(token);
    return requestLive("/api/withdrawals/balance", {
      token,
    });
  },
  async balance(token = getAuthToken()) {
    if (isSupabaseEnabled()) return supabaseProvider().balance(token);
    return requestLive("/api/balance", { token });
  },
  async transactions(token = getAuthToken()) {
    if (isSupabaseEnabled()) return supabaseProvider().transactions(token);
    return requestLive("/api/transactions", { token });
  },
  async deposit(payload, token = getAuthToken()) {
    if (isSupabaseEnabled()) return supabaseProvider().deposit(payload, token);
    return requestLive("/api/deposit", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    });
  },
  async withdrawBalance(payload, token = getAuthToken()) {
    if (isSupabaseEnabled()) return supabaseProvider().withdrawBalance(payload, token);
    return requestLive("/api/withdraw", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    });
  },
  async approveTransaction(id, token = getAuthToken()) {
    return requestLive(`/api/admin/transactions/${id}/approve`, {
      method: "POST",
      token,
    });
  },
  async rejectTransaction(id, payload = {}, token = getAuthToken()) {
    return requestLive(`/api/admin/transactions/${id}/reject`, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    });
  },
  async adjustBalance(userId, payload, token = getAuthToken()) {
    return requestLive(`/api/admin/users/${userId}/balance-adjustment`, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    });
  },
  async requestWithdrawal(payload, token = getAuthToken()) {
    if (isSupabaseEnabled()) return supabaseProvider().requestWithdrawal(payload, token);
    return requestLive("/api/withdrawals", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    });
  },
  async settleWithdrawal(id, payload = {}, token = getAuthToken()) {
    if (isSupabaseEnabled()) return supabaseProvider().settleWithdrawal(id, payload, token);
    return requestLive(`/api/withdrawals/${id}/settle`, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    });
  },
  async exportPayouts(params = {}, token = getAuthToken()) {
    const search = new URLSearchParams();
    if (params.statuses) search.set("statuses", Array.isArray(params.statuses) ? params.statuses.join(",") : params.statuses);
    if (params.ids) search.set("ids", Array.isArray(params.ids) ? params.ids.join(",") : params.ids);
    return requestLive(`/api/withdrawals/export${search.toString() ? `?${search.toString()}` : ""}`, {
      token,
    });
  },
  async createPayoutBatch(payload = {}, token = getAuthToken()) {
    return requestLive("/api/withdrawals/batch", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    });
  },
  async getSnapshot() {
    if (isSupabaseEnabled()) return supabaseProvider().getSnapshot();
    return requestLive("/api/snapshot");
  },
  async reset() {
    return requestLive("/api/reset", { method: "POST" });
  },
};

window.SECMARKET_API = {
  create,
  findById,
  getAuthToken,
  getApiBaseUrl,
  getSnapshot,
  isSupabaseEnabled,
  list,
  live,
  reset,
  setAuthToken,
  setApiBaseUrl,
  updateStatus,
};
