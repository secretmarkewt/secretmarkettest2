const fs = require("fs");
const os = require("os");
const path = require("path");
const { loadEnvFile } = require("./backend/server");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "secmarket-env-"));
const envFile = path.join(tempDir, ".env");
const previousHost = process.env.HOST;
const previousPort = process.env.PORT;
const previousCustom = process.env.SECMARKET_ENV_TEST;

try {
  process.env.HOST = "already-set";
  delete process.env.PORT;
  delete process.env.SECMARKET_ENV_TEST;

  fs.writeFileSync(envFile, [
    "# Secret Market env verification",
    "HOST=0.0.0.0",
    "PORT=4999",
    "SECMARKET_ENV_TEST=\"quoted value\"",
    "",
  ].join("\n"), "utf8");

  const result = loadEnvFile(envFile);
  if (!result.loaded) throw new Error("env file did not load");
  if (process.env.HOST !== "already-set") throw new Error("env loader overwrote existing value");
  if (process.env.PORT !== "4999") throw new Error("env loader did not set port");
  if (process.env.SECMARKET_ENV_TEST !== "quoted value") throw new Error("env loader did not unquote value");
  if (result.keys.includes("HOST") || !result.keys.includes("PORT")) throw new Error("env loader returned wrong keys");

  console.log("env loader OK");
} finally {
  if (previousHost === undefined) delete process.env.HOST;
  else process.env.HOST = previousHost;
  if (previousPort === undefined) delete process.env.PORT;
  else process.env.PORT = previousPort;
  if (previousCustom === undefined) delete process.env.SECMARKET_ENV_TEST;
  else process.env.SECMARKET_ENV_TEST = previousCustom;
  fs.rmSync(tempDir, { recursive: true, force: true });
}
