const {
  categories,
  quickLinks,
  subcategories,
  categoryPages,
  products,
  sellers,
  demoOrders,
  demoPayments,
  demoTickets,
  demoDisputes,
  demoWithdrawals,
  moderationQueue,
  dataModels,
  apiEndpoints,
  infoPages,
  routeLinks,
  accountLinks,
  sellerLinks,
  adminLinks,
} = window.SECMARKET_DATA;
const api = window.SECMARKET_API;
const models = window.SECMARKET_MODELS;
const routes = window.SECMARKET_ROUTES;
const routeHelpers = window.SECMARKET_ROUTE_HELPERS;
const validationRules = window.SECMARKET_VALIDATION_RULES;
const sessionApi = window.SECMARKET_SESSION;
const app = document.querySelector("#app");

function header() {
  const session = sessionApi.currentSession();
  return `
    <header class="topbar">
      <a class="brand" href="/" data-link><img class="brand-logo" src="assets/secret-market-logo.png" alt="Secret Market" /><span>Secret Market</span></a>
      <form class="searchbar" data-search-form><span>⌕</span><input name="query" value="${state.query}" placeholder="Robux, Steam, Telegram Premium" /><button class="icon-btn" title="Искать">↵</button></form>
      <nav class="nav">
        ${routeLinks.map(([href, label]) => `<a href="${href}" data-link class="${activeClass(href)}">${label}</a>`).join("")}
        <a href="/support" data-link>Поддержка</a>
        <a href="/auth" data-link class="${activeClass("/auth")}">${session.role === "guest" ? "Войти" : session.user?.name || sessionApi.roleLabel(session.role)}</a>
        <span class="status ${session.role === "guest" ? "wait" : "ok"}">${sessionApi.roleLabel(session.role)}</span>
        <button class="icon-btn" title="Язык">RU</button>
        <button class="icon-btn" title="Валюта" data-currency>${currency}</button>
      </nav>
    </header>
    <nav class="mobile-tabbar">
      ${[
        ["/", "⌂", "Главная"],
        ["/catalog", "⌕", "Каталог"],
        ["/orders/12345", "#", "Заказы"],
        ["/chats", "✉", "Чаты"],
        ["/account", "◉", "Профиль"],
      ].map(([href, icon, label]) => `<a href="${href}" data-link class="${activeClass(href)}"><span>${icon}</span>${label}</a>`).join("")}
    </nav>`;
}

function footer() {
  return `
    <footer class="footer">
      <div class="footer-grid">
        <div><h3>Secret Market</h3><p>Маркетплейс цифровых товаров с оплатой в USDT, escrow-логикой и ручной модерацией спорных заказов.</p></div>
        ${[
          ["Покупателям", ["/buyer-rules", "/refund-policy", "/crypto-payment-guide"]],
          ["Продавцам", ["/seller-rules", "/fees", "/seller/withdraw"]],
          ["Платформа", ["/terms", "/privacy", "/contacts", "/faq", "/status-map"]],
          ["Разработка", ["/backend-structure"]],
        ].map(([title, links]) => `<div><h3>${title}</h3>${links.map((href) => `<a href="${href}" data-link>${infoPages[href]?.[0] || href}</a>`).join("")}</div>`).join("")}
      </div>
    </footer>`;
}

function page(title, body, eyebrow = "Secret Market") {
  return `${header()}<main class="main"><p class="eyebrow">${eyebrow}</p><h1>${title}</h1>${body}${footer()}</main>${toast()}`;
}

function toast() {
  return state.toast ? `<div class="toast">${state.toast}</div>` : "";
}

function auth() {
  return page("Регистрация и вход", `<div class="two-col">
    <section class="panel">
      <h2>Войти</h2>
      <div class="form-grid">${field("Email", "input", "buyer@example.com")}${field("Пароль", "input", "password")}${field("2FA код", "input", "000000")}</div>
      <div class="form-actions section"><button class="btn primary" data-login-role="buyer">Войти как покупатель</button><button class="btn" data-login-role="seller">Войти как продавец</button><button class="btn warn" data-login-role="admin">Войти как админ</button><button class="btn danger" data-logout>Выйти</button></div>
    </section>
    <aside class="panel">
      <h2>Создать аккаунт</h2>
      <div class="form-grid">${field("Никнейм", "input", "Artem")}${field("Email", "input", "new@example.com")}${field("Telegram", "input", "@username")}${field("Роль", "select", ["Покупатель", "Продавец"])}</div>
      <p class="muted section">Для MVP достаточно email, Telegram и роли. Кошелек продавца добавляется в кабинете перед выплатами.</p>
      <a class="btn primary" href="/account" data-link>Зарегистрироваться</a>
    </aside>
  </div>`, "Auth");
}

startRouter();







