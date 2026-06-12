const fs = require("fs");
const os = require("os");
const path = require("path");
const { configSource, normalizePublicApiUrl, normalizeSupabaseUrl, writePublicConfig } = require("./scripts/public-config");

if (normalizePublicApiUrl("https://api.example.com/") !== "https://api.example.com") {
  throw new Error("public API URL normalization failed");
}

if (normalizePublicApiUrl("http://127.0.0.1:4174/") !== "http://127.0.0.1:4174") {
  throw new Error("local API URL normalization failed");
}

if (normalizeSupabaseUrl("https://example.supabase.co/") !== "https://example.supabase.co") {
  throw new Error("supabase URL normalization failed");
}

try {
  normalizePublicApiUrl("http://api.example.com");
  throw new Error("insecure public API URL accepted");
} catch (error) {
  if (!String(error.message).includes("https")) throw error;
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "secmarket-config-"));
try {
  const target = path.join(tempDir, "config.js");
  const apiUrl = writePublicConfig(target, "https://secret-market-api.example.com/");
  const source = fs.readFileSync(target, "utf8");
  if (apiUrl !== "https://secret-market-api.example.com") throw new Error("written API URL normalization failed");
  if (!source.includes('"https://secret-market-api.example.com"')) throw new Error("public config source failed");
  if (!source.includes('supabaseUrl: ""') || !source.includes('supabaseAnonKey: ""')) {
    throw new Error("public Supabase config defaults failed");
  }
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

const supabaseSource = configSource({
  supabaseUrl: "https://example.supabase.co/",
  supabaseAnonKey: "public-anon-key",
});
if (!supabaseSource.includes('"https://example.supabase.co"') || !supabaseSource.includes('"public-anon-key"')) {
  throw new Error("public Supabase config source failed");
}

try {
  configSource({ supabaseUrl: "https://example.supabase.co" });
  throw new Error("partial Supabase config accepted");
} catch (error) {
  if (!String(error.message).includes("must be set together")) throw error;
}

console.log("public config OK");
