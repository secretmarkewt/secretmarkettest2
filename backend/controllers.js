const crypto = require("crypto");
const {
  confirmPasswordReset,
  disableTwoFactor,
  enableTwoFactor,
  requestPasswordReset,
  startTwoFactorSetup,
  verifyTotp,
} = require("./authSecurity");
const { decryptSecret, vaultConfigured } = require("./cryptoVault");
const { issueDelivery, revealDelivery } = require("./deliveryService");
const { createEvidence, ownsTarget } = require("./evidenceStorage");
const { confirmOrder } = require("./escrowService");
const { resourceModels } = require("./models");
const { missingWatcherNetworks, syncPayment, watcherReadiness } = require("./paymentWatcher");
const { refundOrder } = require("./refundService");
const { validateCreate, validatePatch } = require("./validators");
const {
  createWithdrawalBatch,
  requestWithdrawal,
  sellerAvailableBalance,
  settleWithdrawal,
  withdrawalBatchCsv,
  withdrawalBatchRows,
} = require("./withdrawalService");
const {
  approveTransaction,
  balanceForUser,
  createAdjustment,
  createDeposit,
  createWithdrawal,
  ownedTransactions,
  rejectTransaction,
} = require("./balanceService");
const { hashPassword, verifyPassword } = require("./passwords");
const { notifyRegistration, notifyTicket } = require("./telegramNotifier");
const { calculateCommission } = require("../fees");
const packageInfo = require("../package.json");

const PROMO_CODES = [
  { code: "WELCOME10", title: "Стартовый бонус", role: "buyer", status: "active" },
  { code: "SELLERSTART", title: "Бонус продавца", role: "seller", status: "active" },
  { code: "VIP2026", title: "VIP-доступ", role: "buyer", status: "active" },
];

function normalizePromoCode(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}

function promoCodeByCode(value) {
  const code = normalizePromoCode(value);
  return PROMO_CODES.find((promo) => promo.code === code && promo.status === "active") || null;
}

const rateBuckets = new Map();

function allowedOrigins() {
  return String(process.env.SECMARKET_ALLOWED_ORIGINS || "*")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function originAllowed(req) {
  const origin = req.headers.origin;
  const origins = allowedOrigins();
  return !origin || origins.includes("*") || origins.includes(origin);
}

function resetAllowed() {
  if (process.env.SECMARKET_ALLOW_RESET !== undefined) {
    return String(process.env.SECMARKET_ALLOW_RESET).toLowerCase() !== "false";
  }
  return String(process.env.NODE_ENV || "development").toLowerCase() !== "production";
}

function isProduction() {
  return String(process.env.NODE_ENV || "development").toLowerCase() === "production";
}

function rateLimitSettings() {
  return {
    max: Number(process.env.SECMARKET_RATE_LIMIT_MAX || 240),
    windowMs: Number(process.env.SECMARKET_RATE_LIMIT_WINDOW_MS || 60_000),
  };
}

function clientIp(req) {
  return String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "local")
    .split(",")[0]
    .trim();
}

