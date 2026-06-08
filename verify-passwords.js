const { hashPassword, verifyPassword } = require("./backend/passwords");

const passwordHash = hashPassword("password", "verify-salt");

if (!passwordHash.startsWith("pbkdf2_sha256$120000$verify-salt$")) {
  throw new Error("password hash format failed");
}

if (!verifyPassword("password", passwordHash)) {
  throw new Error("password verification failed");
}

if (verifyPassword("wrong", passwordHash)) {
  throw new Error("wrong password verification failed");
}

if (verifyPassword("password", "broken-hash")) {
  throw new Error("broken hash verification failed");
}

console.log("passwords OK");
