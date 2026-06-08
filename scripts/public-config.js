const fs = require("fs");
const path = require("path");

const CONFIG_ENV_KEY = "SECMARKET_PUBLIC_API_URL";

function normalizePublicApiUrl(value = process.env[CONFIG_ENV_KEY] || "") {
  const url = String(value || "").trim().replace(/\/$/, "");
  if (!url) return "";

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`${CONFIG_ENV_KEY} must be a valid URL`);
  }

  const localHost = ["127.0.0.1", "localhost", "::1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !localHost) {
    throw new Error(`${CONFIG_ENV_KEY} must use https for public hosts`);
  }

  return parsed.toString().replace(/\/$/, "");
}

function configSource(apiBaseUrl = normalizePublicApiUrl()) {
  return `window.SECMARKET_CONFIG = {\n  apiBaseUrl: ${JSON.stringify(apiBaseUrl)},\n};\n`;
}

function writePublicConfig(targetPath, apiBaseUrl = process.env[CONFIG_ENV_KEY] || "") {
  const normalizedApiBaseUrl = normalizePublicApiUrl(apiBaseUrl);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, configSource(normalizedApiBaseUrl));
  return normalizedApiBaseUrl;
}

module.exports = { CONFIG_ENV_KEY, configSource, normalizePublicApiUrl, writePublicConfig };
