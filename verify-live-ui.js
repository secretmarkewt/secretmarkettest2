const fs = require("fs");
const vm = require("vm");

const app = { innerHTML: "" };
const liveState = {
  currency: "USDT",
  live: {
    deliveries: [{ id: "del-live", orderId: 12345, productId: 12345, sellerId: "usr-seller", buyerId: "usr-buyer", secret: "AUTO-LIVE-SECRET", status: "issued" }],
    disputes: [{ id: "DSP-LIVE", orderId: 12345, buyerId: "usr-buyer", sellerId: "usr-seller", reason: "Live UI dispute", evidence: [], decision: "", refundAmount: 0, status: "waiting_support" }],
    ledger: [
      { id: "ledger-live-credit", orderId: 22341, sellerId: "usr-seller", amount: 96, coin: "USDT", type: "escrow_release", status: "posted" },
      { id: "ledger-live-payout", withdrawalId: "WD-OLD", sellerId: "usr-seller", amount: -25, coin: "USDT", type: "payout", status: "posted" },
    ],
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
  URLSearchParams,
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

context.location.pathname = "/";
context.render();
if (!app.innerHTML.includes("Онлайн 24") || !app.innerHTML.includes("Новые товары 12") || app.innerHTML.includes("Онлайн 1 284")) {
  throw new Error("home release metrics did not render honest fallback values");
}

setSession("buyer");
context.location.pathname = "/checkout";
context.render();
if (!app.innerHTML.includes("checkout-layout") || !app.innerHTML.includes("86.60 USDT")) {
  throw new Error("checkout buyer fee summary did not render");
}
if (!app.innerHTML.includes("81.51 USDT")) {
  throw new Error("checkout seller net summary did not render");
}

setSession("seller");
context.location.pathname = "/seller/products";
context.render();
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

context.location.pathname = "/seller/finance";
context.render();
if (!app.innerHTML.includes("Движение средств") || !app.innerHTML.includes("ledger-live-credit")) {
  throw new Error("live seller finance ledger did not render");
}
if (!app.innerHTML.includes("комиссия продавца 4%") || !app.innerHTML.includes("доступно к выводу")) {
  throw new Error("seller finance summary did not render release finance labels");
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
if (!app.innerHTML.includes("AUTO-LIVE-SECRET")) {
  throw new Error("live delivery did not render on order detail");
}

if (!app.innerHTML.includes("order-current") || !app.innerHTML.includes("order-info-grid")) {
  throw new Error("clear order detail layout did not render");
}

if (app.innerHTML.includes('data-live-action="issue-delivery"')) {
  throw new Error("buyer order detail rendered seller delivery action");
}

setSession("seller");
context.location.pathname = "/orders/33412";
context.render();
if (!app.innerHTML.includes('data-live-action="issue-delivery"')) {
  throw new Error("seller order detail did not render delivery action");
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
if (!app.innerHTML.includes("Релизный статус") || !app.innerHTML.includes("Открыть чеклист")) {
  throw new Error("release readiness panel did not render in account settings");
}

setSession("admin");
context.location.pathname = "/admin";
context.render();
if (!app.innerHTML.includes("Релизный статус") || !app.innerHTML.includes("товаров live")) {
  throw new Error("release readiness panel did not render in admin dashboard");
}

context.location.pathname = "/support/ticket";
context.render();
if (!app.innerHTML.includes('data-support-ticket-form')) throw new Error("support ticket form did not render");

context.location.pathname = "/support/requests";
context.render();
if (!app.innerHTML.includes("SUP-LIVE") || !app.innerHTML.includes("Live support ticket")) {
  throw new Error("live support ticket did not render");
}

context.location.pathname = "/support/tickets/SUP-LIVE";
context.render();
if (!app.innerHTML.includes("Live UI ticket") || !app.innerHTML.includes("@buyer")) {
  throw new Error("live support ticket detail did not render");
}

setSession("admin");
context.location.pathname = "/admin/tickets";
context.render();
if (!app.innerHTML.includes("требуют ответа") || !app.innerHTML.includes("/support/tickets/SUP-LIVE")) {
  throw new Error("admin ticket queue did not render live support workflow");
}

context.location.pathname = "/launch-readiness";
context.render();
if (!app.innerHTML.includes("MVP запуск") || !app.innerHTML.includes("Production блокеры")) {
  throw new Error("launch readiness did not render");
}
if (app.innerHTML.includes("РЎ") || app.innerHTML.includes("Рџ")) {
  throw new Error("launch readiness rendered mojibake text");
}

context.location.pathname = "/status-map";
context.render();
if (!app.innerHTML.includes("Статусы оплаты") || !app.innerHTML.includes("Статусы заказа")) {
  throw new Error("status map did not render readable Russian text");
}

console.log("live UI OK");
