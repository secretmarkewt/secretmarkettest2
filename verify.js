const { spawn } = require("child_process");

const routes = ["/", "/catalog", "/catalog/roblox", "/catalog/steam", "/catalog/telegram", "/catalog/discord", "/catalog/minecraft", "/product/12345", "/seller/pixeltrade", "/auth", "/checkout", "/payment/order-id", "/payment/12345", "/payment/33412", "/orders/12345", "/orders/22341", "/orders/33412", "/orders/77102", "/chats", "/notifications", "/account", "/account/orders", "/account/favorites", "/account/reviews", "/account/payments", "/seller", "/seller/profile", "/seller/products", "/seller/products/create", "/seller/products/12345/edit", "/seller/orders", "/seller/finance", "/seller/withdraw", "/seller/settings", "/disputes", "/disputes/123", "/support", "/support/faq", "/support/ticket", "/support/tickets/SUP-104", "/support/requests", "/support/payment", "/support/order", "/support/seller", "/terms", "/privacy", "/contacts", "/faq", "/status-map", "/backend-structure", "/crypto-payment-guide", "/refund-policy", "/seller-rules", "/buyer-rules", "/fees", "/admin", "/admin/users", "/admin/sellers", "/admin/products", "/admin/orders", "/admin/payments", "/admin/payments/pay-12345", "/admin/payouts", "/admin/payouts/WD-120", "/admin/disputes", "/admin/tickets", "/admin/categories", "/admin/promocodes", "/admin/fees", "/admin/crypto", "/admin/moderation"];

(async () => {
  const server = spawn(process.execPath, ["server.js"], { cwd: process.cwd(), stdio: "ignore" });
  await new Promise((resolve) => setTimeout(resolve, 500));
  for (const route of routes) {
    const response = await fetch(`http://127.0.0.1:4173${route}`);
    const text = await response.text();
    if (response.status !== 200 || !text.includes('id="app"') || !text.includes("data.js") || !text.includes("app.js")) {
      throw new Error(`${route} failed static response check`);
    }
    console.log(`${route} OK`);
  }
  server.kill();
})();
