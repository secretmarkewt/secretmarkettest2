const crypto = require("crypto");

const PREFIX = "sec:v1";
const ALGORITHM = "aes-256-gcm";

function secretKeySource() {
  return process.env.SECMARKET_SECRET_KEY || "secmarket-development-secret-key-change-before-production";
}

function vaultConfigured() {
  return Boolean(process.env.SECMARKET_SECRET_KEY && process.env.SECMARKET_SECRET_KEY.length >= 32);
}

function key() {
  return crypto.scryptSync(secretKeySource(), "secmarket-delivery-vault", 32);
}

function encryptSecret(value) {
  const plain = String(value || "");
  if (!plain) return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(":");
}

function decryptSecret(value) {
  const stored = String(value || "");
  if (!stored) return "";
  if (!stored.startsWith(`${PREFIX}:`)) return stored;
  const [, , ivRaw, tagRaw, encryptedRaw] = stored.split(":");
  if (!ivRaw || !tagRaw || !encryptedRaw) return "";
  const decipher = crypto.createDecipheriv(ALGORITHM, key(), Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function maskSecret(value) {
  const plain = decryptSecret(value);
  if (!plain) return "";
  const tail = plain.slice(-4);
  return `${"*".repeat(Math.max(plain.length - 4, 4))}${tail}`;
}

module.exports = {
  decryptSecret,
  encryptSecret,
  maskSecret,
  vaultConfigured,
};
