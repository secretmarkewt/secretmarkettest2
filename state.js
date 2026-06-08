let currency = "USDT";
let activeStep = 1;
const APP_BASE_PATH = location.hostname.endsWith("github.io") ? `/${location.pathname.split("/").filter(Boolean)[0] || ""}` : "";

const state = {
  query: "",
  maxPrice: 100,
  delivery: "all",
  rating: "4.8",
  sort: "popular",
  favorites: new Set(),
  orderConfirmed: false,
  disputeCreated: false,
  copiedAddress: false,
  chatMessages: [],
  live: {
    deliveries: [],
    disputes: [],
    ledger: [],
    orders: [],
    payments: [],
    products: [],
    withdrawals: [],
  },
  liveHealth: null,
  liveStatus: "idle",
  liveSyncedAt: "",
  toast: "",
};

window.SECMARKET_STATE = state;

loadState();

function notify(message) {
  state.toast = message;
  render();
  window.clearTimeout(notify.timer);
  notify.timer = window.setTimeout(() => {
    state.toast = "";
    render();
  }, 2400);
}

function saveState() {
  const payload = {
    currency,
    favorites: [...state.favorites],
    orderConfirmed: state.orderConfirmed,
    disputeCreated: state.disputeCreated,
    copiedAddress: state.copiedAddress,
    chatMessages: state.chatMessages,
    live: state.live,
    liveHealth: state.liveHealth,
    liveStatus: state.liveStatus,
    liveSyncedAt: state.liveSyncedAt,
  };
  localStorage.setItem("secmarket-demo-state", JSON.stringify(payload));
}

function loadState() {
  try {
    const raw = localStorage.getItem("secmarket-demo-state");
    if (!raw) return;
    const payload = JSON.parse(raw);
    if (payload.currency) currency = payload.currency;
    state.favorites = new Set(payload.favorites || []);
    state.orderConfirmed = Boolean(payload.orderConfirmed);
    state.disputeCreated = Boolean(payload.disputeCreated);
    state.copiedAddress = Boolean(payload.copiedAddress);
    state.chatMessages = Array.isArray(payload.chatMessages) ? payload.chatMessages : [];
    state.live = {
      ...state.live,
      ...(payload.live && typeof payload.live === "object" ? payload.live : {}),
    };
    state.liveHealth = payload.liveHealth || null;
    state.liveStatus = payload.liveStatus || "idle";
    state.liveSyncedAt = payload.liveSyncedAt || "";
  } catch {
    localStorage.removeItem("secmarket-demo-state");
  }
}

function liveItems(collectionName) {
  return Array.isArray(state.live[collectionName]) ? state.live[collectionName] : [];
}

function upsertLiveItem(collectionName, item) {
  if (!item || item.id === undefined || item.id === null) return null;
  state.live[collectionName] ||= [];
  const items = state.live[collectionName];
  const index = items.findIndex((candidate) => String(candidate.id).toLowerCase() === String(item.id).toLowerCase());
  if (index === -1) items.unshift(item);
  else items[index] = { ...items[index], ...item };
  saveState();
  return item;
}

function liveCollectionsForRole(role) {
  if (role === "admin" || role === "seller") return ["deliveries", "disputes", "ledger", "orders", "payments", "products", "withdrawals"];
  if (role === "buyer") return ["deliveries", "disputes", "ledger", "orders", "payments", "products"];
  return ["products"];
}

async function syncLiveData(options = {}) {
  const apiClient = window.SECMARKET_API;
  if (!apiClient?.live) return false;

  state.liveStatus = "syncing";
  if (!options.silent) render();

  try {
    const health = await apiClient.live.health();
    state.liveHealth = health;
    let role = "guest";

    if (apiClient.getAuthToken()) {
      try {
        const session = await apiClient.live.session();
        role = session.user?.role || "guest";
      } catch {
        apiClient.setAuthToken("");
      }
    }

    const results = await Promise.all(liveCollectionsForRole(role).map(async (collectionName) => {
      try {
        return [collectionName, await apiClient.live.list(collectionName)];
      } catch {
        return [collectionName, null];
      }
    }));

    results.forEach(([collectionName, items]) => {
      if (Array.isArray(items)) state.live[collectionName] = items;
    });
    state.liveStatus = "connected";
    state.liveSyncedAt = new Date().toISOString();
    saveState();
    render();
    if (options.notify) notify("Live API данные синхронизированы");
    return true;
  } catch (error) {
    state.liveStatus = "offline";
    if (!options.silent) {
      render();
      if (options.notify) notify(`Live API недоступен: ${error.message}`);
    }
    return false;
  }
}

function resetDemoState() {
  localStorage.removeItem("secmarket-demo-state");
  currency = "USDT";
  state.favorites = new Set();
  state.orderConfirmed = false;
  state.disputeCreated = false;
  state.copiedAddress = false;
  state.chatMessages = [];
  state.live = { deliveries: [], disputes: [], ledger: [], orders: [], payments: [], products: [], withdrawals: [] };
  state.liveHealth = null;
  state.liveStatus = "idle";
  state.liveSyncedAt = "";
  notify("Демо-состояние сброшено");
}

function go(path) {
  if (location.protocol === "file:") {
    location.hash = path;
  } else {
    history.pushState({}, "", `${APP_BASE_PATH}${path}`);
    render();
    scrollTo({ top: 0, behavior: "smooth" });
  }
}

function currentPath() {
  if (location.protocol === "file:") {
    return location.hash.replace(/^#/, "") || "/";
  }
  const path = location.pathname.replace(APP_BASE_PATH, "") || "/";
  return path.startsWith("/") ? path : `/${path}`;
}

function activeClass(path) {
  return currentPath() === path ? "active" : "";
}

function isCompactViewport() {
  return window.innerWidth <= 640;
}

function productMatchesSearch(product, query = state.query) {
  const text = `${product.title} ${product.cat} ${product.seller} ${product.type}`.toLowerCase();
  return text.includes(query.trim().toLowerCase());
}

function filteredProducts(category = "") {
  const cleanCategory = pretty(category).toLowerCase();
  const minRating = state.rating === "any" ? 0 : Number(state.rating);
  const list = window.SECMARKET_DATA.products.filter((product) => {
    const inCategory = !category || product.cat.toLowerCase().includes(cleanCategory) || product.title.toLowerCase().includes(cleanCategory);
    const inSearch = productMatchesSearch(product);
    const inPrice = product.price <= state.maxPrice;
    const inDelivery = state.delivery === "all" || product.type.toLowerCase().includes(state.delivery);
    const inRating = product.rating >= minRating;
    return inCategory && inSearch && inPrice && inDelivery && inRating;
  });

  return list.sort((a, b) => {
    if (state.sort === "cheap") return a.price - b.price;
    if (state.sort === "expensive") return b.price - a.price;
    if (state.sort === "new") return b.id - a.id;
    if (state.sort === "rating") return b.rating - a.rating;
    return b.sales - a.sales;
  });
}

function setSearch(query) {
  state.query = query.trim();
  const path = currentPath().startsWith("/catalog") ? currentPath() : "/catalog";
  go(path);
}

function money(value) {
  return currency === "USDT" ? `${value.toFixed(2)} USDT` : `$${value.toFixed(2)}`;
}
