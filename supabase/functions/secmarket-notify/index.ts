type NotifyPayload = {
  type?: "registration" | "ticket";
  payload?: Record<string, unknown>;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function text(value: unknown) {
  return String(value || "").trim();
}

function roleLabel(role: unknown) {
  const value = text(role);
  if (value === "admin") return "admin";
  if (value === "seller") return "seller";
  return "buyer";
}

function registrationMessage(user: Record<string, unknown>) {
  return [
    "New Secret Market registration",
    `Nickname: ${text(user.name)}`,
    `Email: ${text(user.email)}`,
    "Password: password_set=true (plaintext password is not sent)",
    `Telegram username: ${text(user.telegram)}`,
    `Promo code: ${text(user.promoCode) || "not provided"}`,
    `Bonus: ${text(user.promoTitle) || "none"}`,
    `Role: ${roleLabel(user.role)}`,
  ].join("\n");
}

function ticketMessage(ticket: Record<string, unknown>) {
  return [
    "New Secret Market support ticket",
    `ID: ${text(ticket.id)}`,
    `Topic: ${text(ticket.topic)}`,
    `Order: ${text(ticket.orderId)}`,
    `Contact: ${text(ticket.contact)}`,
    `User: ${text(ticket.buyerId) || text(ticket.userId) || "guest"}`,
    `Status: ${text(ticket.status)}`,
    `Description: ${text(ticket.description)}`,
  ].join("\n");
}

async function currentUser(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const authorization = req.headers.get("Authorization") || "";
  if (!supabaseUrl || !anonKey || !authorization.startsWith("Bearer ")) return null;

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: authorization,
    },
  });
  if (!response.ok) return null;
  return response.json();
}

async function sendTelegramMessage(message: string) {
  const botToken = Deno.env.get("SECMARKET_TELEGRAM_BOT_TOKEN") || "";
  const chatId = Deno.env.get("SECMARKET_TELEGRAM_REGISTRATION_CHAT_ID") || "7391093210";
  if (!botToken || !chatId) return { enabled: false, sent: false };

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      disable_web_page_preview: true,
    }),
  });
  const body = await response.json().catch(() => ({}));
  return { enabled: true, sent: response.ok, status: response.status, error: body.description || "" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  }

  const user = await currentUser(req);
  if (!user?.id) return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });

  const body = (await req.json().catch(() => ({}))) as NotifyPayload;
  const payload = body.payload || {};
  const message = body.type === "ticket" ? ticketMessage(payload) : registrationMessage(payload);
  const result = await sendTelegramMessage(message);
  return Response.json(result, { headers: corsHeaders });
});
