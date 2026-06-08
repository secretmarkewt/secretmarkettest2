const http = require("http");
const fs = require("fs");
const path = require("path");
const { handleApi, json } = require("./controllers");
const { createStore } = require("./repository");

function loadEnvFile(filePath = path.join(process.cwd(), ".env")) {
  if (!fs.existsSync(filePath)) return { loaded: false, keys: [] };
  const keys = [];
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!key || Object.prototype.hasOwnProperty.call(process.env, key)) continue;
    const value = rawValue.replace(/^(['"])(.*)\1$/, "$2");
    process.env[key] = value;
    keys.push(key);
  }
  return { loaded: true, keys };
}

function createApiServer(options = {}) {
  const store = options.store || createStore();
  return http.createServer(async (req, res) => {
    try {
      const handled = await handleApi(req, res, store);
      if (!handled) json(req, res, 404, { error: "api_route_not_found" });
    } catch (error) {
      json(req, res, error.status || 500, { error: error.message === "invalid_json" ? "invalid_json" : "internal_error", message: error.message });
    }
  });
}

if (require.main === module) {
  loadEnvFile();
  const port = Number(process.env.PORT || process.env.API_PORT || 4174);
  const host = process.env.HOST || "127.0.0.1";
  createApiServer().listen(port, host, () => {
    console.log(`Secret Market API prototype: http://${host}:${port}/api/health`);
  });
}

module.exports = { createApiServer, loadEnvFile };
