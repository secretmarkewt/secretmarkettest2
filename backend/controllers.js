const { resourceModels } = require("./models");
const { validateCreate, validatePatch } = require("./validators");

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body, null, 2));
  return true;
}

function notFound(res) {
  json(res, 404, { error: "not_found" });
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

async function handleApi(req, res, store) {
  const url = new URL(req.url, "http://127.0.0.1");
  const [apiPrefix, resource, id, action] = url.pathname.split("/").filter(Boolean);

  if (apiPrefix !== "api") return false;
  if (resource === "health") return json(res, 200, { ok: true, service: "secmarket-api" });
  if (resource === "snapshot") return json(res, 200, store.snapshot());
  if (resource === "reset" && req.method === "POST") return json(res, 200, store.reset());
  if (!resourceModels[resource]) return notFound(res);

  if (req.method === "GET" && !id) return json(res, 200, { items: store.list(resource) });
  if (req.method === "GET" && id) {
    const item = store.find(resource, id);
    return item ? json(res, 200, item) : notFound(res);
  }
  if (req.method === "POST" && !id) {
    const payload = await readBody(req);
    const validation = validateCreate(resource, payload);
    if (!validation.ok) return json(res, 422, { errors: validation.errors });
    return json(res, 201, store.create(resource, payload));
  }
  if ((req.method === "PATCH" || req.method === "PUT") && id) {
    const payload = await readBody(req);
    const validation = validatePatch(resource, payload);
    if (!validation.ok) return json(res, 422, { errors: validation.errors });
    const item = store.patch(resource, id, action === "status" ? { status: payload.status } : payload);
    return item ? json(res, 200, item) : notFound(res);
  }

  json(res, 405, { error: "method_not_allowed" });
  return true;
}

module.exports = { handleApi, json };