function checkRateLimit(req) {
  const { max, windowMs } = rateLimitSettings();
  if (!max || max < 1 || !windowMs || windowMs < 1) return { limited: false, max: 0, remaining: Infinity, retryAfter: 0 };

  const now = Date.now();
  const key = clientIp(req);
  const current = rateBuckets.get(key);
  const bucket = current && current.resetAt > now ? current : { count: 0, resetAt: now + windowMs };
  bucket.count += 1;
  rateBuckets.set(key, bucket);

  if (rateBuckets.size > 1000) {
    for (const [bucketKey, value] of rateBuckets.entries()) {
      if (value.resetAt <= now) rateBuckets.delete(bucketKey);
    }
  }

  return {
    limited: bucket.count > max,
    max,
    remaining: Math.max(0, max - bucket.count),
    retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

function rateLimitHeaders(rateLimit) {
  return {
    "Retry-After": String(rateLimit.retryAfter),
    "X-RateLimit-Limit": String(rateLimit.max),
    "X-RateLimit-Remaining": String(rateLimit.remaining),
  };
}

function healthPayload(store) {
  const rateLimit = rateLimitSettings();
  const snapshot = store.snapshot ? store.snapshot() : {};
  const now = Date.now();
  const presenceTtlMs = Number(process.env.SECMARKET_PRESENCE_TTL_MS || 90_000);
  const activePresence = store.list("presence").filter((presence) => (
    presence.status === "online" &&
    presence.lastSeenAt &&
    now - new Date(presence.lastSeenAt).getTime() <= presenceTtlMs
  )).length;
  const activeSessions = store.list("sessions").filter((session) => (
    session.status === "active" &&
    (!session.expiresAt || new Date(session.expiresAt).getTime() > now)
  )).length;
  const publishedProducts = store.list("products").filter((product) => (
    product.status === "published" || product.status === "active"
  )).length;
  const completedOrders = store.list("orders").filter((order) => (
    order.status === "completed" || order.orderStatus === "completed"
  )).length;
  return {
    ok: true,
    service: "secret-market-api",
    version: packageInfo.version,
    environment: process.env.NODE_ENV || "development",
    storage: store.meta ? store.meta() : { persistent: false },
    cors: {
      allowedOrigins: allowedOrigins(),
    },
    resetEnabled: resetAllowed(),
    rateLimit: {
      max: rateLimit.max,
      windowMs: rateLimit.windowMs,
    },
    paymentWatchers: watcherReadiness(),
    operations: {
      backups: {
        configured: Boolean(store.meta?.().backupConfigured),
        persistent: Boolean(store.meta?.().backupPersistent),
      },
    },
    metrics: {
      activeSessions,
      activePresence,
      onlineUsers: activePresence || activeSessions,
      publishedProducts,
      completedOrders,
      presenceTtlMs,
      totalProducts: snapshot.products || 0,
      totalOrders: snapshot.orders || 0,
    },
  };
}

function readyPayload(store) {
  const readiness = store.ready ? store.ready() : { ok: false, missingCollections: ["store.ready"], storage: {}, snapshot: {} };
  const deploymentIssues = deploymentReadinessIssues(readiness.storage);
  return {
    ...readiness,
    ok: readiness.ok && deploymentIssues.length === 0,
    deploymentIssues,
    paymentWatchers: watcherReadiness(),
    service: "secret-market-api",
    checkedAt: new Date().toISOString(),
  };
}

function upsertPresence(store, payload = {}) {
  const now = new Date().toISOString();
  const clientId = String(payload.clientId || "").trim().slice(0, 80);
  if (!clientId) return { error: "client_id_required" };
  const id = `presence-${clientId}`;
  const existing = store.find("presence", id);
  const nextPayload = {
    clientId,
    userId: String(payload.userId || "guest").slice(0, 80),
    role: String(payload.role || "guest").slice(0, 32),
    path: String(payload.path || "/").slice(0, 160),
    status: "online",
    lastSeenAt: now,
  };
  const presence = existing
    ? store.patch("presence", id, nextPayload)
    : store.create("presence", { id, ...nextPayload });
  return { presence };
}

function deploymentReadinessIssues(storage = {}) {
  if (!isProduction()) return [];

  const issues = [];
  const origins = allowedOrigins();
  const rateLimit = rateLimitSettings();
  if (origins.includes("*")) issues.push("cors_wildcard_origin");
  if (resetAllowed()) issues.push("reset_enabled");
  if (!storage.persistent || !storage.configured) issues.push("storage_not_configured");
  if (!storage.backupPersistent || !storage.backupConfigured) issues.push("backup_storage_not_configured");
  if (!rateLimit.max || rateLimit.max < 1 || !rateLimit.windowMs || rateLimit.windowMs < 1) issues.push("rate_limit_disabled");
  if (!vaultConfigured()) issues.push("delivery_secret_key_missing");
  const missingWatchers = missingWatcherNetworks();
  if (missingWatchers.length) issues.push(`payment_watchers_missing:${missingWatchers.join(",")}`);
  return issues;
}

function securityHeaders() {
  return {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  };
}

function corsHeaders(req) {
  const origin = req.headers.origin;
  const origins = allowedOrigins();
  const allowOrigin = origins.includes("*") ? "*" : origins.includes(origin) ? origin : origins[0] || "";
  return {
    ...(allowOrigin ? { "Access-Control-Allow-Origin": allowOrigin } : {}),
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin",
  };
}

function json(req, res, status, body, extraHeaders = {}) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...securityHeaders(), ...corsHeaders(req), ...extraHeaders });
  res.end(JSON.stringify(body, null, 2));
  return true;
}

