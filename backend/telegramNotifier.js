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

async function notifyRegistration(user) {
  const { botToken, registrationChatId } = telegramConfig();
  if (!botToken || !registrationChatId) return { enabled: false, sent: false };

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: registrationChatId,
      text: registrationTelegramMessage(user),
      disable_web_page_preview: true,
    }),
  });

  const body = await response.json().catch(() => ({}));
  return { enabled: true, sent: response.ok, status: response.status, error: body.description || "" };
}

module.exports = { DEFAULT_REGISTRATION_CHAT_ID, notifyRegistration, registrationTelegramMessage, telegramConfig };
