const crypto = require("crypto");

const ALGORITHM = "pbkdf2_sha256";
const DIGEST = "sha256";
const ITERATIONS = 120_000;
const KEY_LENGTH = 32;

function normalizePassword(password) {
  return String(password || "");
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const cleanPassword = normalizePassword(password);
  const cleanSalt = String(salt || crypto.randomBytes(16).toString("hex"));
  const hash = crypto.pbkdf2Sync(cleanPassword, cleanSalt, ITERATIONS, KEY_LENGTH, DIGEST).toString("hex");
  return `${ALGORITHM}$${ITERATIONS}$${cleanSalt}$${hash}`;
}

function verifyPassword(password, storedHash) {
  const [algorithm, iterationsRaw, salt, expectedHash] = String(storedHash || "").split("$");
  const iterations = Number(iterationsRaw);
  if (algorithm !== ALGORITHM || !iterations || !salt || !expectedHash) return false;

  const actual = crypto.pbkdf2Sync(normalizePassword(password), salt, iterations, KEY_LENGTH, DIGEST);
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

module.exports = { hashPassword, verifyPassword };