function empty(req, res, status) {
  res.writeHead(status, { ...securityHeaders(), ...corsHeaders(req) });
  res.end();
  return true;
}

function notFound(req, res) {
  return json(req, res, 404, { error: "not_found" });
}

function authToken() {
  return `sec_${crypto.randomBytes(24).toString("hex")}`;
}

function readBearerToken(req) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");
  return type?.toLowerCase() === "bearer" ? token : "";
}

function publicUser(user) {
  if (!user) return null;
  const {
    email,
    passwordHash,
    telegram,
    twoFactorPendingSecretEncrypted,
    twoFactorSecretEncrypted,
    ...safeUser
  } = user;
  return { ...safeUser, email, telegram };
}

function resolveSession(req, store) {
  const token = readBearerToken(req);
  if (!token) return null;
  const session = store.list("sessions").find((candidate) => candidate.token === token && candidate.status === "active");
  if (!session || new Date(session.expiresAt).getTime() <= Date.now()) return null;
  const user = store.find("users", session.userId);
  if (!user || user.status !== "active") return null;
  return { session, user };
}

function allowedRoles(resource, method) {
  if (resource === "products" && method === "GET") return ["guest", "buyer", "seller", "admin"];
  if (["audit", "sessions", "users", "moderation"].includes(resource)) return ["admin"];
  if (resource === "transactions") return ["buyer", "seller", "admin"];
  if (resource === "products") return ["seller", "admin"];
  if (resource === "withdrawals") return ["seller", "admin"];
  if (["orders", "payments", "deliveries", "ledger", "disputes", "tickets", "evidence"].includes(resource)) return ["buyer", "seller", "admin"];
  return ["admin"];
}

function relatedOrderFor(resource, item, store) {
  if (resource === "payments" || resource === "deliveries" || resource === "tickets") return store.find("orders", item.orderId);
  return null;
}

function isOwnedBy(resource, item, auth, store) {
  if (!auth.user || auth.user.role === "admin") return true;
  if (resource === "products") return item.sellerId === auth.user.id;
  if (resource === "orders" || resource === "disputes") return item.buyerId === auth.user.id || item.sellerId === auth.user.id;
  if (resource === "deliveries") return item.buyerId === auth.user.id || item.sellerId === auth.user.id;
  if (resource === "ledger") return item.buyerId === auth.user.id || item.sellerId === auth.user.id;
  if (resource === "withdrawals") return item.sellerId === auth.user.id;
  if (resource === "transactions") return item.userId === auth.user.id;
  if (resource === "tickets") {
    const order = relatedOrderFor(resource, item, store);
    return item.userId === auth.user.id || order?.buyerId === auth.user.id || order?.sellerId === auth.user.id;
  }
  if (resource === "evidence") {
    return item.userId === auth.user.id || ownsTarget(store, auth, item.targetType, item.targetId);
  }
  if (resource === "payments") {
    const order = relatedOrderFor(resource, item, store);
    return order?.buyerId === auth.user.id || order?.sellerId === auth.user.id;
  }
  return true;
}

function visibleItems(resource, auth, store) {
  const items = store.list(resource).filter((item) => isOwnedBy(resource, item, auth, store));
  if (resource === "deliveries") return items.map(revealDelivery);
  return items;
}

function withCommissionFields(payload, itemAmount) {
  return {
    ...payload,
    ...calculateCommission(itemAmount),
  };
}

function normalizeCreatePayload(resource, payload, auth, store) {
  let normalized = payload;
  if (resource === "orders") {
    const fees = calculateCommission(payload.itemAmount ?? payload.amount ?? 0);
    normalized = { ...withCommissionFields(payload, fees.itemAmount), amount: fees.itemAmount };
  } else if (resource === "payments") {
    const order = store.find("orders", payload.orderId);
    const sourceAmount = order?.itemAmount ?? order?.amount ?? payload.itemAmount ?? payload.amount ?? 0;
    const fees = calculateCommission(sourceAmount);
    normalized = { ...withCommissionFields(payload, fees.itemAmount), amount: fees.buyerTotal };
  }

  if (!auth.user || auth.user.role === "admin") return normalized;
  if (resource === "products") return { ...normalized, sellerId: auth.user.id };
  if (resource === "orders" && auth.user.role === "buyer") return { ...normalized, buyerId: auth.user.id };
  if (resource === "tickets") return { ...normalized, userId: auth.user.id };
  return normalized;
}

