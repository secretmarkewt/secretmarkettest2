const API_STORAGE_KEY = "secmarket-mock-api-state";
const API_BASE_URL_KEY = "secmarket-api-base-url";
const API_AUTH_TOKEN_KEY = "secmarket-api-auth-token";
const DEFAULT_API_BASE_URL = "http://127.0.0.1:4174";

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
  async login(email, role = "buyer") {
    const session = await requestLive("/api/auth/login", {
      method: "POST",
      token: "",
      body: JSON.stringify({ email, role }),
    });
    setAuthToken(session.token);
    return session;
  },
  async session(token = getAuthToken()) {
    return requestLive("/api/auth/session", {
      token,
    });
  },
  async logout(token = getAuthToken()) {
    const result = await requestLive("/api/auth/logout", { method: "POST", token });
    if (token === getAuthToken()) setAuthToken("");
    return result;
  },
  async health() {
    return requestLive("/api/health");
  },
  async list(collectionName) {
    const response = await requestLive(`/api/${collectionName}`);
    return response.items || [];
  },
  async findById(collectionName, id) {
    return requestLive(`/api/${collectionName}/${id}`);
  },
  async create(collectionName, payload, token = getAuthToken()) {
    return requestLive(`/api/${collectionName}`, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    });
  },
  async update(collectionName, id, payload, token = getAuthToken()) {
    return requestLive(`/api/${collectionName}/${id}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
    });
  },
  async updateStatus(collectionName, id, status, token = getAuthToken()) {
    return requestLive(`/api/${collectionName}/${id}/status`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ status }),
    });
  },
  async syncPayment(id, payload = {}, token = getAuthToken()) {
    return requestLive(`/api/payments/${id}/sync`, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    });
  },
  async issueDelivery(orderId, token = getAuthToken()) {
    return requestLive(`/api/orders/${orderId}/deliver`, {
      method: "POST",
      token,
    });
  },
  async confirmOrder(orderId, token = getAuthToken()) {
    return requestLive(`/api/orders/${orderId}/confirm`, {
      method: "POST",
      token,
    });
  },
  async withdrawalBalance(token = getAuthToken()) {
    return requestLive("/api/withdrawals/balance", {
      token,
    });
  },
  async requestWithdrawal(payload, token = getAuthToken()) {
    return requestLive("/api/withdrawals", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    });
  },
  async settleWithdrawal(id, payload = {}, token = getAuthToken()) {
    return requestLive(`/api/withdrawals/${id}/settle`, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    });
  },
  async getSnapshot() {
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
  list,
  live,
  reset,
  setAuthToken,
  setApiBaseUrl,
  updateStatus,
};
