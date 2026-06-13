const fs = require("fs");
const os = require("os");
const path = require("path");
const vm = require("vm");
const { createApiServer } = require("./backend/server");
const { createStore } = require("./backend/repository");

(async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "secmarket-api-client-"));
  const server = createApiServer({ store: createStore({ filePath: path.join(tempDir, "db.json") }) });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;

  const storage = new Map();
  const context = {
    fetch,
    window: {},
    localStorage: {
      getItem(key) {
        return storage.get(key) || null;
      },
      setItem(key, value) {
        storage.set(key, String(value));
      },
      removeItem(key) {
        storage.delete(key);
      },
    },
  };
  context.window.window = context.window;
  context.window.localStorage = context.localStorage;
  context.window.fetch = fetch;
  Object.assign(context, context.window);
  vm.createContext(context);

  try {
    for (const file of ["data.js", "api.js"]) {
      vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
    }

    const api = context.window.SECMARKET_API;
    api.setApiBaseUrl(`http://127.0.0.1:${port}`);

    const health = await api.live.health();
    if (!health.ok) throw new Error("live health failed");
    if (health.service !== "secret-market-api" || !health.version) throw new Error("live health metadata failed");
    const heartbeat = await api.live.heartbeat({ clientId: "client-verify", role: "guest", path: "/" });
    if (heartbeat.presence?.clientId !== "client-verify" || heartbeat.metrics?.onlineUsers < 1) {
      throw new Error("live presence heartbeat failed");
    }

    const ready = await fetch(`http://127.0.0.1:${port}/api/ready`).then((response) => response.json());
    if (!ready.ok || ready.snapshot?.products < 1) throw new Error("live ready failed");

    const products = await api.live.list("products");
    if (!Array.isArray(products) || products.length < 1) throw new Error("live products failed");

    const registered = await api.live.register({
      name: "ClientBuyer",
      email: "client.buyer@example.com",
      password: "client-password-123",
      telegram: "@client_buyer",
      role: "buyer",
      promoCode: "WELCOME10",
      promoTitle: "Стартовый бонус",
    });
    if (!registered.token || registered.user?.email !== "client.buyer@example.com" || registered.user?.passwordHash) {
      throw new Error("live register failed");
    }
    if (registered.user?.promoCode !== "WELCOME10") throw new Error("live register promo failed");

    const login = await api.live.login("seller@example.com", "seller");
    if (!login.token || api.getAuthToken() !== login.token) throw new Error("live login token failed");

    const created = await api.live.create("products", { title: "API client product", price: 7, status: "moderation" });
    const patched = await api.live.updateStatus("products", created.id, "published");
    if (patched.status !== "published") throw new Error("live status patch failed");

    const buyerLogin = await api.live.login("buyer@example.com", "buyer");
    if (!buyerLogin.token || api.getAuthToken() !== buyerLogin.token) throw new Error("live buyer login failed");

    const order = await api.live.create("orders", {
      id: "ord-client",
      sellerId: "usr-seller",
      productId: 12345,
      amount: 88.3,
      paymentStatus: "waiting",
      orderStatus: "awaiting_payment",
      escrowStatus: "hold",
      status: "awaiting_payment",
    });
    const payment = await api.live.create("payments", {
      id: "pay-client",
      orderId: order.id,
      amount: order.amount,
      coin: "USDT",
      network: "TRC20",
      address: "TYJmyeYEVHpF2CEZTXheWp1kM6zVUoeWsB",
      confirmations: 0,
      status: "waiting",
    });
    if (order.status !== "awaiting_payment" || payment.orderId !== order.id) throw new Error("live checkout create failed");

    const ticket = await api.live.create("tickets", {
      id: "SUP-CLIENT",
      orderId: order.id,
      topic: "Client support ticket",
      description: "Created by API client verification",
      contact: "@client_buyer",
      messages: [],
      status: "open",
    });
    if (ticket.id !== "SUP-CLIENT" || ticket.ticketNotice?.enabled !== false) throw new Error("live support ticket create failed");

    await api.live.login("seller@example.com", "seller");
    const withdrawal = await api.live.requestWithdrawal({
      amount: 25,
      coin: "USDT",
      network: "TRC20",
      address: "TYJmyeYEVHpF2CEZTXheWp1kM6zVUoeWsB",
    });
    if (withdrawal.withdrawal?.status !== "review") throw new Error("live withdrawal request failed");

    const adminLogin = await api.live.login("support@example.com", "admin");
    if (!adminLogin.token || api.getAuthToken() !== adminLogin.token) throw new Error("live admin login failed");

    const synced = await api.live.syncPayment("pay-12345", { txHash: "TX-CLIENT-SYNC", confirmations: 24 });
    if (synced.payment?.status !== "paid") throw new Error("live payment sync failed");

    const checkoutSynced = await api.live.syncPayment("pay-client", { txHash: "TX-CLIENT-CHECKOUT", confirmations: 24 });
    if (checkoutSynced.payment?.status !== "paid" || checkoutSynced.order?.paymentStatus !== "paid") {
      throw new Error("live checkout payment sync failed");
    }

    await api.live.login("seller@example.com", "seller");
    const delivered = await api.live.issueDelivery("ord-client");
    if (delivered.delivery?.status !== "issued" || !delivered.delivery?.secret || delivered.order?.status !== "awaiting_buyer") {
      throw new Error("live delivery issue failed");
    }

    await api.live.login("buyer@example.com", "buyer");
    const dispute = await api.live.create("disputes", {
      id: "DSP-CLIENT",
      orderId: "ord-client",
      buyerId: "usr-buyer",
      sellerId: "usr-seller",
      reason: "Client verification dispute",
      evidence: [],
      decision: "",
      refundAmount: 0,
      status: "waiting_support",
    });
    const disputedOrder = await api.live.update("orders", "ord-client", {
      orderStatus: "dispute",
      status: "dispute",
      escrowStatus: "hold",
    });
    if (dispute.status !== "waiting_support" || disputedOrder.status !== "dispute") throw new Error("live dispute create failed");

    await api.live.login("support@example.com", "admin");
    const resolvedDispute = await api.live.update("disputes", "DSP-CLIENT", {
      status: "resolved_buyer",
      decision: "Refund buyer in verification",
      refundAmount: 35,
    });
    const refundedOrder = await api.live.update("orders", "ord-client", {
      orderStatus: "refunded",
      status: "refunded",
      escrowStatus: "refunded",
    });
    if (resolvedDispute.status !== "resolved_buyer" || refundedOrder.status !== "refunded") {
      throw new Error("live dispute resolution failed");
    }

    const settled = await api.live.settleWithdrawal(withdrawal.withdrawal.id, { txHash: "TX-CLIENT-OUT", status: "completed" });
    if (settled.withdrawal?.status !== "completed" || settled.ledgerEntry?.type !== "payout") {
      throw new Error("live withdrawal settlement failed");
    }

    console.log("api client OK");
  } finally {
    server.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})();
