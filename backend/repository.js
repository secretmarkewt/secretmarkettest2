const fs = require("fs");
const path = require("path");
const { seed } = require("./seed");

const DEFAULT_DB_FILE = path.join(process.cwd(), "data", "secmarket-db.json");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readState(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf8");
  if (!raw.trim()) return null;
  return JSON.parse(raw);
}

function createAuditEntry(action, resource, itemId, actorId, details = {}) {
  return {
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    actorId: actorId || "system",
    action,
    resource,
    itemId: itemId === undefined || itemId === null ? "" : String(itemId),
    details,
    createdAt: new Date().toISOString(),
  };
}

function createStore(options = {}) {
  const filePath = options.filePath === false ? "" : options.filePath || process.env.SECMARKET_DB_FILE || DEFAULT_DB_FILE;
  const configuredFilePath = options.filePath !== undefined || Boolean(process.env.SECMARKET_DB_FILE);
  let state = readState(filePath) || clone(seed);

  function persist() {
    if (!filePath) return;
    ensureDir(filePath);
    fs.writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  }

  function appendAudit(action, resource, itemId, actorId, details) {
    if (resource === "audit") return;
    state.audit = [createAuditEntry(action, resource, itemId, actorId, details), ...(state.audit || [])];
  }

  function list(collection) {
    return clone(state[collection] || []);
  }

  function find(collection, id) {
    return list(collection).find((item) => String(item.id).toLowerCase() === String(id).toLowerCase()) || null;
  }

  function create(collection, payload) {
    const { _actorId, ...cleanPayload } = payload;
    const item = {
      ...cleanPayload,
      id: cleanPayload.id || `${collection}-${Date.now()}`,
      createdAt: cleanPayload.createdAt || new Date().toISOString(),
    };
    state[collection] = [item, ...(state[collection] || [])];
    appendAudit("create", collection, item.id, _actorId, { status: item.status || "" });
    persist();
    return clone(item);
  }

  function patch(collection, id, payload) {
    const { _actorId, ...cleanPayload } = payload;
    const items = state[collection] || [];
    const index = items.findIndex((item) => String(item.id).toLowerCase() === String(id).toLowerCase());
    if (index === -1) return null;
    const before = clone(items[index]);
    items[index] = { ...items[index], ...cleanPayload, updatedAt: new Date().toISOString() };
    appendAudit("patch", collection, id, _actorId, {
      fromStatus: before.status || "",
      toStatus: items[index].status || "",
      fields: Object.keys(cleanPayload),
    });
    persist();
    return clone(items[index]);
  }

  function reset() {
    state = clone(seed);
    appendAudit("reset", "system", "seed", "system", {});
    persist();
    return snapshot();
  }

  function snapshot() {
    return Object.fromEntries(Object.entries(state).map(([key, value]) => [key, value.length]));
  }

  function meta() {
    return {
      configured: configuredFilePath,
      persistent: Boolean(filePath),
    };
  }

  function ready() {
    const requiredCollections = ["users", "products", "orders", "payments", "audit"];
    const missingCollections = requiredCollections.filter((collection) => !Array.isArray(state[collection]));
    return {
      ok: missingCollections.length === 0,
      missingCollections,
      storage: meta(),
      snapshot: snapshot(),
    };
  }

  persist();

  return { create, find, list, meta, patch, ready, reset, snapshot };
}

module.exports = { DEFAULT_DB_FILE, createStore };