async function notifyTicketSafely(ticket) {
  try {
    return await notifyTicket(ticket);
  } catch (error) {
    return { enabled: true, sent: false, error: error.message };
  }
}

function authorize(req, res, store, resource) {
  const roles = allowedRoles(resource, req.method);
  if (roles.includes("guest")) return { role: "guest", user: null, session: null };

  const auth = resolveSession(req, store);
  if (!auth) {
    json(req, res, 401, { error: "auth_required" });
    return null;
  }

  if (!roles.includes(auth.user.role)) {
    json(req, res, 403, { error: "forbidden", requiredRoles: roles });
    return null;
  }

  return auth;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error("invalid_json");
    error.status = 400;
    throw error;
  }
}

async function handleAuth(req, res, store, id, action) {
  if (id === "register" && req.method === "POST") {
    const payload = await readBody(req);
    const name = String(payload.name || payload.nickname || "").trim();
    const email = String(payload.email || "").trim().toLowerCase();
    const password = String(payload.password || "");
    const telegram = String(payload.telegram || "").trim();
    const role = String(payload.role || "buyer").trim().toLowerCase();
    const promoCode = normalizePromoCode(payload.promoCode);
    const promo = promoCode ? promoCodeByCode(promoCode) : null;

    const errors = [];
    if (name.length < 2) errors.push("name_required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("email_invalid");
    if (password.length < 8) errors.push("password_min_8");
    if (!["buyer", "seller"].includes(role)) errors.push("role_invalid");
    if (promoCode && !promo) errors.push("promo_invalid");
    if (promo && promo.role !== "any" && promo.role !== role) errors.push("promo_role_mismatch");
    if (errors.length) return json(req, res, 422, { errors });

    const existing = store.list("users").find((candidate) => (
      String(candidate.email || "").toLowerCase() === email &&
      String(candidate.role || "").toLowerCase() === role
    ));
    if (existing) return json(req, res, 409, { error: "user_already_exists" });

    const user = store.create("users", {
      id: `usr-${role}-${Date.now()}`,
      role,
      name,
      email,
      telegram,
      promoCode,
      promoTitle: promo?.title || "",
      passwordHash: hashPassword(password),
      status: "active",
      _actorId: "registration",
    });

    let notification;
    try {
      notification = await notifyRegistration(user);
    } catch (error) {
      notification = { enabled: true, sent: false, error: error.message };
    }

    const session = store.create("sessions", {
      userId: user.id,
      role: user.role,
      token: authToken(),
      status: "active",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
      _actorId: user.id,
    });

    return json(req, res, 201, {
      token: session.token,
      user: publicUser(user),
      expiresAt: session.expiresAt,
      registrationNotice: notification,
    });
  }

  if (id === "login" && req.method === "POST") {
    const payload = await readBody(req);
    const email = String(payload.email || "").trim().toLowerCase();
    const password = String(payload.password || "");
    const role = String(payload.role || "buyer").trim().toLowerCase();
    const user = store.list("users").find((candidate) => (
      String(candidate.email || "").toLowerCase() === email &&
      String(candidate.role || "").toLowerCase() === role &&
      candidate.status === "active"
    ));

    if (!user) return json(req, res, 401, { error: "invalid_credentials" });
    if (user.passwordHash && !verifyPassword(password, user.passwordHash)) {
      return json(req, res, 401, { error: "invalid_credentials" });
    }
    if (user.twoFactorEnabled) {
      if (!payload.otpCode) return json(req, res, 202, { twoFactorRequired: true, challenge: "totp" });
      const secret = decryptSecret(user.twoFactorSecretEncrypted || "");
      if (!secret || !verifyTotp(secret, payload.otpCode)) {
        return json(req, res, 401, { error: "two_factor_code_invalid" });
      }
    }

    const session = store.create("sessions", {
      userId: user.id,
      role: user.role,
      token: authToken(),
      status: "active",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
      _actorId: user.id,
    });

    return json(req, res, 201, { token: session.token, user: publicUser(user), expiresAt: session.expiresAt });
  }

  if (id === "role" && req.method === "POST") {
    const auth = resolveSession(req, store);
    if (!auth) return json(req, res, 401, { error: "auth_required" });
    const payload = await readBody(req);
    const nextRole = String(payload.role || "").trim().toLowerCase();
    if (!["buyer", "seller"].includes(nextRole)) return json(req, res, 422, { error: "role_invalid" });
    if (auth.user.role === "admin") return json(req, res, 403, { error: "admin_role_locked" });
    if (auth.user.role === nextRole) return json(req, res, 200, { user: publicUser(auth.user), session: auth.session, unchanged: true });
    const duplicate = store.list("users").find((candidate) => (
      candidate.id !== auth.user.id &&
      String(candidate.email || "").toLowerCase() === String(auth.user.email || "").toLowerCase() &&
      String(candidate.role || "").toLowerCase() === nextRole
    ));
    if (duplicate) return json(req, res, 409, { error: "target_role_account_exists" });
    const user = store.patch("users", auth.user.id, { role: nextRole, _actorId: auth.user.id });
    const session = store.patch("sessions", auth.session.id, { role: nextRole, _actorId: auth.user.id });
    return json(req, res, 200, { user: publicUser(user), session });
  }

  if (id === "password-reset" && action === "request" && req.method === "POST") {
    return json(req, res, 200, requestPasswordReset(store, await readBody(req)));
  }

  if (id === "password-reset" && action === "confirm" && req.method === "POST") {
    const result = confirmPasswordReset(store, await readBody(req));
    if (result.error === "user_not_found") return notFound(req, res);
    if (result.error) return json(req, res, 422, result);
    return json(req, res, 200, result);
  }

  if (id === "2fa" && req.method === "POST") {
    const auth = resolveSession(req, store);
    if (!auth) return json(req, res, 401, { error: "auth_required" });
    if (action === "setup") return json(req, res, 201, startTwoFactorSetup(store, auth));
    if (action === "enable") {
      const result = enableTwoFactor(store, auth, await readBody(req));
      if (result.error) return json(req, res, 422, result);
      return json(req, res, 200, { ok: true, user: publicUser(result.user) });
    }
    if (action === "disable") {
      const result = disableTwoFactor(store, auth, await readBody(req));
      if (result.error === "invalid_credentials") return json(req, res, 401, result);
      if (result.error) return json(req, res, 422, result);
      return json(req, res, 200, { ok: true, user: publicUser(result.user) });
    }
  }

  if (id === "session" && req.method === "GET") {
    const auth = resolveSession(req, store);
    if (!auth) return json(req, res, 401, { error: "session_expired" });
    return json(req, res, 200, { user: publicUser(auth.user), session: auth.session });
  }

  if (id === "logout" && req.method === "POST") {
    const token = readBearerToken(req);
    const session = store.list("sessions").find((candidate) => candidate.token === token && candidate.status === "active");
    if (!session) return json(req, res, 200, { ok: true });
    store.patch("sessions", session.id, { status: "revoked", _actorId: session.userId });
    return json(req, res, 200, { ok: true });
  }

  return json(req, res, 404, { error: "auth_route_not_found" });
}

async function handleApi(req, res, store) {
  const url = new URL(req.url, "http://127.0.0.1");
  const parts = url.pathname.split("/").filter(Boolean);
  const [apiPrefix, resource, id, action] = parts;

  if (apiPrefix !== "api") return false;
  if (!originAllowed(req)) return json(req, res, 403, { error: "origin_not_allowed" });
  if (req.method === "OPTIONS") return empty(req, res, 204);
  const rateLimit = checkRateLimit(req);
  if (rateLimit.limited) return json(req, res, 429, { error: "rate_limited", retryAfter: rateLimit.retryAfter }, rateLimitHeaders(rateLimit));
  if (resource === "health") return json(req, res, 200, healthPayload(store));
  if (resource === "ready") {
    const readiness = readyPayload(store);
    return json(req, res, readiness.ok ? 200 : 503, readiness);
  }
  if (resource === "snapshot") return json(req, res, 200, store.snapshot());
  if (resource === "admin" && parts[2] === "backups" && req.method === "POST") {
    const auth = authorize(req, res, store, "users");
    if (!auth) return true;
    const body = await readBody(req);
    return json(req, res, 201, store.backup?.(body.reason || "admin-manual", auth.user.id) || { ok: false, error: "backup_unavailable" });
  }
  if (resource === "admin" && parts[2] === "transactions" && parts[4] && req.method === "POST") {
    const auth = authorize(req, res, store, "users");
    if (!auth) return true;
    const body = await readBody(req);
    const result = parts[4] === "approve"
      ? approveTransaction(store, parts[3], auth.user.id)
      : parts[4] === "reject"
        ? rejectTransaction(store, parts[3], auth.user.id, body.reason || body.comment || "")
        : { error: "admin_transaction_action_not_found" };
    if (result.error === "transaction_not_found") return notFound(req, res);
    if (result.error) return json(req, res, 422, result);
    return json(req, res, 200, result);
  }
  if (resource === "admin" && parts[2] === "users" && parts[4] === "balance-adjustment" && req.method === "POST") {
    const auth = authorize(req, res, store, "users");
    if (!auth) return true;
    const result = createAdjustment(store, parts[3], await readBody(req), auth.user.id);
    if (result.error === "user_not_found") return notFound(req, res);
    if (result.error) return json(req, res, 422, result);
    return json(req, res, 201, result);
  }
  if (resource === "balance" && req.method === "GET") {
    const auth = authorize(req, res, store, "transactions");
    if (!auth) return true;
    return json(req, res, 200, balanceForUser(store, auth.user.id));
  }
  if (resource === "transactions" && req.method === "GET") {
    const auth = authorize(req, res, store, "transactions");
    if (!auth) return true;
    return json(req, res, 200, { items: ownedTransactions(store, auth) });
  }
  if (resource === "deposit" && req.method === "POST") {
    const auth = authorize(req, res, store, "transactions");
    if (!auth) return true;
    const result = createDeposit(store, auth.user.id, await readBody(req));
    if (result.error) return json(req, res, 422, result);
    return json(req, res, 201, result);
  }
  if (resource === "withdraw" && req.method === "POST") {
    const auth = authorize(req, res, store, "transactions");
    if (!auth) return true;
    const result = createWithdrawal(store, auth.user.id, await readBody(req));
    if (result.error) return json(req, res, 422, result);
    return json(req, res, 201, result);
  }
  if (resource === "presence" && id === "heartbeat" && req.method === "POST") {
    const result = upsertPresence(store, await readBody(req));
    if (result.error) return json(req, res, 422, { error: result.error });
    return json(req, res, 200, { ...result, metrics: healthPayload(store).metrics });
  }
  if (resource === "reset" && req.method === "POST") {
    if (!resetAllowed()) return json(req, res, 403, { error: "reset_disabled" });
    return json(req, res, 200, store.reset());
  }
  if (resource === "auth") return handleAuth(req, res, store, id, action);
  if (!resourceModels[resource]) return notFound(req, res);
  const auth = authorize(req, res, store, resource);
  if (!auth) return true;

  if (resource === "payments" && action === "sync" && req.method === "POST") {
    if (auth.user?.role !== "admin") return json(req, res, 403, { error: "forbidden", requiredRoles: ["admin"] });
    const existing = store.find(resource, id);
    if (!existing) return notFound(req, res);
    const payload = await readBody(req);
    return json(req, res, 200, await syncPayment(store, id, { actorId: auth.user.id, payload }));
  }

  if (resource === "orders" && action === "deliver" && req.method === "POST") {
    const existing = store.find(resource, id);
    if (!existing || !isOwnedBy(resource, existing, auth, store)) return notFound(req, res);
    const result = issueDelivery(store, id, { actorId: auth.user?.id });
    if (result.error) return json(req, res, 422, { error: result.error });
    return json(req, res, 200, result);
  }

  if (resource === "orders" && action === "confirm" && req.method === "POST") {
    const existing = store.find(resource, id);
    if (!existing || !isOwnedBy(resource, existing, auth, store)) return notFound(req, res);
    if (auth.user?.role === "seller" && existing.buyerId !== auth.user.id) return json(req, res, 403, { error: "buyer_confirmation_required" });
    const result = confirmOrder(store, id, { actorId: auth.user?.id });
    if (result.error) return json(req, res, 422, { error: result.error });
    return json(req, res, 200, result);
  }

  if (resource === "orders" && action === "refund" && req.method === "POST") {
    if (auth.user?.role !== "admin") return json(req, res, 403, { error: "forbidden", requiredRoles: ["admin"] });
    const existing = store.find(resource, id);
    if (!existing) return notFound(req, res);
    const result = refundOrder(store, id, await readBody(req), { actorId: auth.user.id });
    if (result.error === "order_not_found" || result.error === "buyer_not_found") return notFound(req, res);
    if (result.error) return json(req, res, 422, result);
    return json(req, res, 200, result);
  }

  if (resource === "withdrawals" && id === "balance" && req.method === "GET") {
    if (auth.user?.role !== "seller") return json(req, res, 403, { error: "seller_required" });
    return json(req, res, 200, { sellerId: auth.user.id, availableBalance: sellerAvailableBalance(store, auth.user.id) });
  }

  if (resource === "withdrawals" && id === "export" && req.method === "GET") {
    if (auth.user?.role !== "admin") return json(req, res, 403, { error: "forbidden", requiredRoles: ["admin"] });
    const statuses = url.searchParams.get("statuses") || "review,processing";
    const ids = url.searchParams.get("ids") ? url.searchParams.get("ids").split(",") : null;
    const rows = withdrawalBatchRows(store, { statuses, ids });
    return json(req, res, 200, { rows, csv: withdrawalBatchCsv(store, { statuses, ids }) });
  }

  if (resource === "withdrawals" && id === "batch" && req.method === "POST") {
    if (auth.user?.role !== "admin") return json(req, res, 403, { error: "forbidden", requiredRoles: ["admin"] });
    const result = createWithdrawalBatch(store, await readBody(req), { actorId: auth.user.id });
    if (result.error) return json(req, res, 422, result);
    return json(req, res, 201, result);
  }

  if (resource === "withdrawals" && req.method === "POST" && !id) {
    if (auth.user?.role !== "seller" && auth.user?.role !== "admin") return json(req, res, 403, { error: "seller_required" });
    const payload = await readBody(req);
    const validation = validateCreate(resource, payload);
    if (!validation.ok) return json(req, res, 422, { errors: validation.errors });
    const result = requestWithdrawal(store, payload, {
      actorId: auth.user?.id,
      sellerId: auth.user?.role === "seller" ? auth.user.id : payload.sellerId,
    });
    if (result.error) return json(req, res, 422, result);
    return json(req, res, 201, result);
  }

  if (resource === "withdrawals" && action === "settle" && req.method === "POST") {
    if (auth.user?.role !== "admin") return json(req, res, 403, { error: "forbidden", requiredRoles: ["admin"] });
    const payload = await readBody(req);
    const result = settleWithdrawal(store, id, payload, { actorId: auth.user.id });
    if (result.error === "withdrawal_not_found") return notFound(req, res);
    if (result.error) return json(req, res, 422, result);
    return json(req, res, 200, result);
  }

  if (resource === "evidence" && req.method === "POST" && !id) {
    const result = createEvidence(store, await readBody(req), auth);
    if (result.error === "target_not_found") return notFound(req, res);
    if (result.error) return json(req, res, 422, result);
    return json(req, res, 201, result);
  }

  if (req.method === "GET" && !id) return json(req, res, 200, { items: visibleItems(resource, auth, store) });
  if (req.method === "GET" && id) {
    const item = store.find(resource, id);
    if (!item || !isOwnedBy(resource, item, auth, store)) return notFound(req, res);
    return json(req, res, 200, resource === "deliveries" ? revealDelivery(item) : item);
  }
  if (req.method === "POST" && !id) {
    const payload = await readBody(req);
    const validation = validateCreate(resource, payload);
    if (!validation.ok) return json(req, res, 422, { errors: validation.errors });
    const item = store.create(resource, { ...normalizeCreatePayload(resource, payload, auth, store), _actorId: auth.user?.id });
    if (resource === "tickets") {
      const ticketNotice = await notifyTicketSafely(item);
      return json(req, res, 201, { ...item, ticketNotice });
    }
    return json(req, res, 201, item);
  }
  if ((req.method === "PATCH" || req.method === "PUT") && id) {
    const existing = store.find(resource, id);
    if (!existing || !isOwnedBy(resource, existing, auth, store)) return notFound(req, res);
    const payload = await readBody(req);
    const validation = validatePatch(resource, payload);
    if (!validation.ok) return json(req, res, 422, { errors: validation.errors });
    const patchPayload = action === "status" ? { status: payload.status } : payload;
    const item = store.patch(resource, id, { ...patchPayload, _actorId: auth.user?.id });
    return item ? json(req, res, 200, item) : notFound(req, res);
  }

  json(req, res, 405, { error: "method_not_allowed" });
  return true;
}

module.exports = { handleApi, json };
