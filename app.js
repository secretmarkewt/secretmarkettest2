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

function themeIcon(name) {
  if (name === "sun") {
    return `<svg class="theme-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="4"></circle>
      <path d="M12 2v2"></path>
      <path d="M12 20v2"></path>
      <path d="m4.93 4.93 1.41 1.41"></path>
      <path d="m17.66 17.66 1.41 1.41"></path>
      <path d="M2 12h2"></path>
      <path d="M20 12h2"></path>
      <path d="m6.34 17.66-1.41 1.41"></path>
      <path d="m19.07 4.93-1.41 1.41"></path>
    </svg>`;
  }

  return `<svg class="theme-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20.99 12.49a9 9 0 1 1-9.48-9.48 6.8 6.8 0 0 0 9.48 9.48Z"></path>
  </svg>`;
}

function header() {
  const session = sessionApi.currentSession();
  return `
    <header class="topbar">
      <a class="brand" href="/" data-link><img class="brand-logo" src="${assetPath("assets/secret-market-logo.png")}" alt="Secret Market" /><span>Secret Market</span></a>
      <form class="searchbar" data-search-form><span>${uiIcon("search")}</span><input name="query" value="${state.query}" placeholder="Поиск товаров..." /><button class="icon-btn search-submit" title="Искать" aria-label="Искать">${uiIcon("search")}</button></form>
      <nav class="nav">
        ${[
          ["/catalog", "Каталог"],
          ["/seller/products/create", "Продать"],
          ["/orders/12345", "Заказы"],
          ["/chats", "Чаты"],
        ].map(([href, label]) => `<a href="${href}" data-link class="${activeClass(href)}">${label}</a>`).join("")}
        <a href="/support" data-link>Поддержка</a>
        <a class="nav-balance" href="/account/payments" data-link>0.00 USDT</a>
        <a class="login-link ${["/login", "/auth"].includes(currentPath()) ? "active" : ""}" href="/login" data-link>${session.role === "guest" ? "Войти" : session.user?.name || sessionApi.roleLabel(session.role)}</a>
        <a class="btn primary nav-register ${activeClass("/register")}" href="/register" data-link>Регистрация</a>
        <button class="theme-toggle" type="button" data-theme-toggle aria-label="Переключить тему" aria-pressed="${state.theme === "light"}">
          <span class="theme-track-icon theme-track-icon-sun">${themeIcon("sun")}</span>
          <span class="theme-knob">${state.theme === "light" ? themeIcon("sun") : themeIcon("moon")}</span>
        </button>
      </nav>
    </header>
    <nav class="mobile-tabbar">
      ${[
        ["/", uiIcon("home"), "Главная"],
        ["/catalog", uiIcon("catalog"), "Каталог"],
        ["/orders/12345", uiIcon("orders"), "Заказы"],
        ["/chats", uiIcon("chat"), "Чаты"],
        ["/account", uiIcon("user"), "Профиль"],
      ].map(([href, icon, label]) => `<a href="${href}" data-link class="${activeClass(href)}"><span>${icon}</span>${label}</a>`).join("")}
    </nav>`;
}

function footer() {
  return `
    <footer class="footer">
      <div class="footer-grid">
        <div><a class="brand footer-brand" href="/" data-link><img class="brand-logo" src="${assetPath("assets/secret-market-logo.png")}" alt="Secret Market" /><span>Secret Market</span></a><p>Маркетплейс цифровых товаров с гарантиями сделки, рейтингами продавцов, чатами и доверием.</p></div>
        ${[
          ["Покупателям", ["/buyer-rules", "/refund-policy", "/crypto-payment-guide"]],
          ["Продавцам", ["/seller-rules", "/fees", "/seller/withdraw"]],
          ["Поддержка", ["/support", "/support/ticket", "/faq", "/contacts"]],
          ["Мы в сети", ["/status-map", "/privacy", "/terms", "/backend-structure", "/launch-readiness"]],
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

function loginPanel() {
  return `<section class="panel auth-panel login-panel">
    <h2>Войти</h2>
    <p class="muted">Для покупателя, продавца или администратора.</p>
    <form data-login-form>
      <div class="form-grid">
        <label class="field"><span>Email</span><input name="email" type="email" value="buyer@example.com" required /></label>
        <label class="field"><span>Пароль</span><input name="password" type="password" value="password" required /></label>
        <label class="field"><span>Роль</span><select name="role"><option value="buyer">Покупатель</option><option value="seller">Продавец</option></select></label>
      </div>
      <div class="form-actions section"><button class="btn primary" data-login-role="buyer" type="submit">Войти как покупатель</button><button class="btn" data-login-role="seller" type="submit">Войти как продавец</button><button class="btn danger" data-logout type="button">Выйти</button></div>
    </form>
    <a class="auth-switch" href="/register" data-link>Нет аккаунта? Зарегистрироваться</a>
  </section>`;
}

function registerPanel() {
  return `<section class="panel auth-panel register-panel">
    <h2>Создать аккаунт</h2>
    <p class="muted">Регистрация покупателя или продавца.</p>
    <form data-register-form>
      <div class="form-grid">
        <label class="field"><span>Никнейм</span><input name="name" value="Artem" /></label>
        <label class="field"><span>Email</span><input name="email" type="email" value="new@example.com" /></label>
        <label class="field"><span>Пароль</span><input name="password" type="password" value="password123" /></label>
        <label class="field"><span>Telegram</span><input name="telegram" value="@username" /></label>
        <label class="field"><span>Роль</span><select name="role"><option value="buyer">Покупатель</option><option value="seller">Продавец</option></select></label>
      </div>
      <p class="muted section">Пароль отправляется только в API по HTTPS, сразу хешируется и не передается в Telegram.</p>
      <button class="btn primary section" type="submit">Зарегистрироваться</button>
    </form>
    <a class="auth-switch" href="/login" data-link>Уже есть аккаунт? Войти</a>
  </section>`;
}

function auth(mode = "both") {
  if (mode === "login") return page("Вход", `<div class="auth-shell auth-single">${loginPanel()}</div>`, "Account");
  if (mode === "register") return page("Регистрация", `<div class="auth-shell auth-single">${registerPanel()}</div>`, "Account");
  return page("Регистрация и вход", `<div class="auth-shell auth-split">${loginPanel()}${registerPanel()}</div>`, "Auth");
}

startRouter();
syncLiveData({ silent: true });





