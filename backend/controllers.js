const crypto = require("crypto");
const { issueDelivery } = require("./deliveryService");
const { confirmOrder } = require("./escrowService");
const { resourceModels } = require("./models");
const { syncPayment } = require("./paymentWatcher");
const { validateCreate, validatePatch } = require("./validators");
const { requestWithdrawal, sellerAvailableBalance, settleWithdrawal } = require("./withdrawalService");
const packageInfo = require("../package.json");

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
  return String(process.env.SECMARKET_ALLOW_RESET || "true").toLowerCase() !== "false";
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
  };
}

function readyPayload(store) {
  const readiness = store.ready ? store.ready() : { ok: false, missingCollections: ["store.ready"], storage: {}, snapshot: {} };
  return {
    ...readiness,
    service: "secret-market-api",
    checkedAt: new Date().toISOString(),
  };
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
  const { email, telegram, ...safeUser } = user;
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
  if (resource === "products") return ["seller", "admin"];
  if (resource === "withdrawals") return ["seller", "admin"];
  if (["orders", "payments", "deliveries", "ledger", "disputes", "tickets"].includes(resource)) return ["buyer", "seller", "admin"];
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
  if (resource === "tickets") {
    const order = relatedOrderFor(resource, item, store);
    return item.userId === auth.user.id || order?.buyerId === auth.user.id || order?.sellerId === auth.user.id;
  }
  if (resource === "payments") {
    const order = relatedOrderFor(resource, item, store);
    return order?.buyerId === auth.user.id || order?.sellerId === auth.user.id;
  }
  return true;
}

function visibleItems(resource, auth, store) {
  return store.list(resource).filter((item) => isOwnedBy(resource, item, auth, store));
}

function normalizeCreatePayload(resource, payload, auth) {
  if (!auth.user || auth.user.role === "admin") return payload;
  if (resource === "products") return { ...payload, sellerId: auth.user.id };
  if (resource === "orders" && auth.user.role === "buyer") return { ...payload, buyerId: auth.user.id };
  if (resource === "tickets") return { ...payload, userId: auth.user.id };
  return payload;
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

async function handleAuth(req, res, store, id) {
  if (id === "login" && req.method === "POST") {
    const payload = await readBody(req);
    const email = String(payload.email || "").trim().toLowerCase();
    const role = String(payload.role || "buyer").trim().toLowerCase();
    const user = store.list("users").find((candidate) => (
      String(candidate.email || "").toLowerCase() === email &&
      String(candidate.role || "").toLowerCase() === role &&
      candidate.status === "active"
    ));

    if (!user) return json(req, res, 401, { error: "invalid_credentials" });

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
  const [apiPrefix, resource, id, action] = url.pathname.split("/").filter(Boolean);

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
  if (resource === "reset" && req.method === "POST") {
    if (!resetAllowed()) return json(req, res, 403, { error: "reset_disabled" });
    return json(req, res, 200, store.reset());
  }
  if (resource === "auth") return handleAuth(req, res, store, id);
  if (!resourceModels[resource]) return notFound(req, res);
  const auth = authorize(req, res, store, resource);
  if (!auth) return true;

  if (resource === "payments" && action === "sync" && req.method === "POST") {
    if (auth.user?.role !== "admin") return json(req, res, 403, { error: "forbidden", requiredRoles: ["admin"] });
    const existing = store.find(resource, id);
    if (!existing) return notFound(req, res);
    const payload = await readBody(req);
    return json(req, res, 200, syncPayment(store, id, { actorId: auth.user.id, payload }));
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

  if (resource === "withdrawals" && id === "balance" && req.method === "GET") {
    if (auth.user?.role !== "seller") return json(req, res, 403, { error: "seller_required" });
    return json(req, res, 200, { sellerId: auth.user.id, availableBalance: sellerAvailableBalance(store, auth.user.id) });
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

  if (req.method === "GET" && !id) return json(req, res, 200, { items: visibleItems(resource, auth, store) });
  if (req.method === "GET" && id) {
    const item = store.find(resource, id);
    return item && isOwnedBy(resource, item, auth, store) ? json(req, res, 200, item) : notFound(req, res);
  }
  if (req.method === "POST" && !id) {
    const payload = await readBody(req);
    const validation = validateCreate(resource, payload);
    if (!validation.ok) return json(req, res, 422, { errors: validation.errors });
    return json(req, res, 201, store.create(resource, { ...normalizeCreatePayload(resource, payload, auth), _actorId: auth.user?.id }));
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
