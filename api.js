const API_STORAGE_KEY = "secmarket-mock-api-state";

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

window.SECMARKET_API = {
  create,
  findById,
  getSnapshot,
  list,
  reset,
  updateStatus,
};
