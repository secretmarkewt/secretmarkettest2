const crypto = require("crypto");
const { decryptSecret, encryptSecret } = require("./cryptoVault");
const { hashPassword, verifyPassword } = require("./passwords");

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function hashToken(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function createResetToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function createTotpSecret() {
  const bytes = crypto.randomBytes(20);
  let bits = "";
  let output = "";
  for (const byte of bytes) bits += byte.toString(2).padStart(8, "0");
  for (let index = 0; index < bits.length; index += 5) {
    const chunk = bits.slice(index, index + 5).padEnd(5, "0");
    output += BASE32_ALPHABET[parseInt(chunk, 2)];
  }
  return output;
}

function base32Decode(value) {
  const clean = String(value || "").replace(/=+$/g, "").replace(/\s+/g, "").toUpperCase();
  let bits = "";
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}

function totpCode(secret, timeStep = Math.floor(Date.now() / 30_000)) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(timeStep));
  const hmac = crypto.createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary = ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

function verifyTotp(secret, code, windowSteps = 1) {
  const cleanCode = String(code || "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(cleanCode)) return false;
  const currentStep = Math.floor(Date.now() / 30_000);
  for (let offset = -windowSteps; offset <= windowSteps; offset += 1) {
    const expected = totpCode(secret, currentStep + offset);
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(cleanCode))) return true;
  }
  return false;
}

function requestPasswordReset(store, payload = {}) {
  const email = String(payload.email || "").trim().toLowerCase();
  const role = String(payload.role || "buyer").trim().toLowerCase();
  const user = store.list("users").find((candidate) => (
    String(candidate.email || "").toLowerCase() === email &&
    String(candidate.role || "").toLowerCase() === role &&
    candidate.status === "active"
  ));
  const publicResponse = { ok: true, delivery: "configured-provider-required" };
  if (!user) return publicResponse;

  const token = createResetToken();
  const reset = store.create("passwordResets", {
    userId: user.id,
    tokenHash: hashToken(token),
    status: "pending",
    expiresAt: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
    usedAt: "",
    _actorId: user.id,
  });
  return {
    ...publicResponse,
    resetId: reset.id,
    ...(process.env.NODE_ENV === "production" ? {} : { resetToken: token }),
  };
}

function confirmPasswordReset(store, payload = {}) {
  const tokenHash = hashToken(payload.token);
  const password = String(payload.password || payload.newPassword || "");
  if (password.length < 8) return { error: "password_min_8" };
  const reset = store.list("passwordResets").find((candidate) => (
    candidate.tokenHash === tokenHash &&
    candidate.status === "pending" &&
    !candidate.usedAt &&
    new Date(candidate.expiresAt).getTime() > Date.now()
  ));
  if (!reset) return { error: "reset_token_invalid" };
  const user = store.find("users", reset.userId);
  if (!user) return { error: "user_not_found" };

  store.patch("users", user.id, { passwordHash: hashPassword(password), _actorId: user.id });
  store.patch("passwordResets", reset.id, { status: "used", usedAt: new Date().toISOString(), _actorId: user.id });
  store.list("sessions")
    .filter((session) => session.userId === user.id && session.status === "active")
    .forEach((session) => store.patch("sessions", session.id, { status: "revoked", _actorId: user.id }));
  return { ok: true };
}

function startTwoFactorSetup(store, auth) {
  const secret = createTotpSecret();
  const encrypted = encryptSecret(secret);
  const label = encodeURIComponent(`Secret Market:${auth.user.email || auth.user.id}`);
  const issuer = encodeURIComponent("Secret Market");
  store.patch("users", auth.user.id, {
    twoFactorPendingSecretEncrypted: encrypted,
    _actorId: auth.user.id,
  });
  return {
    secret,
    otpauthUrl: `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`,
  };
}

function enableTwoFactor(store, auth, payload = {}) {
  const user = store.find("users", auth.user.id);
  const secret = decryptSecret(user.twoFactorPendingSecretEncrypted || "");
  if (!secret) return { error: "two_factor_setup_required" };
  if (!verifyTotp(secret, payload.code)) return { error: "two_factor_code_invalid" };
  const updated = store.patch("users", user.id, {
    twoFactorEnabled: true,
    twoFactorSecretEncrypted: encryptSecret(secret),
    twoFactorPendingSecretEncrypted: "",
    _actorId: user.id,
  });
  return { ok: true, user: updated };
}

function disableTwoFactor(store, auth, payload = {}) {
  const user = store.find("users", auth.user.id);
  if (!user.twoFactorEnabled) return { ok: true, user };
  if (!verifyPassword(payload.password, user.passwordHash)) return { error: "invalid_credentials" };
  const secret = decryptSecret(user.twoFactorSecretEncrypted || "");
  if (secret && !verifyTotp(secret, payload.code)) return { error: "two_factor_code_invalid" };
  const updated = store.patch("users", user.id, {
    twoFactorEnabled: false,
    twoFactorSecretEncrypted: "",
    twoFactorPendingSecretEncrypted: "",
    _actorId: user.id,
  });
  return { ok: true, user: updated };
}

module.exports = {
  confirmPasswordReset,
  disableTwoFactor,
  enableTwoFactor,
  requestPasswordReset,
  startTwoFactorSetup,
  totpCode,
  verifyTotp,
};
