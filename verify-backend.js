const { createApiServer } = require("./backend/server");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { calculateCommission } = require("./fees");
const { totpCode } = require("./backend/authSecurity");

function request(port, path, options = {}) {
  return fetch(`http://127.0.0.1:${port}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

(async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "secmarket-api-"));
  const dbFile = path.join(tempDir, "db.json");
  const backupDir = path.join(tempDir, "backups");
  const previousEvidenceDir = process.env.SECMARKET_EVIDENCE_DIR;
  process.env.SECMARKET_EVIDENCE_DIR = path.join(tempDir, "evidence");
  const server = createApiServer({ store: require("./backend/repository").createStore({ filePath: dbFile, backupDir }) });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;

  try {
    const health = await request(port, "/api/health").then((res) => res.json());
    if (!health.ok) throw new Error("health check failed");
    if (health.service !== "secret-market-api" || !health.version || health.storage?.persistent !== true || health.storage?.atomicWrites !== true || health.operations?.backups?.persistent !== true) {
      throw new Error("health metadata failed");
    }
    if (!health.resetEnabled || health.rateLimit?.max < 1) throw new Error("health settings failed");
    if (!health.metrics || health.metrics.totalProducts < 1 || health.metrics.totalOrders < 1 || health.metrics.activeSessions < 0) {
      throw new Error("health metrics failed");
    }
    const heartbeat = await request(port, "/api/presence/heartbeat", {
      method: "POST",
      body: JSON.stringify({ clientId: "verify-client", role: "guest", path: "/" }),
    }).then((res) => res.json());
    if (heartbeat.presence?.clientId !== "verify-client" || heartbeat.metrics?.onlineUsers < 1) {
      throw new Error("presence heartbeat failed");
    }
    const healthWithPresence = await request(port, "/api/health").then((res) => res.json());
    if (healthWithPresence.metrics?.activePresence < 1 || healthWithPresence.metrics?.onlineUsers < 1) {
      throw new Error("health presence metrics failed");
    }
    const healthHeaders = await request(port, "/api/health");
    if (healthHeaders.headers.get("cache-control") !== "no-store" || healthHeaders.headers.get("x-content-type-options") !== "nosniff") {
      throw new Error("api security headers failed");
    }
    const ready = await request(port, "/api/ready");
    const readyBody = await ready.json();
    if (ready.status !== 200 || !readyBody.ok || readyBody.service !== "secret-market-api" || readyBody.snapshot?.products < 1) {
      throw new Error("ready check failed");
    }
    if (!Array.isArray(readyBody.deploymentIssues) || readyBody.deploymentIssues.length !== 0) {
      throw new Error("development ready deployment issues failed");
    }

    const previousNodeEnvForReady = process.env.NODE_ENV;
    const previousOriginsForReady = process.env.SECMARKET_ALLOWED_ORIGINS;
    const previousResetForReady = process.env.SECMARKET_ALLOW_RESET;
    const previousSecretKeyForReady = process.env.SECMARKET_SECRET_KEY;
    const previousTrc20Watcher = process.env.SECMARKET_TRC20_WATCHER_URL;
    const previousTonWatcher = process.env.SECMARKET_TON_WATCHER_URL;
    const previousBep20Watcher = process.env.SECMARKET_BEP20_WATCHER_URL;
    const previousWatcherApiKey = process.env.SECMARKET_PAYMENT_WATCHER_API_KEY;
    const previousWatcherTimeout = process.env.SECMARKET_PAYMENT_WATCHER_TIMEOUT_MS;
    process.env.NODE_ENV = "production";
    delete process.env.SECMARKET_ALLOWED_ORIGINS;
    delete process.env.SECMARKET_ALLOW_RESET;
    delete process.env.SECMARKET_SECRET_KEY;
    delete process.env.SECMARKET_TRC20_WATCHER_URL;
    delete process.env.SECMARKET_TON_WATCHER_URL;
    delete process.env.SECMARKET_BEP20_WATCHER_URL;
    delete process.env.SECMARKET_PAYMENT_WATCHER_API_KEY;
    delete process.env.SECMARKET_PAYMENT_WATCHER_TIMEOUT_MS;
    const unsafeReady = await request(port, "/api/ready").then((res) => ({ status: res.status, body: res.json() }));
    const unsafeReadyBody = await unsafeReady.body;
    if (
      unsafeReady.status !== 503 ||
      !unsafeReadyBody.deploymentIssues?.includes("cors_wildcard_origin") ||
      !unsafeReadyBody.deploymentIssues?.includes("delivery_secret_key_missing") ||
      !unsafeReadyBody.deploymentIssues?.some((issue) => issue.startsWith("payment_watchers_missing:"))
    ) {
      throw new Error("production ready unsafe settings failed");
    }
    process.env.SECMARKET_ALLOWED_ORIGINS = "https://penisxxxl.github.io";
    process.env.SECMARKET_ALLOW_RESET = "false";
    process.env.SECMARKET_SECRET_KEY = "verify-production-secret-key-32-bytes-minimum";
    process.env.SECMARKET_TRC20_WATCHER_URL = "https://watchers.example.test/trc20";
    process.env.SECMARKET_TON_WATCHER_URL = "https://watchers.example.test/ton";
    process.env.SECMARKET_BEP20_WATCHER_URL = "https://watchers.example.test/bep20";
    process.env.SECMARKET_PAYMENT_WATCHER_API_KEY = "verify-watcher-key";
    process.env.SECMARKET_PAYMENT_WATCHER_TIMEOUT_MS = "4500";
    const safeReady = await request(port, "/api/ready").then((res) => ({ status: res.status, body: res.json() }));
    const safeReadyBody = await safeReady.body;
    if (safeReady.status !== 200 || !safeReadyBody.ok || safeReadyBody.deploymentIssues.length !== 0) {
      throw new Error("production ready safe settings failed");
    }
    if (safeReadyBody.paymentWatchers?.TRC20?.configured === false) {
      throw new Error("production ready watcher metadata failed");
    }
    if (safeReadyBody.paymentWatchers?.TRC20?.endpoint !== "https://watchers.example.test/trc20" || safeReadyBody.paymentWatchers?.TRC20?.timeoutMs !== 4500 || safeReadyBody.paymentWatchers?.TRC20?.apiKeyConfigured !== true) {
      throw new Error("production ready watcher safe details failed");
    }
    if (previousNodeEnvForReady === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnvForReady;
    if (previousOriginsForReady === undefined) delete process.env.SECMARKET_ALLOWED_ORIGINS;
    else process.env.SECMARKET_ALLOWED_ORIGINS = previousOriginsForReady;
    if (previousResetForReady === undefined) delete process.env.SECMARKET_ALLOW_RESET;
    else process.env.SECMARKET_ALLOW_RESET = previousResetForReady;
    if (previousSecretKeyForReady === undefined) delete process.env.SECMARKET_SECRET_KEY;
    else process.env.SECMARKET_SECRET_KEY = previousSecretKeyForReady;
    if (previousTrc20Watcher === undefined) delete process.env.SECMARKET_TRC20_WATCHER_URL;
    else process.env.SECMARKET_TRC20_WATCHER_URL = previousTrc20Watcher;
    if (previousTonWatcher === undefined) delete process.env.SECMARKET_TON_WATCHER_URL;
    else process.env.SECMARKET_TON_WATCHER_URL = previousTonWatcher;
    if (previousBep20Watcher === undefined) delete process.env.SECMARKET_BEP20_WATCHER_URL;
    else process.env.SECMARKET_BEP20_WATCHER_URL = previousBep20Watcher;
    if (previousWatcherApiKey === undefined) delete process.env.SECMARKET_PAYMENT_WATCHER_API_KEY;
    else process.env.SECMARKET_PAYMENT_WATCHER_API_KEY = previousWatcherApiKey;
    if (previousWatcherTimeout === undefined) delete process.env.SECMARKET_PAYMENT_WATCHER_TIMEOUT_MS;
    else process.env.SECMARKET_PAYMENT_WATCHER_TIMEOUT_MS = previousWatcherTimeout;

    const resetSnapshot = await request(port, "/api/reset", { method: "POST" }).then((res) => res.json());
    if (!resetSnapshot.products || !resetSnapshot.audit) throw new Error("reset route failed");
    if (!fs.readdirSync(backupDir).some((fileName) => fileName.includes("before-reset"))) {
      throw new Error("reset backup failed");
    }

    const previousReset = process.env.SECMARKET_ALLOW_RESET;
    process.env.SECMARKET_ALLOW_RESET = "false";
    const blockedReset = await request(port, "/api/reset", { method: "POST" });
    if (blockedReset.status !== 403) throw new Error("disabled reset route failed");
    if (previousReset === undefined) delete process.env.SECMARKET_ALLOW_RESET;
    else process.env.SECMARKET_ALLOW_RESET = previousReset;

    const previousNodeEnv = process.env.NODE_ENV;
    delete process.env.SECMARKET_ALLOW_RESET;
    process.env.NODE_ENV = "production";
    const productionDefaultReset = await request(port, "/api/reset", { method: "POST" });
    if (productionDefaultReset.status !== 403) throw new Error("production reset default failed");
    process.env.SECMARKET_ALLOW_RESET = "true";
    const productionExplicitReset = await request(port, "/api/reset", { method: "POST" });
    if (productionExplicitReset.status !== 200) throw new Error("production explicit reset failed");
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousReset === undefined) delete process.env.SECMARKET_ALLOW_RESET;
    else process.env.SECMARKET_ALLOW_RESET = previousReset;

    const previousRateMax = process.env.SECMARKET_RATE_LIMIT_MAX;
    const previousRateWindow = process.env.SECMARKET_RATE_LIMIT_WINDOW_MS;
    process.env.SECMARKET_RATE_LIMIT_MAX = "1";
    process.env.SECMARKET_RATE_LIMIT_WINDOW_MS = "60000";
    const rateLimitHeaders = { "X-Forwarded-For": "203.0.113.77" };
    const firstLimitedClientRequest = await request(port, "/api/health", { headers: rateLimitHeaders });
    const secondLimitedClientRequest = await request(port, "/api/health", { headers: rateLimitHeaders });
    if (firstLimitedClientRequest.status !== 200 || secondLimitedClientRequest.status !== 429) throw new Error("rate limit failed");
    if (previousRateMax === undefined) delete process.env.SECMARKET_RATE_LIMIT_MAX;
    else process.env.SECMARKET_RATE_LIMIT_MAX = previousRateMax;
    if (previousRateWindow === undefined) delete process.env.SECMARKET_RATE_LIMIT_WINDOW_MS;
    else process.env.SECMARKET_RATE_LIMIT_WINDOW_MS = previousRateWindow;

    const previousOrigins = process.env.SECMARKET_ALLOWED_ORIGINS;
    process.env.SECMARKET_ALLOWED_ORIGINS = "https://penisxxxl.github.io,http://127.0.0.1:4173";
    const preflight = await request(port, "/api/products", {
      method: "OPTIONS",
      headers: { Origin: "https://penisxxxl.github.io" },
    });
    if (preflight.status !== 204 || preflight.headers.get("access-control-allow-origin") !== "https://penisxxxl.github.io") throw new Error("cors preflight failed");
    const blockedOrigin = await request(port, "/api/health", {
      headers: { Origin: "https://example.com" },
    });
    if (blockedOrigin.status !== 403) throw new Error("cors blocked origin failed");
    if (previousOrigins === undefined) delete process.env.SECMARKET_ALLOWED_ORIGINS;
    else process.env.SECMARKET_ALLOWED_ORIGINS = previousOrigins;

    const products = await request(port, "/api/products").then((res) => res.json());
    if (!Array.isArray(products.items) || products.items.length < 1) throw new Error("products list failed");

    const previousTelegramToken = process.env.SECMARKET_TELEGRAM_BOT_TOKEN;
    delete process.env.SECMARKET_TELEGRAM_BOT_TOKEN;
    const registered = await request(port, "/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "LaunchBuyer",
        email: "launch.buyer@example.com",
        password: "safe-password-123",
        telegram: "@launch_buyer",
        role: "buyer",
        promoCode: "WELCOME10",
      }),
    }).then((res) => res.json());
    if (!registered.token || registered.user?.email !== "launch.buyer@example.com" || registered.user?.passwordHash) {
      throw new Error("auth register failed");
    }
    if (registered.user?.promoCode !== "WELCOME10" || registered.user?.promoTitle !== "Стартовый бонус") {
      throw new Error("auth register promo failed");
    }
    if (registered.registrationNotice?.enabled !== false || registered.registrationNotice?.sent !== false) {
      throw new Error("disabled telegram registration notice failed");
    }
    const duplicateRegister = await request(port, "/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "LaunchBuyer", email: "launch.buyer@example.com", password: "safe-password-123", telegram: "@launch_buyer", role: "buyer" }),
    });
    if (duplicateRegister.status !== 409) throw new Error("duplicate register guard failed");
    const invalidRegister = await request(port, "/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "X", email: "bad", password: "short", telegram: "@bad", role: "admin" }),
    });
    if (invalidRegister.status !== 422) throw new Error("invalid register guard failed");
    const invalidPromoRegister = await request(port, "/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "PromoBuyer", email: "promo.buyer@example.com", password: "safe-password-123", telegram: "@promo_buyer", role: "buyer", promoCode: "SELLERSTART" }),
    });
    if (invalidPromoRegister.status !== 422) throw new Error("invalid promo role guard failed");
    const registeredLogin = await request(port, "/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "launch.buyer@example.com", role: "buyer", password: "safe-password-123" }),
    }).then((res) => res.json());
    if (!registeredLogin.token || registeredLogin.user?.id !== registered.user.id) throw new Error("registered user login failed");
    const twoFactorSetup = await request(port, "/api/auth/2fa/setup", {
      method: "POST",
      headers: authHeader(registeredLogin.token),
    }).then((res) => res.json());
    if (!twoFactorSetup.secret || !twoFactorSetup.otpauthUrl) throw new Error("2fa setup failed");
    const twoFactorEnabled = await request(port, "/api/auth/2fa/enable", {
      method: "POST",
      headers: authHeader(registeredLogin.token),
      body: JSON.stringify({ code: totpCode(twoFactorSetup.secret) }),
    }).then((res) => res.json());
    if (!twoFactorEnabled.ok || !twoFactorEnabled.user?.twoFactorEnabled || twoFactorEnabled.user?.twoFactorSecretEncrypted) {
      throw new Error("2fa enable failed");
    }
    const twoFactorChallenge = await request(port, "/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "launch.buyer@example.com", role: "buyer", password: "safe-password-123" }),
    }).then((res) => ({ status: res.status, body: res.json() }));
    const twoFactorChallengeBody = await twoFactorChallenge.body;
    if (twoFactorChallenge.status !== 202 || !twoFactorChallengeBody.twoFactorRequired) throw new Error("2fa challenge failed");
    const twoFactorRejected = await request(port, "/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "launch.buyer@example.com", role: "buyer", password: "safe-password-123", otpCode: "000000" }),
    });
    if (twoFactorRejected.status !== 401) throw new Error("2fa reject failed");
    const twoFactorLogin = await request(port, "/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "launch.buyer@example.com", role: "buyer", password: "safe-password-123", otpCode: totpCode(twoFactorSetup.secret) }),
    }).then((res) => res.json());
    if (!twoFactorLogin.token || twoFactorLogin.user?.twoFactorSecretEncrypted) throw new Error("2fa login failed");
    const resetRequest = await request(port, "/api/auth/password-reset/request", {
      method: "POST",
      body: JSON.stringify({ email: "launch.buyer@example.com", role: "buyer" }),
    }).then((res) => res.json());
    if (!resetRequest.ok || !resetRequest.resetToken) throw new Error("password reset request failed");
    const resetConfirm = await request(port, "/api/auth/password-reset/confirm", {
      method: "POST",
      body: JSON.stringify({ token: resetRequest.resetToken, password: "new-safe-password-123" }),
    }).then((res) => res.json());
    if (!resetConfirm.ok) throw new Error("password reset confirm failed");
    const resetRevokedSession = await request(port, "/api/auth/session", {
      headers: authHeader(twoFactorLogin.token),
    });
    if (resetRevokedSession.status !== 401) throw new Error("password reset session revoke failed");
    const oldPasswordLogin = await request(port, "/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "launch.buyer@example.com", role: "buyer", password: "safe-password-123", otpCode: totpCode(twoFactorSetup.secret) }),
    });
    if (oldPasswordLogin.status !== 401) throw new Error("password reset old password guard failed");
    const newPasswordLogin = await request(port, "/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "launch.buyer@example.com", role: "buyer", password: "new-safe-password-123", otpCode: totpCode(twoFactorSetup.secret) }),
    }).then((res) => res.json());
    if (!newPasswordLogin.token) throw new Error("password reset new password login failed");
    const switchedToSeller = await request(port, "/api/auth/role", {
      method: "POST",
      headers: authHeader(newPasswordLogin.token),
      body: JSON.stringify({ role: "seller" }),
    }).then((res) => res.json());
    if (switchedToSeller.user?.role !== "seller" || switchedToSeller.session?.role !== "seller") {
      throw new Error("role switch to seller failed");
    }
    const roleSession = await request(port, "/api/auth/session", {
      headers: authHeader(newPasswordLogin.token),
    }).then((res) => res.json());
    if (roleSession.user?.role !== "seller" || roleSession.session?.role !== "seller") {
      throw new Error("role switch session failed");
    }
    const deniedAdminRole = await request(port, "/api/auth/role", {
      method: "POST",
      headers: authHeader(newPasswordLogin.token),
      body: JSON.stringify({ role: "admin" }),
    });
    if (deniedAdminRole.status !== 422) throw new Error("role switch admin guard failed");
    const switchedBackToBuyer = await request(port, "/api/auth/role", {
      method: "POST",
      headers: authHeader(newPasswordLogin.token),
      body: JSON.stringify({ role: "buyer" }),
    }).then((res) => res.json());
    if (switchedBackToBuyer.user?.role !== "buyer") throw new Error("role switch back failed");
    if (previousTelegramToken === undefined) delete process.env.SECMARKET_TELEGRAM_BOT_TOKEN;
    else process.env.SECMARKET_TELEGRAM_BOT_TOKEN = previousTelegramToken;

    const rejectedLogin = await request(port, "/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "buyer@example.com", role: "buyer", password: "wrong" }),
    });
    if (rejectedLogin.status !== 401) throw new Error("password guard failed");

    const login = await request(port, "/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "buyer@example.com", role: "buyer", password: "password" }),
    }).then((res) => res.json());
    if (!login.token || login.user?.role !== "buyer") throw new Error("auth login failed");
    if (login.user?.passwordHash) throw new Error("public user leaked password hash");

    const session = await request(port, "/api/auth/session", {
      headers: authHeader(login.token),
    }).then((res) => res.json());
    if (session.user?.id !== "usr-buyer" || session.session?.status !== "active") throw new Error("auth session failed");

    const sellerLogin = await request(port, "/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "seller@example.com", role: "seller", password: "password" }),
    }).then((res) => res.json());
    if (!sellerLogin.token || sellerLogin.user?.role !== "seller") throw new Error("seller auth login failed");

    const adminLogin = await request(port, "/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "support@example.com", role: "admin", password: "password" }),
    }).then((res) => res.json());
    if (!adminLogin.token || adminLogin.user?.role !== "admin") throw new Error("admin auth login failed");
    const manualBackup = await request(port, "/api/admin/backups", {
      method: "POST",
      headers: authHeader(adminLogin.token),
      body: JSON.stringify({ reason: "verify-manual" }),
    }).then((res) => res.json());
    if (!manualBackup.ok || !fs.existsSync(manualBackup.backupPath)) throw new Error("manual backup failed");
    const backupList = await request(port, "/api/admin/backups", {
      headers: authHeader(adminLogin.token),
    }).then((res) => res.json());
    if (!backupList.items?.some((item) => item.fileName === manualBackup.fileName) || backupList.storage?.backupPersistent !== true) {
      throw new Error("backup list failed");
    }
    const buyerBackup = await request(port, "/api/admin/backups", {
      method: "POST",
      headers: authHeader(login.token),
      body: JSON.stringify({ reason: "buyer-denied" }),
    });
    if (buyerBackup.status !== 403) throw new Error("manual backup role guard failed");

    const initialBalance = await request(port, "/api/balance", {
      headers: authHeader(login.token),
    }).then((res) => res.json());
    if (initialBalance.availableBalance !== 120) throw new Error("balance overview failed");

    const deposit = await request(port, "/api/deposit", {
      method: "POST",
      headers: authHeader(login.token),
      body: JSON.stringify({ amount: 10, paymentMethod: "USDT TRC20", idempotencyKey: "verify-deposit-1" }),
    }).then((res) => res.json());
    if (deposit.transaction?.status !== "pending") throw new Error("deposit request failed");
    const duplicateDeposit = await request(port, "/api/deposit", {
      method: "POST",
      headers: authHeader(login.token),
      body: JSON.stringify({ amount: 10, paymentMethod: "USDT TRC20", idempotencyKey: "verify-deposit-1" }),
    }).then((res) => res.json());
    if (!duplicateDeposit.idempotent || duplicateDeposit.transaction?.id !== deposit.transaction.id) throw new Error("deposit idempotency failed");
    const approvedDeposit = await request(port, `/api/admin/transactions/${deposit.transaction.id}/approve`, {
      method: "POST",
      headers: authHeader(adminLogin.token),
    }).then((res) => res.json());
    if (approvedDeposit.balance?.availableBalance !== 130) throw new Error("deposit approve balance failed");
    const approvedDepositAgain = await request(port, `/api/admin/transactions/${deposit.transaction.id}/approve`, {
      method: "POST",
      headers: authHeader(adminLogin.token),
    }).then((res) => res.json());
    if (!approvedDepositAgain.alreadyProcessed || approvedDepositAgain.balance?.availableBalance !== 130) throw new Error("deposit double approve guard failed");

    const withdrawalTx = await request(port, "/api/withdraw", {
      method: "POST",
      headers: authHeader(login.token),
      body: JSON.stringify({ amount: 25, network: "TRC20", address: "TYJmyeYEVHpF2CEZTXheWp1kM6zVUoeWsB", idempotencyKey: "verify-withdraw-1" }),
    }).then((res) => res.json());
    if (withdrawalTx.balance?.frozenBalance !== 25 || withdrawalTx.balance?.availableBalance !== 105) throw new Error("withdraw freeze failed");
    const rejectedWithdrawalTx = await request(port, `/api/admin/transactions/${withdrawalTx.transaction.id}/reject`, {
      method: "POST",
      headers: authHeader(adminLogin.token),
      body: JSON.stringify({ reason: "verify reject" }),
    }).then((res) => res.json());
    if (rejectedWithdrawalTx.balance?.frozenBalance !== 0 || rejectedWithdrawalTx.balance?.availableBalance !== 130) throw new Error("withdraw reject refund failed");

    const buyerTransactions = await request(port, "/api/transactions", {
      headers: authHeader(login.token),
    }).then((res) => res.json());
    if (!buyerTransactions.items.every((item) => item.userId === "usr-buyer")) throw new Error("transaction ownership failed");

    const deniedAudit = await request(port, "/api/audit", {
      headers: authHeader(login.token),
    });
    if (deniedAudit.status !== 403) throw new Error("role guard failed");

    const buyerOrders = await request(port, "/api/orders", {
      headers: authHeader(login.token),
    }).then((res) => res.json());
    if (buyerOrders.items.some((order) => order.id === 90001)) throw new Error("buyer order ownership filter failed");

    const deniedOrder = await request(port, "/api/orders/90001", {
      headers: authHeader(login.token),
    });
    if (deniedOrder.status !== 404) throw new Error("buyer order ownership detail failed");

    const buyerPayments = await request(port, "/api/payments", {
      headers: authHeader(login.token),
    }).then((res) => res.json());
    if (buyerPayments.items.some((payment) => payment.id === "pay-90001")) throw new Error("buyer payment ownership filter failed");

    const ticket = await request(port, "/api/tickets", {
      method: "POST",
      headers: authHeader(login.token),
      body: JSON.stringify({
        id: "SUP-BACKEND",
        orderId: 12345,
        topic: "Backend support ticket",
        description: "Payment was not found in backend verification",
        contact: "@backend_buyer",
        messages: [],
        status: "open",
      }),
    }).then((res) => res.json());
    if (ticket.id !== "SUP-BACKEND" || ticket.userId !== "usr-buyer" || ticket.ticketNotice?.enabled !== false) {
      throw new Error("support ticket create failed");
    }
    const evidence = await request(port, "/api/evidence", {
      method: "POST",
      headers: authHeader(login.token),
      body: JSON.stringify({
        targetType: "ticket",
        targetId: "SUP-BACKEND",
        fileName: "payment-proof.txt",
        mimeType: "text/plain",
        contentBase64: Buffer.from("payment proof").toString("base64"),
      }),
    }).then((res) => res.json());
    if (evidence.evidence?.status !== "stored" || evidence.evidence?.contentBase64 || evidence.evidence?.size !== 13) {
      throw new Error("evidence storage failed");
    }
    const evidenceList = await request(port, "/api/evidence", {
      headers: authHeader(login.token),
    }).then((res) => res.json());
    if (!evidenceList.items.some((item) => item.id === evidence.evidence.id && item.targetId === "SUP-BACKEND")) {
      throw new Error("evidence ownership list failed");
    }

    const invalidTicket = await request(port, "/api/tickets", {
      method: "POST",
      headers: authHeader(login.token),
      body: JSON.stringify({ id: "SUP-BAD", orderId: 12345, topic: "", description: "" }),
    });
    if (invalidTicket.status !== 422) throw new Error("support ticket validation failed");

    const adminOrders = await request(port, "/api/orders", {
      headers: authHeader(adminLogin.token),
    }).then((res) => res.json());
    if (!adminOrders.items.some((order) => order.id === 90001)) throw new Error("admin ownership bypass failed");

    const watcherOrder = await request(port, "/api/orders", {
      method: "POST",
      headers: authHeader(adminLogin.token),
      body: JSON.stringify({
        id: 88001,
        buyerId: "usr-buyer",
        sellerId: "usr-seller",
        productId: 12345,
        amount: 9,
        paymentStatus: "waiting",
        orderStatus: "awaiting_payment",
        escrowStatus: "hold",
        status: "awaiting_payment",
      }),
    }).then((res) => res.json());
    if (watcherOrder.status !== "awaiting_payment") throw new Error("watcher order create failed");
    const watcherFees = calculateCommission(9);
    if (watcherOrder.amount !== watcherFees.itemAmount || watcherOrder.buyerTotal !== watcherFees.buyerTotal || watcherOrder.sellerNet !== watcherFees.sellerNet) {
      throw new Error("watcher order commission fields failed");
    }

    const watcherPayment = await request(port, "/api/payments", {
      method: "POST",
      headers: authHeader(adminLogin.token),
      body: JSON.stringify({
        id: "pay-watch",
        orderId: 88001,
        amount: 9,
        coin: "USDT",
        network: "TRC20",
        address: "TYJmyeYEVHpF2CEZTXheWp1kM6zVUoeWsB",
        confirmations: 0,
        status: "waiting",
      }),
    }).then((res) => res.json());
    if (watcherPayment.status !== "waiting") throw new Error("watcher payment create failed");
    if (watcherPayment.amount !== watcherFees.buyerTotal || watcherPayment.itemAmount !== watcherFees.itemAmount || watcherPayment.sellerNet !== watcherFees.sellerNet) {
      throw new Error("watcher payment commission fields failed");
    }

    const deniedSync = await request(port, "/api/payments/pay-watch/sync", {
      method: "POST",
      headers: authHeader(login.token),
      body: JSON.stringify({ txHash: "TX-WATCH", confirmations: 3 }),
    });
    if (deniedSync.status !== 403) throw new Error("payment watcher role guard failed");

    const synced = await request(port, "/api/payments/pay-watch/sync", {
      method: "POST",
      headers: authHeader(adminLogin.token),
      body: JSON.stringify({ txHash: "TX-WATCH", confirmations: 3 }),
    }).then((res) => res.json());
    if (synced.payment?.status !== "paid" || synced.order?.paymentStatus !== "paid") throw new Error("payment watcher sync failed");

    const problemOrder = await request(port, "/api/orders", {
      method: "POST",
      headers: authHeader(adminLogin.token),
      body: JSON.stringify({
        id: 88002,
        buyerId: "usr-buyer",
        sellerId: "usr-seller",
        productId: 12345,
        amount: 11,
        paymentStatus: "waiting",
        orderStatus: "awaiting_payment",
        escrowStatus: "hold",
        status: "awaiting_payment",
      }),
    }).then((res) => res.json());
    if (problemOrder.status !== "awaiting_payment") throw new Error("problem order create failed");

    await request(port, "/api/payments", {
      method: "POST",
      headers: authHeader(adminLogin.token),
      body: JSON.stringify({
        id: "pay-problem",
        orderId: 88002,
        amount: 11,
        coin: "USDT",
        network: "TRC20",
        address: "TYJmyeYEVHpF2CEZTXheWp1kM6zVUoeWsB",
        confirmations: 0,
        status: "waiting",
      }),
    }).then((res) => res.json());

    const problemPayment = await request(port, "/api/payments/pay-problem/sync", {
      method: "POST",
      headers: authHeader(adminLogin.token),
      body: JSON.stringify({ txHash: "TX-PROBLEM", confirmations: 1, status: "network_error", adminNote: "wrong network" }),
    }).then((res) => res.json());
    if (problemPayment.payment?.status !== "network_error" || problemPayment.order?.paymentStatus !== "network_error") {
      throw new Error("payment manual error sync failed");
    }
    if (problemPayment.order?.status !== "awaiting_payment") throw new Error("payment manual error order state failed");

    const delivered = await request(port, "/api/orders/88001/deliver", {
      method: "POST",
      headers: authHeader(sellerLogin.token),
    }).then((res) => res.json());
    if (delivered.delivery?.status !== "issued" || delivered.order?.status !== "awaiting_buyer") throw new Error("auto delivery failed");
    if (!delivered.delivery?.secret || !delivered.delivery?.secretMasked) throw new Error("auto delivery reveal failed");
    if (!(delivered.product?.stock < 42)) throw new Error("auto delivery stock failed");

    const deliveryList = await request(port, "/api/deliveries", {
      headers: authHeader(login.token),
    }).then((res) => res.json());
    if (!deliveryList.items.some((delivery) => delivery.orderId === 88001)) throw new Error("delivery ownership failed");
    if (!deliveryList.items.some((delivery) => delivery.orderId === 88001 && delivery.secret && delivery.secretMasked)) {
      throw new Error("delivery reveal list failed");
    }

    const secondDelivery = await request(port, "/api/orders/88001/deliver", {
      method: "POST",
      headers: authHeader(sellerLogin.token),
    }).then((res) => res.json());
    if (!secondDelivery.alreadyIssued) throw new Error("auto delivery idempotency failed");

    const sellerConfirm = await request(port, "/api/orders/88001/confirm", {
      method: "POST",
      headers: authHeader(sellerLogin.token),
    });
    if (sellerConfirm.status !== 403) throw new Error("seller confirm guard failed");

    const confirmed = await request(port, "/api/orders/88001/confirm", {
      method: "POST",
      headers: authHeader(login.token),
    }).then((res) => res.json());
    if (confirmed.order?.status !== "completed" || confirmed.order?.escrowStatus !== "released") throw new Error("order confirm failed");
    if (confirmed.ledgerEntry?.type !== "escrow_release") throw new Error("ledger release failed");
    if (confirmed.ledgerEntry?.amount !== watcherFees.sellerNet || confirmed.ledgerEntry?.platformFeeTotal !== watcherFees.platformFeeTotal) {
      throw new Error("ledger release commission failed");
    }

    const sellerLedger = await request(port, "/api/ledger", {
      headers: authHeader(sellerLogin.token),
    }).then((res) => res.json());
    if (!sellerLedger.items.some((entry) => entry.orderId === 88001 && entry.type === "escrow_release")) throw new Error("seller ledger visibility failed");

    const withdrawalBalance = await request(port, "/api/withdrawals/balance", {
      headers: authHeader(sellerLogin.token),
    }).then((res) => res.json());
    if (!(withdrawalBalance.availableBalance > 0)) throw new Error("withdrawal balance failed");

    const buyerWithdrawalBalance = await request(port, "/api/withdrawals/balance", {
      headers: authHeader(login.token),
    });
    if (buyerWithdrawalBalance.status !== 403) throw new Error("buyer withdrawal guard failed");

    const buyerRefundDenied = await request(port, "/api/orders/12345/refund", {
      method: "POST",
      headers: authHeader(login.token),
      body: JSON.stringify({ refundAmount: 20, reason: "buyer denied" }),
    });
    if (buyerRefundDenied.status !== 403) throw new Error("refund role guard failed");

    const refunded = await request(port, "/api/orders/12345/refund", {
      method: "POST",
      headers: authHeader(adminLogin.token),
      body: JSON.stringify({ refundAmount: 20, reason: "verify partial refund", disputeId: 123 }),
    }).then((res) => res.json());
    if (refunded.order?.status !== "refunded" || refunded.transaction?.amount !== 20 || refunded.ledgerEntry?.type !== "refund") {
      throw new Error("order refund failed");
    }
    if (refunded.balance?.availableBalance !== 150 || refunded.dispute?.status !== "partial_refund") {
      throw new Error("order refund balance or dispute failed");
    }
    const refundedAgain = await request(port, "/api/orders/12345/refund", {
      method: "POST",
      headers: authHeader(adminLogin.token),
      body: JSON.stringify({ refundAmount: 20, reason: "verify duplicate" }),
    }).then((res) => res.json());
    if (!refundedAgain.alreadyRefunded || refundedAgain.balance?.availableBalance !== 150) {
      throw new Error("order refund idempotency failed");
    }

    const withdrawalRequest = await request(port, "/api/withdrawals", {
      method: "POST",
      headers: authHeader(sellerLogin.token),
      body: JSON.stringify({
        amount: 25,
        grossAmount: 25,
        coin: "USDT",
        network: "TRC20",
        address: "TYJmyeYEVHpF2CEZTXheWp1kM6zVUoeWsB",
        networkFee: 1,
        netAmount: 24,
      }),
    }).then((res) => res.json());
    if (withdrawalRequest.withdrawal?.status !== "review" || withdrawalRequest.withdrawal?.sellerId !== "usr-seller") throw new Error("withdrawal request failed");
    if (withdrawalRequest.withdrawal?.networkFee !== 1 || withdrawalRequest.withdrawal?.netAmount !== 24 || withdrawalRequest.withdrawal?.grossAmount !== 25) {
      throw new Error("withdrawal fee fields failed");
    }

    const sellerPayoutBatch = await request(port, "/api/withdrawals/batch", {
      method: "POST",
      headers: authHeader(sellerLogin.token),
      body: JSON.stringify({ ids: [withdrawalRequest.withdrawal.id] }),
    });
    if (sellerPayoutBatch.status !== 403) throw new Error("payout batch role guard failed");

    const payoutBatch = await request(port, "/api/withdrawals/batch", {
      method: "POST",
      headers: authHeader(adminLogin.token),
      body: JSON.stringify({ ids: [withdrawalRequest.withdrawal.id] }),
    }).then((res) => res.json());
    if (payoutBatch.batch?.withdrawalCount !== 1 || payoutBatch.batch?.totalNet !== 24) throw new Error("payout batch totals failed");
    if (!String(payoutBatch.csv || "").includes(withdrawalRequest.withdrawal.id)) throw new Error("payout batch csv failed");
    if (payoutBatch.withdrawals?.[0]?.status !== "processing" || payoutBatch.withdrawals?.[0]?.batchId !== payoutBatch.batch.id) {
      throw new Error("payout batch withdrawal patch failed");
    }

    const payoutExport = await request(port, `/api/withdrawals/export?ids=${withdrawalRequest.withdrawal.id}&statuses=processing`, {
      headers: authHeader(adminLogin.token),
    }).then((res) => res.json());
    if (payoutExport.rows?.length !== 1 || !String(payoutExport.csv || "").includes("grossAmount")) throw new Error("payout export failed");

    const sellerSettleWithdrawal = await request(port, `/api/withdrawals/${withdrawalRequest.withdrawal.id}/settle`, {
      method: "POST",
      headers: authHeader(sellerLogin.token),
      body: JSON.stringify({ txHash: "TX-OUT-SELLER", status: "completed" }),
    });
    if (sellerSettleWithdrawal.status !== 403) throw new Error("withdrawal settle role guard failed");

    const settledWithdrawal = await request(port, `/api/withdrawals/${withdrawalRequest.withdrawal.id}/settle`, {
      method: "POST",
      headers: authHeader(adminLogin.token),
      body: JSON.stringify({ txHash: "TX-OUT-25", status: "completed" }),
    }).then((res) => res.json());
    if (settledWithdrawal.withdrawal?.status !== "completed" || settledWithdrawal.withdrawal?.txHash !== "TX-OUT-25") {
      throw new Error("withdrawal settle failed");
    }
    if (settledWithdrawal.ledgerEntry?.type !== "payout" || settledWithdrawal.ledgerEntry?.amount !== -25) {
      throw new Error("withdrawal payout ledger failed");
    }

    const settledAgain = await request(port, `/api/withdrawals/${withdrawalRequest.withdrawal.id}/settle`, {
      method: "POST",
      headers: authHeader(adminLogin.token),
      body: JSON.stringify({ txHash: "TX-OUT-25", status: "completed" }),
    }).then((res) => res.json());
    if (!settledAgain.alreadySettled || settledAgain.ledgerEntry?.amount !== -25) throw new Error("withdrawal settle idempotency failed");

    const sellerWithdrawals = await request(port, "/api/withdrawals", {
      headers: authHeader(sellerLogin.token),
    }).then((res) => res.json());
    if (!sellerWithdrawals.items.some((item) => item.id === withdrawalRequest.withdrawal.id)) throw new Error("seller withdrawal visibility failed");

    const overWithdrawal = await request(port, "/api/withdrawals", {
      method: "POST",
      headers: authHeader(sellerLogin.token),
      body: JSON.stringify({
        amount: 99999,
        coin: "USDT",
        network: "TRC20",
        address: "TYJmyeYEVHpF2CEZTXheWp1kM6zVUoeWsB",
      }),
    });
    if (overWithdrawal.status !== 422) throw new Error("withdrawal balance guard failed");

    const invalidWithdrawalFee = await request(port, "/api/withdrawals", {
      method: "POST",
      headers: authHeader(sellerLogin.token),
      body: JSON.stringify({
        amount: 1,
        coin: "USDT",
        network: "TRC20",
        address: "TYJmyeYEVHpF2CEZTXheWp1kM6zVUoeWsB",
        networkFee: 1,
      }),
    });
    if (invalidWithdrawalFee.status !== 422) throw new Error("withdrawal network fee guard failed");

    const confirmedAgain = await request(port, "/api/orders/88001/confirm", {
      method: "POST",
      headers: authHeader(login.token),
    }).then((res) => res.json());
    if (!confirmedAgain.alreadyConfirmed) throw new Error("order confirm idempotency failed");

    const created = await request(port, "/api/products", {
      method: "POST",
      headers: authHeader(sellerLogin.token),
      body: JSON.stringify({ title: "Discord Nitro 1 мес", category: "discord", price: 8.5, stock: 10, status: "moderation" }),
    }).then((res) => res.json());
    if (!created.id) throw new Error("product create failed");

    const stockedProduct = await request(port, `/api/products/${created.id}`, {
      method: "PATCH",
      headers: authHeader(sellerLogin.token),
      body: JSON.stringify({
        deliveryType: "auto",
        deliverySecrets: ["NITRO-CODE-1", "NITRO-CODE-2"],
      }),
    }).then((res) => res.json());
    if (stockedProduct.deliverySecrets || stockedProduct.deliverySecretsEncrypted || stockedProduct.deliverySecretsCount !== 2) {
      throw new Error("product delivery secret sanitization failed");
    }

    const patched = await request(port, `/api/products/${created.id}/status`, {
      method: "PATCH",
      headers: authHeader(sellerLogin.token),
      body: JSON.stringify({ status: "published" }),
    }).then((res) => res.json());
    if (patched.status !== "published") throw new Error("product status patch failed");
    if (patched.deliverySecretsEncrypted || patched.deliverySecretsCount !== 2) throw new Error("product patch secret sanitization failed");

    const secretOrder = await request(port, "/api/orders", {
      method: "POST",
      headers: authHeader(adminLogin.token),
      body: JSON.stringify({
        id: 99001,
        buyerId: "usr-buyer",
        sellerId: "usr-seller",
        productId: created.id,
        amount: 8.5,
        paymentStatus: "paid",
        orderStatus: "paid",
        escrowStatus: "hold",
        status: "paid",
      }),
    }).then((res) => res.json());
    if (secretOrder.status !== "paid") throw new Error("secret inventory order create failed");

    const inventoryDelivery = await request(port, "/api/orders/99001/deliver", {
      method: "POST",
      headers: authHeader(sellerLogin.token),
    }).then((res) => res.json());
    if (inventoryDelivery.delivery?.secret !== "NITRO-CODE-1") throw new Error("encrypted inventory delivery failed");
    if (inventoryDelivery.product?.deliverySecretsEncrypted || inventoryDelivery.product?.deliverySecretsCount !== 1) {
      throw new Error("encrypted inventory consume failed");
    }

    const audit = await request(port, "/api/audit", {
      headers: authHeader(adminLogin.token),
    }).then((res) => res.json());
    if (!Array.isArray(audit.items) || audit.items.length < 2) throw new Error("audit log failed");
    if (!audit.items.some((item) => item.actorId === "usr-seller" && item.resource === "products")) throw new Error("audit actor failed");

    const persisted = JSON.parse(fs.readFileSync(dbFile, "utf8"));
    if (!persisted.products.some((product) => product.id === created.id && product.status === "published")) {
      throw new Error("file persistence failed");
    }
    const storedSecretProduct = persisted.products.find((product) => product.id === created.id);
    if (storedSecretProduct.deliverySecrets || storedSecretProduct.deliverySecretsEncrypted?.length !== 1 || storedSecretProduct.deliverySecretsEncrypted[0] === "NITRO-CODE-2") {
      throw new Error("encrypted product inventory persistence failed");
    }
    const storedDelivery = persisted.deliveries.find((delivery) => delivery.orderId === 88001);
    if (!storedDelivery?.secretEncrypted || storedDelivery.secret) throw new Error("encrypted delivery persistence failed");
    const storedEvidence = persisted.evidence.find((item) => item.id === evidence.evidence.id);
    if (!storedEvidence?.storageKey || !fs.existsSync(path.join(process.env.SECMARKET_EVIDENCE_DIR, storedEvidence.storageKey))) {
      throw new Error("evidence file persistence failed");
    }

    const logout = await request(port, "/api/auth/logout", {
      method: "POST",
      headers: authHeader(login.token),
    }).then((res) => res.json());
    if (!logout.ok) throw new Error("auth logout failed");

    const revoked = await request(port, "/api/auth/session", {
      headers: authHeader(login.token),
    });
    if (revoked.status !== 401) throw new Error("revoked session validation failed");

    const rejected = await request(port, `/api/products/${created.id}/status`, {
      method: "PATCH",
      headers: authHeader(sellerLogin.token),
      body: JSON.stringify({ status: "bad-status" }),
    });
    if (rejected.status !== 422) throw new Error("invalid status validation failed");

    const invalidJson = await request(port, "/api/products", {
      method: "POST",
      headers: authHeader(sellerLogin.token),
      body: "{broken-json",
    });
    if (invalidJson.status !== 400) throw new Error("invalid json validation failed");

    console.log("backend OK");
  } finally {
    server.close();
    if (previousEvidenceDir === undefined) delete process.env.SECMARKET_EVIDENCE_DIR;
    else process.env.SECMARKET_EVIDENCE_DIR = previousEvidenceDir;
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})();
