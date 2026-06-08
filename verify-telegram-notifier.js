const { DEFAULT_REGISTRATION_CHAT_ID, registrationTelegramMessage, telegramConfig } = require("./backend/telegramNotifier");

const message = registrationTelegramMessage({
  name: "demo_buyer",
  email: "demo.buyer@example.com",
  telegram: "@demo_buyer",
  role: "buyer",
});

if (!message.includes("Никнейм: demo_buyer")) throw new Error("telegram message nickname failed");
if (!message.includes("Email: demo.buyer@example.com")) throw new Error("telegram message email failed");
if (!message.includes("Telegram username: @demo_buyer")) throw new Error("telegram message username failed");
if (!message.includes("Роль: Покупатель")) throw new Error("telegram message role failed");
if (message.includes("demo-password") || !message.includes("password_set=true")) {
  throw new Error("telegram message leaked or missed password status");
}

const previousChatId = process.env.SECMARKET_TELEGRAM_REGISTRATION_CHAT_ID;
delete process.env.SECMARKET_TELEGRAM_REGISTRATION_CHAT_ID;
if (telegramConfig().registrationChatId !== DEFAULT_REGISTRATION_CHAT_ID || DEFAULT_REGISTRATION_CHAT_ID !== "7391093210") {
  throw new Error("telegram default chat id failed");
}
if (previousChatId === undefined) delete process.env.SECMARKET_TELEGRAM_REGISTRATION_CHAT_ID;
else process.env.SECMARKET_TELEGRAM_REGISTRATION_CHAT_ID = previousChatId;

console.log("telegram notifier OK");
