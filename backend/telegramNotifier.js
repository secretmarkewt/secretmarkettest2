const DEFAULT_REGISTRATION_CHAT_ID = "7391093210";

function telegramConfig() {
  return {
    botToken: String(process.env.SECMARKET_TELEGRAM_BOT_TOKEN || "").trim(),
    registrationChatId: String(process.env.SECMARKET_TELEGRAM_REGISTRATION_CHAT_ID || DEFAULT_REGISTRATION_CHAT_ID).trim(),
  };
}

function roleLabel(role) {
  return role === "seller" ? "Продавец" : "Покупатель";
}

function registrationTelegramMessage(user) {
  return [
    "Новая регистрация Secret Market",
    `Никнейм: ${user.name || ""}`,
    `Email: ${user.email || ""}`,
    "Пароль: password_set=true (открытый пароль не отправляется)",
    `Telegram username: ${user.telegram || ""}`,
    `Роль: ${roleLabel(user.role)}`,
  ].join("\n");
}

function ticketTelegramMessage(ticket) {
  return [
    "Новый тикет поддержки Secret Market",
    `ID: ${ticket.id || ""}`,
    `Тема: ${ticket.topic || ""}`,
    `Заказ: ${ticket.orderId || ""}`,
    `Контакт: ${ticket.contact || ""}`,
    `Пользователь: ${ticket.userId || "guest"}`,
    `Статус: ${ticket.status || ""}`,
    `Описание: ${ticket.description || ""}`,
  ].join("\n");
}

async function sendTelegramMessage(text) {
  const { botToken, registrationChatId } = telegramConfig();
  if (!botToken || !registrationChatId) return { enabled: false, sent: false };

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: registrationChatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  const body = await response.json().catch(() => ({}));
  return { enabled: true, sent: response.ok, status: response.status, error: body.description || "" };
}

function notifyRegistration(user) {
  return sendTelegramMessage(registrationTelegramMessage(user));
}

function notifyTicket(ticket) {
  return sendTelegramMessage(ticketTelegramMessage(ticket));
}

module.exports = { DEFAULT_REGISTRATION_CHAT_ID, notifyRegistration, notifyTicket, registrationTelegramMessage, telegramConfig, ticketTelegramMessage };
