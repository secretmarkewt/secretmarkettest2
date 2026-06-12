const { DEFAULT_REGISTRATION_CHAT_ID, registrationTelegramMessage, telegramConfig, ticketTelegramMessage } = require("./backend/telegramNotifier");

const message = registrationTelegramMessage({
  name: "demo_buyer",
  email: "demo.buyer@example.com",
  telegram: "@demo_buyer",
  promoCode: "WELCOME10",
  promoTitle: "Starter bonus",
  role: "buyer",
});

if (!message.includes("Никнейм: demo_buyer")) throw new Error("telegram message nickname failed");
if (!message.includes("Email: demo.buyer@example.com")) throw new Error("telegram message email failed");
if (!message.includes("WELCOME10")) throw new Error("telegram message promo failed");
if (!message.includes("Telegram username: @demo_buyer")) throw new Error("telegram message username failed");
if (!message.includes("Роль: Покупатель")) throw new Error("telegram message role failed");
if (message.includes("demo-password") || !message.includes("password_set=true")) {
  throw new Error("telegram message leaked or missed password status");
}

const ticketMessage = ticketTelegramMessage({
  id: "SUP-TEST",
  topic: "Проблема с оплатой",
  orderId: 12345,
  contact: "@buyer",
  userId: "usr-buyer",
  status: "open",
  description: "Payment was not found",
});
if (!ticketMessage.includes("Новый тикет поддержки Secret Market")) throw new Error("ticket telegram title failed");
if (!ticketMessage.includes("ID: SUP-TEST")) throw new Error("ticket telegram id failed");
if (!ticketMessage.includes("Тема: Проблема с оплатой")) throw new Error("ticket telegram topic failed");
if (!ticketMessage.includes("Описание: Payment was not found")) throw new Error("ticket telegram description failed");

const previousChatId = process.env.SECMARKET_TELEGRAM_REGISTRATION_CHAT_ID;
delete process.env.SECMARKET_TELEGRAM_REGISTRATION_CHAT_ID;
if (telegramConfig().registrationChatId !== DEFAULT_REGISTRATION_CHAT_ID || DEFAULT_REGISTRATION_CHAT_ID !== "7391093210") {
  throw new Error("telegram default chat id failed");
}
if (previousChatId === undefined) delete process.env.SECMARKET_TELEGRAM_REGISTRATION_CHAT_ID;
else process.env.SECMARKET_TELEGRAM_REGISTRATION_CHAT_ID = previousChatId;

console.log("telegram notifier OK");
