const fs = require("fs");
const vm = require("vm");

const app = { innerHTML: "" };
const liveState = {
  currency: "USDT",
  live: {
    deliveries: [{ id: "del-live", orderId: 12345, productId: 12345, sellerId: "usr-seller", buyerId: "usr-buyer", secret: "AUTO-LIVE-SECRET", status: "issued" }],
    disputes: [{ id: "DSP-LIVE", orderId: 12345, buyerId: "usr-buyer", sellerId: "usr-seller", reason: "Live UI dispute", evidence: [], decision: "", refundAmount: 0, status: "waiting_support" }],
    ledger: [],
    orders: [{ id: 12345, buyerId: "usr-buyer", sellerId: "usr-seller", productId: 12345, amount: 88.3, paymentStatus: "paid", status: "awaiting_buyer" }],
    payments: [{ id: "pay-live", orderId: 12345, amount: 88.3, coin: "USDT", network: "TRC20", txHash: "TX-LIVE-UI", confirmations: 24, status: "paid" }],
    products: [{ id: "products-live", sellerId: "usr-seller", title: "Live UI Product", category: "discord", price: 8.5, stock: 10, deliveryType: "auto", status: "moderation" }],
    tickets: [{ id: "SUP-LIVE", orderId: 12345, userId: "usr-buyer", topic: "Live support ticket", description: "Live UI ticket", contact: "@buyer", status: "open" }],
    withdrawals: [{ id: "WD-LIVE", sellerId: "usr-seller", amount: 25, coin: "USDT", network: "TRC20", address: "TYJmyeYEVHpF2CEZTXheWp1kM6zVUoeWsB", status: "review" }],
  },
};

const storage = {
  "secmarket-demo-state": JSON.stringify(liveState),
  "secmarket-session": JSON.stringify({
    role: "seller",
    user: { id: "usr-seller", name: "Live Seller", email: "seller@example.com", role: "seller", status: "active" },
  }),
};

function setSession(role) {
  const userId = role === "admin" ? "usr-admin" : role === "seller" ? "usr-seller" : "usr-buyer";
  storage["secmarket-session"] = JSON.stringify({
    role,
    user: { id: userId, name: `Live ${role}`, email: `${role}@example.com`, role, status: "active" },
  });
}

const context = {
  window: {
    clearTimeout() {},
    setTimeout() {
      return 1;
    },
    innerWidth: 1024,
  },
  document: {
    querySelector(selector) {
      return selector === "#app" ? app : null;
    },
    querySelectorAll() {
      return [];
    },
  },
  location: {
    protocol: "https:",
    hostname: "localhost",
    pathname: "/seller/products",
    hash: "",
  },
  history: {
    pushState(_state, _title, path) {
      context.location.pathname = path;
    },
  },
  localStorage: {
    getItem(key) {
      return storage[key] || null;
    },
    setItem(key, value) {
      storage[key] = String(value);
    },
    removeItem(key) {
      delete storage[key];
    },
  },
  navigator: {},
  scrollTo() {},
  addEventListener() {},
  fetch() {
    throw new Error("fetch should not run in render verification");
  },
};

context.window.window = context.window;
context.window.document = context.document;
context.window.location = context.location;
context.window.history = context.history;
context.window.localStorage = context.localStorage;
context.window.navigator = context.navigator;
context.window.scrollTo = context.scrollTo;
context.window.addEventListener = context.addEventListener;
context.window.fetch = context.fetch;
Object.assign(context, context.window);
vm.createContext(context);

[
  "data.js",
  "routes.js",
  "models.js",
  "api.js",
  "validation.js",
  "session.js",
  "ui.js",
  "state.js",
  "selectors.js",
  "renderers/catalog.js",
  "renderers/account.js",
  "renderers/seller.js",
  "renderers/admin.js",
  "renderers/info.js",
  "renderers/support.js",
  "router.js",
  "events.js",
  "app.js",
].forEach((file) => vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file }));

if (!app.innerHTML.includes("Live UI Product")) throw new Error("live seller product did not render");

setSession("admin");
context.location.pathname = "/admin/payments";
context.render();
if (!app.innerHTML.includes("TX-LIVE-UI")) throw new Error("live admin payment did not render");

context.location.pathname = "/admin/payments/pay-live";
context.render();
if (!app.innerHTML.includes('data-payment-review-form') || !app.innerHTML.includes('data-live-action="mark-payment-error"')) {
  throw new Error("live admin payment review form did not render");
}

context.location.pathname = "/admin/payouts/WD-LIVE";
context.render();
if (!app.innerHTML.includes('data-payout-form') || !app.innerHTML.includes("К получению")) {
  throw new Error("live admin payout form did not render");
}

setSession("seller");
context.location.pathname = "/seller/withdraw";
context.render();
if (!app.innerHTML.includes("WD-LIVE")) throw new Error("live withdrawal did not render");
if (!app.innerHTML.includes('data-withdrawal-form') || !app.innerHTML.includes('data-withdrawal-net')) {
  throw new Error("withdrawal fee form did not render");
}

setSession("buyer");
context.location.pathname = "/account/orders";
context.render();
if (!app.innerHTML.includes("Product #12345") && !app.innerHTML.includes("Robux")) throw new Error("live account order did not render");

setSession("seller");
context.location.pathname = "/seller/orders";
context.render();
if (!app.innerHTML.includes("Product #12345") && !app.innerHTML.includes("Robux")) throw new Error("live seller order did not render");

setSession("buyer");
context.location.pathname = "/orders/12345";
context.render();
if (!app.innerHTML.includes("AUTO-LIVE-SECRET") || !app.innerHTML.includes("Товар выдан")) {
  throw new Error("live delivery did not render on order detail");
}

setSession("buyer");
context.location.pathname = "/disputes";
context.render();
if (!app.innerHTML.includes("DSP-LIVE") || !app.innerHTML.includes("Live UI dispute")) {
  throw new Error("live dispute did not render in list");
}

setSession("admin");
context.location.pathname = "/disputes/DSP-LIVE";
context.render();
if (!app.innerHTML.includes("Live UI dispute")) throw new Error("live dispute detail did not render");
if (!app.innerHTML.includes('data-live-action="resolve-dispute"')) throw new Error("live dispute resolution action did not render");
if (!app.innerHTML.includes('data-dispute-resolution-form') || !app.innerHTML.includes('name="refundAmount"')) {
  throw new Error("live dispute resolution form did not render");
}

setSession("buyer");
context.location.pathname = "/account/settings";
context.render();
if (!app.innerHTML.includes("Live API") || !app.innerHTML.includes('data-api-settings-form')) {
  throw new Error("live API settings did not render");
}

context.location.pathname = "/support/ticket";
context.render();
if (!app.innerHTML.includes('data-support-ticket-form')) throw new Error("support ticket form did not render");

context.location.pathname = "/support/requests";
context.render();
if (!app.innerHTML.includes("SUP-LIVE") || !app.innerHTML.includes("Live support ticket")) {
  throw new Error("live support ticket did not render");
}

context.location.pathname = "/launch-readiness";
context.render();
if (!app.innerHTML.includes("MVP запуск") || !app.innerHTML.includes("Production блокеры")) {
  throw new Error("launch readiness did not render");
}

console.log("live UI OK");
