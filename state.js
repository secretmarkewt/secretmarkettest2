let currency = "USDT";
let activeStep = 1;
const APP_BASE_PATH = location.hostname.endsWith("github.io") ? `/${location.pathname.split("/").filter(Boolean)[0] || ""}` : "";

const state = {
  theme: "dark",
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
    profiles: [],
    products: [],
    tickets: [],
    withdrawals: [],
  },
  liveHealth: null,
  liveStatus: "idle",
  liveSyncedAt: "",
  toast: "",
};

window.SECMARKET_STATE = state;

loadState();
applyTheme();

function assetPath(relativePath) {
  const cleanPath = String(relativePath || "").replace(/^\/+/, "");
  if (location.protocol === "file:") return cleanPath;
  return `${APP_BASE_PATH}/${cleanPath}`.replace(/\/{2,}/g, "/");
}

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
    theme: state.theme,
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
    if (payload.theme === "light" || payload.theme === "dark") state.theme = payload.theme;
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

function applyTheme() {
  if (typeof document === "undefined") return;
  if (!document.documentElement?.dataset) return;
  document.documentElement.dataset.theme = state.theme;
}

function toggleTheme() {
  state.theme = state.theme === "light" ? "dark" : "light";
  applyTheme();
  saveState();
  render();
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
  if (role === "admin") return ["deliveries", "disputes", "ledger", "orders", "payments", "profiles", "products", "tickets", "withdrawals"];
  if (role === "seller") return ["deliveries", "disputes", "ledger", "orders", "payments", "products", "tickets", "withdrawals"];
  if (role === "buyer") return ["deliveries", "disputes", "ledger", "orders", "payments", "products", "tickets"];
  return ["products"];
}

function productionDataMode() {
  return Boolean(window.SECMARKET_API?.isSupabaseEnabled?.());
}

function mixDemoRows(_collectionName, demoRows, liveRows) {
  return productionDataMode() ? liveRows : [...liveRows, ...demoRows];
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
  state.live = { deliveries: [], disputes: [], ledger: [], orders: [], payments: [], profiles: [], products: [], tickets: [], withdrawals: [] };
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

function normalizeCatalogProduct(product, index = 0) {
  const fallback = window.SECMARKET_DATA.products[index % window.SECMARKET_DATA.products.length];
  const category = product.category || product.cat || fallback.cat;
  const title = product.title || fallback.title;
  const deliveryType = product.deliveryType === "manual" || product.type === "Ручная" ? "Ручная" : "Автовыдача";
  return {
    ...fallback,
    ...product,
    id: product.id,
    title,
    cat: category,
    colors: product.colors || fallback.colors,
    mark: product.mark || String(category || title).slice(0, 2).toUpperCase(),
    price: Number(product.price || fallback.price || 0),
    usd: Number(product.usd || product.price || fallback.usd || fallback.price || 0),
    rating: Number(product.rating || fallback.rating || 4.9),
    sales: Number(product.sales || 0),
    seller: product.seller || product.sellerName || product.sellerId || fallback.seller,
    stock: Number(product.stock ?? fallback.stock ?? 0),
    type: deliveryType,
  };
}

function liveCatalogProducts() {
  return liveItems("products")
    .filter((product) => product.status === "published")
    .map(normalizeCatalogProduct);
}

function catalogProducts() {
  const liveProducts = liveCatalogProducts();
  if (productionDataMode()) return liveProducts;
  const liveIds = new Set(liveProducts.map((product) => String(product.id)));
  return [...liveProducts, ...window.SECMARKET_DATA.products.filter((product) => !liveIds.has(String(product.id)))];
}

function productMatchesSearch(product, query = state.query) {
  const text = `${product.title} ${product.cat} ${product.seller} ${product.type} ${product.subcategory || ""} ${product.platform || ""}`.toLowerCase();
  return text.includes(query.trim().toLowerCase());
}

function filteredProducts(category = "") {
  const cleanCategory = pretty(category).toLowerCase();
  const minRating = state.rating === "any" ? 0 : Number(state.rating);
  const list = catalogProducts().filter((product) => {
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
