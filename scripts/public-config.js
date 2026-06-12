const fs = require("fs");
const path = require("path");

const CONFIG_ENV_KEY = "SECMARKET_PUBLIC_API_URL";
const SUPABASE_URL_ENV_KEY = "SECMARKET_PUBLIC_SUPABASE_URL";
const SUPABASE_ANON_KEY_ENV_KEY = "SECMARKET_PUBLIC_SUPABASE_ANON_KEY";

function normalizePublicUrl(value = "", label = "URL") {
  const url = String(value || "").trim().replace(/\/$/, "");
  if (!url) return "";

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`${label} must be a valid URL`);
  }

  const localHost = ["127.0.0.1", "localhost", "::1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !localHost) {
    throw new Error(`${label} must use https for public hosts`);
  }

  return parsed.toString().replace(/\/$/, "");
}

function normalizePublicApiUrl(value = process.env[CONFIG_ENV_KEY] || "") {
  return normalizePublicUrl(value, CONFIG_ENV_KEY);
}

function normalizeSupabaseUrl(value = process.env[SUPABASE_URL_ENV_KEY] || "") {
  return normalizePublicUrl(value, SUPABASE_URL_ENV_KEY);
}

function configSource(config = {}) {
  const apiBaseUrl = normalizePublicApiUrl(config.apiBaseUrl);
  const supabaseUrl = normalizeSupabaseUrl(config.supabaseUrl);
  const supabaseAnonKey = String(config.supabaseAnonKey || "").trim();
  if ((supabaseUrl && !supabaseAnonKey) || (!supabaseUrl && supabaseAnonKey)) {
    throw new Error(`${SUPABASE_URL_ENV_KEY} and ${SUPABASE_ANON_KEY_ENV_KEY} must be set together`);
  }
  return `window.SECMARKET_CONFIG = {\n  apiBaseUrl: ${JSON.stringify(apiBaseUrl)},\n  supabaseUrl: ${JSON.stringify(supabaseUrl)},\n  supabaseAnonKey: ${JSON.stringify(supabaseAnonKey)},\n};\n`;
}

function writePublicConfig(targetPath, apiBaseUrl = process.env[CONFIG_ENV_KEY] || "", fallbackConfig = {}) {
  const normalizedApiBaseUrl = normalizePublicApiUrl(apiBaseUrl || fallbackConfig.apiBaseUrl || "");
  const normalizedSupabaseUrl = normalizeSupabaseUrl(process.env[SUPABASE_URL_ENV_KEY] || fallbackConfig.supabaseUrl || "");
  const supabaseAnonKey = String(process.env[SUPABASE_ANON_KEY_ENV_KEY] || fallbackConfig.supabaseAnonKey || "").trim();
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, configSource({
    apiBaseUrl: normalizedApiBaseUrl,
    supabaseUrl: normalizedSupabaseUrl,
    supabaseAnonKey,
  }));
  return normalizedApiBaseUrl;
}

module.exports = {
  CONFIG_ENV_KEY,
  SUPABASE_ANON_KEY_ENV_KEY,
  SUPABASE_URL_ENV_KEY,
  configSource,
  normalizePublicApiUrl,
  normalizeSupabaseUrl,
  writePublicConfig,
};
