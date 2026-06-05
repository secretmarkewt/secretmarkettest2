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
  infoPages,
  routeLinks,
  accountLinks,
  sellerLinks,
  adminLinks,
} = window.SECMARKET_DATA;
const app = document.querySelector("#app");
let currency = "USDT";
let activeStep = 1;
const state = {
  query: "",
  maxPrice: 100,
  delivery: "all",
  rating: "4.8",
  sort: "popular",
  favorites: new Set(),
  orderConfirmed: false,
  disputeCreated: false,
  copiedAddress: false,
  chatMessages: [],
  toast: "",
};

loadState();

function notify(message) {
  state.toast = message;
  render();
  window.clearTimeout(notify.timer);
  notify.timer = window.setTimeout(() => {
    state.toast = "";
    render();
  }, 2400);
}

function saveState() {
  const payload = {
    currency,
    favorites: [...state.favorites],
    orderConfirmed: state.orderConfirmed,
    disputeCreated: state.disputeCreated,
    copiedAddress: state.copiedAddress,
    chatMessages: state.chatMessages,
  };
  localStorage.setItem("secmarket-demo-state", JSON.stringify(payload));
}

function loadState() {
  try {
    const raw = localStorage.getItem("secmarket-demo-state");
    if (!raw) return;
    const payload = JSON.parse(raw);
    if (payload.currency) currency = payload.currency;
    state.favorites = new Set(payload.favorites || []);
    state.orderConfirmed = Boolean(payload.orderConfirmed);
    state.disputeCreated = Boolean(payload.disputeCreated);
    state.copiedAddress = Boolean(payload.copiedAddress);
    state.chatMessages = Array.isArray(payload.chatMessages) ? payload.chatMessages : [];
  } catch {
    localStorage.removeItem("secmarket-demo-state");
  }
}

function resetDemoState() {
  localStorage.removeItem("secmarket-demo-state");
  currency = "USDT";
  state.favorites = new Set();
  state.orderConfirmed = false;
  state.disputeCreated = false;
  state.copiedAddress = false;
  state.chatMessages = [];
  notify("Демо-состояние сброшено");
}

function go(path) {
  if (location.protocol === "file:") {
    location.hash = path;
  } else {
    history.pushState({}, "", path);
    render();
    scrollTo({ top: 0, behavior: "smooth" });
  }
}

function currentPath() {
  if (location.protocol === "file:") {
    return location.hash.replace(/^#/, "") || "/";
  }
  return location.pathname;
}

function activeClass(path) {
  return currentPath() === path ? "active" : "";
}

function isCompactViewport() {
  return window.innerWidth <= 640;
}

function productById(id) {
  return products.find((product) => String(product.id) === String(id)) || products[0];
}

function orderById(id) {
  return demoOrders.find((orderItem) => String(orderItem.id) === String(id)) || demoOrders[0];
}

function paymentByOrderId(id) {
  return demoPayments.find((paymentItem) => String(paymentItem.order) === String(id)) || demoPayments[0];
}

function paymentById(id) {
  return demoPayments.find((paymentItem) => paymentItem.id === id || String(paymentItem.order) === String(id)) || demoPayments[0];
}

function disputeById(id) {
  return demoDisputes.find((dispute) => String(dispute.id) === String(id)) || demoDisputes[0];
}

function ticketById(id) {
  return demoTickets.find((ticket) => String(ticket.id).toLowerCase() === String(id).toLowerCase()) || demoTickets[0];
}

function withdrawalById(id) {
  return demoWithdrawals.find((withdrawalItem) => String(withdrawalItem.id).toLowerCase() === String(id).toLowerCase()) || demoWithdrawals[0];
}

function productMatchesSearch(product, query = state.query) {
  const text = `${product.title} ${product.cat} ${product.seller} ${product.type}`.toLowerCase();
  return text.includes(query.trim().toLowerCase());
}

function filteredProducts(category = "") {
  const cleanCategory = pretty(category).toLowerCase();
  const minRating = state.rating === "any" ? 0 : Number(state.rating);
  const list = products.filter((product) => {
    const inCategory = !category || product.cat.toLowerCase().includes(cleanCategory) || product.title.toLowerCase().includes(cleanCategory);
    const inSearch = productMatchesSearch(product);
    const inPrice = product.price <= state.maxPrice;
    const inDelivery = state.delivery === "all" || product.type.toLowerCase().includes(state.delivery);
    const inRating = product.rating >= minRating;
    return inCategory && inSearch && inPrice && inDelivery && inRating;
  });

  return list.sort((a, b) => {
    if (state.sort === "cheap") return a.price - b.price;
    if (state.sort === "expensive") return b.price - a.price;
    if (state.sort === "new") return b.id - a.id;
    if (state.sort === "rating") return b.rating - a.rating;
    return b.sales - a.sales;
  });
}

function setSearch(query) {
  state.query = query.trim();
  const path = currentPath().startsWith("/catalog") ? currentPath() : "/catalog";
  go(path);
}

function money(value) {
  return currency === "USDT" ? `${value.toFixed(2)} USDT` : `$${value.toFixed(2)}`;
}

function header() {
  return `
    <header class="topbar">
      <a class="brand" href="/" data-link><span class="brand-mark">SM</span><span>SecMarket</span></a>
      <form class="searchbar" data-search-form><span>⌕</span><input name="query" value="${state.query}" placeholder="Robux, Steam, Telegram Premium" /><button class="icon-btn" title="Искать">↵</button></form>
      <nav class="nav">
        ${routeLinks.map(([href, label]) => `<a href="${href}" data-link class="${activeClass(href)}">${label}</a>`).join("")}
        <a href="/support" data-link>Поддержка</a>
        <a href="/auth" data-link class="${activeClass("/auth")}">Войти</a>
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
        <div><h3>SecMarket</h3><p>Маркетплейс цифровых товаров с оплатой в USDT, escrow-логикой и ручной модерацией спорных заказов.</p></div>
        ${[
          ["Покупателям", ["/buyer-rules", "/refund-policy", "/crypto-payment-guide"]],
          ["Продавцам", ["/seller-rules", "/fees", "/seller/withdraw"]],
          ["Платформа", ["/terms", "/privacy", "/contacts", "/faq", "/status-map"]],
          ["Разработка", ["/backend-structure"]],
        ].map(([title, links]) => `<div><h3>${title}</h3>${links.map((href) => `<a href="${href}" data-link>${infoPages[href]?.[0] || href}</a>`).join("")}</div>`).join("")}
      </div>
    </footer>`;
}

function page(title, body, eyebrow = "SecMarket") {
  return `${header()}<main class="main"><p class="eyebrow">${eyebrow}</p><h1>${title}</h1>${body}${footer()}</main>${toast()}`;
}

function toast() {
  return state.toast ? `<div class="toast">${state.toast}</div>` : "";
}

function categoryCards() {
  return `<div class="grid categories">${categories.map(([name, desc, icon]) => `
    <a class="category-card" href="/catalog/${slug(name)}" data-link>
      <span class="category-icon">${icon}</span>
      <strong>${name}</strong>
      <span class="muted">${desc}</span>
    </a>`).join("")}</div>`;
}

function productCards(list = products) {
  if (!list.length) {
    return `<div class="empty-state"><strong>Товары не найдены</strong><span>Попробуйте снять фильтры или изменить поисковый запрос.</span><button class="btn" data-reset-filters>Сбросить фильтры</button></div>`;
  }

  return `<div class="grid products">${list.map((p) => `
    <article class="product-card" style="--thumb-a:${p.colors[0]};--thumb-b:${p.colors[1]}">
      <button class="favorite-btn ${state.favorites.has(p.id) ? "active" : ""}" data-favorite="${p.id}" title="В избранное">★</button>
      <a class="product-link" href="/product/${p.id}" data-link>
      <div class="product-thumb">${p.mark}</div>
      <div class="product-body">
        <span class="badge">${p.cat} · ${p.type}</span>
        <strong>${p.title}</strong>
        <span class="price">${money(p.price)}</span>
        <span class="meta">★ ${p.rating} · ${p.sales} продаж · ${p.stock} шт.</span>
      </div>
      </a>
    </article>`).join("")}</div>`;
}

function home() {
  return `${header()}<main class="main">
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">Крипто-MVP для цифровых товаров</p>
        <h1>SecMarket</h1>
        <p class="lead">Покупайте ключи, аккаунты, игровую валюту, подписки и услуги с оплатой в USDT. Деньги удерживаются до подтверждения заказа, а чат и спор всегда привязаны к сделке.</p>
        <div class="actions"><a class="btn primary" href="/catalog" data-link>Открыть каталог</a><a class="btn" href="/seller/products/create" data-link>Создать товар</a><a class="btn warn" href="/crypto-payment-guide" data-link>USDT TRC20 / TON / BEP20</a></div>
        <div class="stats-strip">
          <div class="stat"><strong>28 450</strong><span>успешных сделок</span></div>
          <div class="stat"><strong>3 сети</strong><span>для старта MVP</span></div>
          <div class="stat"><strong>4.91</strong><span>средний рейтинг</span></div>
          <div class="stat"><strong>15 мин</strong><span>типовая выдача</span></div>
        </div>
      </div>
      <div class="hero-art"><img src="assets/market-hero.png" alt="Интерфейс цифрового маркетплейса с крипто оплатой" /></div>
    </section>
    <section class="section"><div class="section-head"><div><h2>Быстрые ссылки</h2><p class="muted">Популярные направления для поиска.</p></div></div><div class="chips">${quickLinks.map((x) => `<a class="chip" href="/catalog/${x.toLowerCase()}" data-link>${x}</a>`).join("")}</div></section>
    <section class="section"><div class="section-head"><h2>Популярные категории</h2><a class="btn" href="/catalog" data-link>Все категории</a></div>${categoryCards()}</section>
    <section class="section"><div class="section-head"><h2>Рекомендованные товары</h2><a class="btn" href="/catalog" data-link>Смотреть все</a></div>${productCards(products.slice(0, 4))}</section>
    <section class="section"><div class="section-head"><h2>Новые товары</h2></div>${productCards(products.slice(4))}</section>
    <section class="section"><div class="section-head"><h2>Лучшие продавцы</h2></div><div class="grid sellers">${sellers.map((s) => `<div class="seller-card"><strong>${s[0]}</strong><span>★ ${s[1]} · ${s[2]} продаж</span><span class="status ok">${s[3]}</span></div>`).join("")}</div></section>
    <section class="section"><div class="grid trust">${["Безопасная сделка", "Крипто-оплата", "Escrow до подтверждения", "Поддержка и споры"].map((x) => `<div class="trust-item panel"><h3>${x}</h3><p class="muted">Статусы, чат и история действий помогают разбирать заказ без потери контекста.</p></div>`).join("")}</div></section>
    ${footer()}
  </main>`;
}

function catalog(category = "") {
  const categoryInfo = categoryPages[category];
  const title = categoryInfo ? categoryInfo.title : category ? `Категория: ${pretty(category)}` : "Каталог цифровых товаров";
  const list = filteredProducts(category);
  const subs = subcategories[category] || [];
  return `${header()}<main class="main">
    <div class="layout">
      <aside class="sidebar"><h3>Категории</h3>${["Все категории", ...categories.map((c) => c[0])].map((x) => `<a class="side-link ${pretty(category) === x || (!category && x === "Все категории") ? "active" : ""}" href="${x === "Все категории" ? "/catalog" : `/catalog/${slug(x)}`}" data-link>${x}<span>›</span></a>`).join("")}<section class="section"><h3>Игры</h3>${Object.keys(categoryPages).map((key) => `<a class="side-link ${category === key ? "active" : ""}" href="/catalog/${key}" data-link>${categoryPages[key].title}<span>›</span></a>`).join("")}</section></aside>
      <section>
        <p class="eyebrow">Фильтры, сортировка, наличие</p><h1>${title}</h1>
        ${categoryInfo ? `<section class="section"><p class="lead">${categoryInfo.description}</p><div class="grid trust section">${subs.map((name) => `<a class="trust-item panel" href="/catalog/${category}" data-link><h3>${name}</h3><p class="muted">Подкатегория ${categoryInfo.title}</p></a>`).join("")}</div></section>` : ""}
        ${subs.length ? `<div class="chips section">${subs.map((name) => `<a class="chip" href="/catalog/${category}" data-link>${name}</a>`).join("")}</div>` : ""}
        <details class="panel filters-panel" ${isCompactViewport() ? "" : "open"}>
          <summary>Фильтры и сортировка</summary>
          <div class="filter-grid">
            <label class="field"><span>Цена до, USDT</span><input type="number" min="1" step="1" value="${state.maxPrice}" data-filter="maxPrice" /></label>
            <label class="field"><span>Выдача</span><select data-filter="delivery">${option("all", "Любая", state.delivery)}${option("автовыдача", "Автоматическая", state.delivery)}${option("ручная", "Ручная", state.delivery)}</select></label>
            <label class="field"><span>Рейтинг</span><select data-filter="rating">${option("4.8", "4.8+", state.rating)}${option("4.5", "4.5+", state.rating)}${option("any", "Любой", state.rating)}</select></label>
            <label class="field"><span>Валюта</span><select data-currency-select>${option("USDT", "USDT", currency)}${option("USD", "USD", currency)}</select></label>
            ${field("Регион", "select", ["Любой", "EU", "US", "CIS"])}
            <div class="field"><span>Результат</span><div class="result-counter">${list.length} из ${products.length} товаров</div></div>
          </div>
          <div class="tabs section">
            ${sortTab("popular", "Популярные")}${sortTab("cheap", "Дешевые")}${sortTab("expensive", "Дорогие")}${sortTab("new", "Новые")}${sortTab("rating", "По рейтингу")}
          </div>
        </details>
        <section class="section">${productCards(list)}</section>
        <section class="section panel"><h2>FAQ по категории</h2><div class="list">${[
          ...(categoryInfo?.faq || []),
          "Проверяйте сеть оплаты, тип выдачи, регион и условия получения перед оформлением заказа.",
          "Если товар не получен или не работает, открывайте спор со страницы заказа.",
        ].map(row).join("")}</div><p class="muted section">SEO: товары ${category ? pretty(category) : "цифрового каталога"} продаются с ценой в USDT, рейтингом продавца, количеством продаж и прозрачным статусом выдачи.</p></section>
        ${categoryInfo ? `<section class="section panel"><h2>SEO-описание</h2><p class="muted">${categoryInfo.seo}</p></section>` : ""}
      </section>
    </div>${footer()}</main>`;
}

function product(id = 12345) {
  const p = productById(id);
  return `${header()}<main class="main">
    <div class="product-detail">
      <div class="detail-media">${p.mark}</div>
      <section class="panel">
        <span class="badge">${p.cat} · ${p.type}</span><h1>${p.title}</h1>
        <p class="price">${money(p.price)} <span class="muted">≈ $${p.usd.toFixed(2)}</span></p>
        <div class="grid metrics">
          <div class="metric panel"><strong>${p.stock}</strong><span>в наличии</span></div>
          <div class="metric panel"><strong>5 мин</strong><span>выдача</span></div>
          <div class="metric panel"><strong>${p.rating}</strong><span>рейтинг</span></div>
          <div class="metric panel"><strong>${p.sales}</strong><span>продаж</span></div>
        </div>
        <div class="product-actions section"><a class="btn primary" href="/checkout" data-link>Купить</a><a class="btn" href="/chats" data-link>Написать продавцу</a><a class="status ok" href="/seller/pixeltrade" data-link>Проверенный продавец: ${p.seller}</a></div>
        <section class="section"><h2>Описание</h2><p class="muted">Покупатель получает код пополнения и короткую инструкцию сразу после подтверждения оплаты. Для ручных заказов открывается чат с продавцом.</p></section>
        <section class="section"><h2>Условия получения</h2><div class="list">${["Оплата только выбранной монетой и сетью", "Автовыдача после подтверждений сети", "Покупатель подтверждает получение", "Спор доступен со страницы заказа"].map(row).join("")}</div></section>
        <section class="section"><h2>Что получает покупатель</h2><div class="list">${["Код или инструкция для получения товара", "Срок проверки после выдачи: 24 часа", "Чат с продавцом по этому заказу", "История действий и платежа в заказе"].map(row).join("")}</div></section>
        <section class="section"><h2>Важные предупреждения</h2><div class="list">${["Не отправляйте оплату в другой сети", "Не закрывайте заказ до проверки товара", "Не передавайте продавцу лишние данные аккаунта", "Сохраняйте переписку внутри чата заказа"].map((x) => row(x, "важно")).join("")}</div></section>
      </section>
    </div>
    <section class="section"><div class="section-head"><h2>Отзывы</h2></div><div class="grid sellers">${[
      ["Быстрая выдача, код подошел", "5.0"],
      ["Продавец ответил в чате за пару минут", "4.9"],
      ["Оплатил TRC20, подтверждение пришло быстро", "5.0"],
      ["Все ок, заказ завершил сразу", "4.8"],
    ].map(([text, rating]) => `<div class="seller-card"><strong>★ ${rating}</strong><span>${text}</span><span class="muted">проверенный заказ</span></div>`).join("")}</div></section>
    <section class="section"><div class="section-head"><h2>Похожие товары</h2></div>${productCards(products.filter((item) => item.id !== p.id).slice(0, 4))}</section>${footer()}</main>`;
}

function checkout() {
  const steps = ["Проверка товара", "Данные покупателя", "Выбор криптовалюты", "Подтверждение"];
  return page("Оформление заказа", `<div class="two-col">
    <section class="panel">
      <div class="checkout-steps">${steps.map((x, i) => `<button class="step ${i + 1 === activeStep ? "active" : ""}" data-step="${i + 1}">${i + 1}. ${x}</button>`).join("")}</div>
      ${checkoutStepBody()}
      <div class="form-actions section"><button class="btn" data-step-prev>Назад</button><button class="btn primary" data-step-next>Далее</button><a class="btn warn" href="/payment/order-id" data-link>Перейти к оплате</a></div>
    </section>
    <aside class="panel"><h2>Итого</h2>${row("Robux 10 000", "84.90 USDT")}${row("Комиссия платформы", "3.40 USDT")}${row("К оплате", "88.30 USDT")}<p class="muted section">Отправляйте только выбранную валюту и сеть. Ошибка сети может задержать заказ.</p></aside>
  </div>`, "Checkout");
}

function checkoutStepBody() {
  if (activeStep === 1) {
    return `<div class="list">${[
      ["Товар", "Robux 10 000"],
      ["Продавец", "PixelTrade · 4.98"],
      ["Цена", "84.90 USDT"],
      ["Комиссия", "3.40 USDT"],
      ["Итоговая сумма", "88.30 USDT"],
    ].map(([left, right]) => row(left, right)).join("")}</div>`;
  }
  if (activeStep === 2) {
    return `<div class="form-grid">${field("Никнейм", "input", "Artem")}${field("Email", "input", "buyer@example.com")}${field("Telegram", "input", "@buyer")}${field("ID аккаунта", "input", "123456789")}${field("Комментарий", "textarea", "Нужна выдача на EU регион")}</div>`;
  }
  if (activeStep === 3) {
    return `<div class="grid trust">${["USDT TRC20", "USDT TON", "USDT BEP20"].map((network, index) => `<button class="trust-item panel ${index === 0 ? "chip active" : ""}" data-network="${network}"><h3>${network}</h3><p class="muted">${index === 0 ? "Быстрая проверка, удобна для MVP" : "Доступно для оплаты заказа"}</p></button>`).join("")}</div>`;
  }
  return `<div class="panel"><h2>Подтверждение</h2><p class="lead">К оплате 88.30 USDT в выбранной сети. Отправляйте точную сумму только на адрес, который будет создан для этого заказа.</p><div class="list">${["После оплаты система ищет транзакцию", "Средства попадают в escrow", "Товар выдается автоматически или через чат", "После подтверждения деньги доступны продавцу"].map(row).join("")}</div></div>`;
}

function auth() {
  return page("Регистрация и вход", `<div class="two-col">
    <section class="panel">
      <h2>Войти</h2>
      <div class="form-grid">${field("Email", "input", "buyer@example.com")}${field("Пароль", "input", "password")}${field("2FA код", "input", "000000")}</div>
      <div class="form-actions section"><a class="btn primary" href="/account" data-link>Войти как покупатель</a><a class="btn" href="/seller" data-link>Войти как продавец</a></div>
    </section>
    <aside class="panel">
      <h2>Создать аккаунт</h2>
      <div class="form-grid">${field("Никнейм", "input", "Artem")}${field("Email", "input", "new@example.com")}${field("Telegram", "input", "@username")}${field("Роль", "select", ["Покупатель", "Продавец"])}</div>
      <p class="muted section">Для MVP достаточно email, Telegram и роли. Кошелек продавца добавляется в кабинете перед выплатами.</p>
      <a class="btn primary" href="/account" data-link>Зарегистрироваться</a>
    </aside>
  </div>`, "Auth");
}

function payment(id = 12345) {
  const paymentItem = paymentByOrderId(id === "order-id" ? 12345 : id);
  const qrCells = Array.from({ length: 49 }, (_, i) => [0, 1, 2, 7, 14, 8, 16, 34, 35, 42, 43, 44, 6, 13, 20, 28, 36, 48, 5, 19, 24, 30, 39, 46].includes(i));
  return page("Крипто-оплата заказа", `<div class="two-col">
    <section class="panel"><h2>${paymentItem.amount.toFixed(2)} ${paymentItem.coin} · ${paymentItem.coin} ${paymentItem.network}</h2><p class="muted">Адрес для оплаты</p><div class="list-row"><strong>TX9a...F2Lm</strong><button class="btn" data-copy-address>${state.copiedAddress ? "Скопировано" : "Копировать"}</button></div><div class="section qr">${qrCells.map((on) => `<span style="opacity:${on ? 1 : 0}"></span>`).join("")}</div><div class="list section">${[
      ["Монета", paymentItem.coin],
      ["Сеть", paymentItem.network],
      ["Точная сумма", `${paymentItem.amount.toFixed(2)} ${paymentItem.coin}`],
      ["Уникальность заказа", "отдельный адрес"],
      ["Окно оплаты", "30 минут"],
    ].map(([left, right]) => row(left, right)).join("")}</div></section>
    <aside class="panel"><h2>Статус</h2>${["Ожидает оплату", "Транзакция найдена", "Ожидает подтверждений", "Оплата подтверждена", "Средства в escrow", "Товар можно выдавать"].map((x, i) => `<div class="list-row"><span>${x}</span><span class="status ${i < 3 ? "ok" : "wait"}">${i < 3 ? "готово" : "ожидание"}</span></div>`).join("")}<p class="muted section">Таймер оплаты: 29:42. Подтверждений: 1 из 3. Если сумма меньше нужной, заказ перейдет в статус “Недостаточная сумма”.</p></aside>
  </div>`, "Payment");
}

function order(id = 12345) {
  const orderItem = orderById(id);
  const paymentItem = paymentByOrderId(orderItem.id);
  const isConfirmed = state.orderConfirmed || orderItem.order === "Завершен";
  const isDispute = state.disputeCreated || orderItem.order === "Спор";
  const statusRows = isConfirmed
    ? [`Товар: ${orderItem.product}`, `Продавец: ${orderItem.seller}`, `Покупатель: ${orderItem.buyer}`, `Сумма: ${money(orderItem.amount)}`, `Оплата: ${orderItem.payment}`, "Escrow: средства начислены продавцу", "Заказ: завершен"]
    : [`Товар: ${orderItem.product}`, `Продавец: ${orderItem.seller}`, `Покупатель: ${orderItem.buyer}`, `Сумма: ${money(orderItem.amount)}`, `Оплата: ${orderItem.payment}`, isDispute ? "Escrow: средства заморожены из-за спора" : "Escrow: средства удерживаются", `Заказ: ${orderItem.order}`];
  const timeline = isConfirmed
    ? ["Заказ создан", "Покупатель выбрал USDT TRC20", "Оплата найдена", "Средства помещены в escrow", "Продавец выдал товар", "Покупатель подтвердил получение", "Средства доступны продавцу"]
    : ["Заказ создан", "Покупатель выбрал USDT TRC20", "Оплата найдена", "Средства помещены в escrow", "Продавец выдал товар", "Покупатель читает инструкцию"];
  const doneSteps = isConfirmed ? 5 : isDispute ? 4 : orderItem.order === "В работе" ? 3 : 4;
  return page(`Заказ #${orderItem.id}`, `<div class="two-col">
    <section class="panel"><h2>Информация</h2><div class="list">${statusRows.map(row).join("")}</div><section class="section"><h2>Платеж</h2>${paymentListRow(paymentItem)}<a class="btn section" href="/payment/${orderItem.id}" data-link>Открыть оплату</a></section><section class="section"><h2>Данные выдачи</h2><div class="delivery-box"><strong>${orderItem.delivery === "Автовыдача" ? "AUTO-DELIVERY-CODE-SEC-9K2" : "Ручная выдача через чат заказа"}</strong><span>Инструкция: активируйте данные после получения, затем подтвердите заказ.</span></div></section><section class="section"><h2>Статусы заказа</h2><div class="status-flow">${["Создан", "Оплачен", "В работе", "Ожидает подтверждения", "Завершен"].map((x, i) => `<span class="${i < doneSteps ? "done" : ""}">${x}</span>`).join("")}</div></section><div class="actions section">${isConfirmed ? `<span class="status ok">Получение подтверждено</span>` : `<button class="btn primary" data-confirm-order>Подтвердить получение</button><button class="btn danger" data-open-dispute>Открыть спор</button>`}</div></section>
    <aside class="panel timeline"><h2>История</h2>${timeline.map((x, i) => `<div class="list-row"><span>${i + 1}</span><span>${x}</span><span class="status ok">OK</span></div>`).join("")}</aside>
  </div>`, "Orders");
}

function notifications() {
  return page("Уведомления", `<div class="two-col"><section class="panel"><h2>Лента событий</h2><div class="list">${[
    ["Оплата найдена по заказу #12345", "только что"],
    ["Продавец выдал товар", "3 мин назад"],
    ["Средства помещены в escrow", "5 мин назад"],
    ["Тикет #SUP-104 получил ответ", "сегодня"],
    ["Вывод #WD-120 ожидает проверки", "вчера"],
  ].map(([left, right]) => row(left, right)).join("")}</div></section><aside class="panel"><h2>Настройки</h2><div class="list">${["Email-уведомления", "Telegram-уведомления", "Системные события", "Платежи и подтверждения", "Споры и тикеты"].map((x) => row(x, "вкл")).join("")}</div></aside></div>`, "Account");
}

function chats() {
  const messages = [
    `<div class="chat-message system">Система: заказ создан, ожидается оплата.</div>`,
    `<div class="chat-message system">Система: оплата получена, средства в escrow.</div>`,
    `<div class="chat-message me">Проверьте выдачу на EU регион.</div>`,
    `<div class="chat-message">Продавец: данные выданы, инструкция в заказе.</div>`,
    `<div class="chat-message system">Система: покупатель может подтвердить получение или открыть спор.</div>`,
    ...state.chatMessages.map((message) => `<div class="chat-message me">${escapeHtml(message)}</div>`),
  ].join("");
  return page("Чаты", `<div class="chat-shell">
    <aside class="panel"><h3>Диалоги</h3>${["#12345 · PixelTrade", "#22341 · KeyDock", "Поддержка", "Спор #12345"].map((x, i) => `<a class="side-link ${i === 0 ? "active" : ""}" href="/chats" data-link>${x}<span>›</span></a>`).join("")}</aside>
    <section class="panel"><div class="section-head"><div><h2>Заказ #12345</h2><p class="muted">Контекст доступен поддержке: товар, платеж, выдача и история действий.</p></div><a class="btn" href="/orders/12345" data-link>Открыть заказ</a></div><div class="list">${messages}</div><form class="form-actions section" data-chat-form>${field("Сообщение", "input", "Написать ответ")}<button class="btn primary">Отправить</button><button class="btn" type="button" data-file-action>Файл</button></form></section>
  </div>`, "Chats");
}

function account(path = "") {
  if (path.includes("/orders")) return accountOrders();
  if (path.includes("/favorites")) return accountFavorites();
  if (path.includes("/payments")) return accountPayments();
  if (path.includes("/reviews")) return accountReviews();
  if (path.includes("/security")) return dashboard("Безопасность", accountLinks, ["Пароль: обновлен 12 дней назад", "2FA: включить", "Активные сессии: 2", "Последний вход: сегодня"], "Account");
  if (path.includes("/settings")) return accountSettings();
  return dashboard("Кабинет покупателя", accountLinks, ["Никнейм: Artem", "Email: buyer@example.com", "Telegram: @buyer", "2FA: включить", "Последний вход: сегодня"]);
}

function accountOrders() {
  return page("Мои заказы", `<div class="layout"><aside class="sidebar">${sideLinks(accountLinks)}</aside><section class="panel"><h2>Активные и завершенные</h2><div class="list">${demoOrders.map((orderItem) => orderListRow(orderItem)).join("")}</div></section></div>`, "Account");
}

function accountFavorites() {
  const favoriteProducts = products.filter((product) => state.favorites.has(product.id));
  const body = favoriteProducts.length
    ? productCards(favoriteProducts)
    : `<div class="empty-state"><strong>Избранное пустое</strong><span>Нажмите звезду на карточке товара, чтобы сохранить его здесь.</span><a class="btn primary" href="/catalog" data-link>Перейти в каталог</a></div>`;
  return page("Избранное", `<div class="layout"><aside class="sidebar">${sideLinks(accountLinks)}</aside><section>${body}</section></div>`, "Account");
}

function accountPayments() {
  return page("История оплат", `<div class="layout"><aside class="sidebar">${sideLinks(accountLinks)}</aside><section class="panel"><h2>Крипто-платежи</h2>${demoPayments.map((paymentItem) => paymentListRow(paymentItem)).join("")}</section></div>`, "Account");
}

function accountReviews() {
  return page("Мои отзывы", `<div class="layout"><aside class="sidebar">${sideLinks(accountLinks)}</aside><section class="panel"><div class="section-head"><h2>Оставить отзыв</h2><span class="status ok">после завершенного заказа</span></div><div class="form-grid">${field("Заказ", "select", ["#12345 · Robux 10 000", "#22341 · Steam Gift Card"])}${field("Оценка", "select", ["5", "4", "3", "2", "1"])}${field("Текст", "textarea", "Быстрая выдача, все работает")}</div><button class="btn primary section">Опубликовать отзыв</button><section class="section"><h2>Опубликованные</h2><div class="list">${["#22341 · 5★ · ключ подошел", "#33412 · 4★ · продавец ответил быстро"].map(row).join("")}</div></section></section></div>`, "Account");
}

function accountSettings() {
  return page("Настройки", `<div class="layout"><aside class="sidebar">${sideLinks(accountLinks)}</aside><section class="panel"><h2>Предпочтения</h2><div class="list">${[
    ["Язык", "RU"],
    ["Валюта отображения", currency],
    ["Избранных товаров", String(state.favorites.size)],
    ["Сообщений в чате", String(state.chatMessages.length)],
    ["Заказ подтвержден", state.orderConfirmed ? "да" : "нет"],
  ].map(([left, right]) => row(left, right)).join("")}</div><div class="form-actions section"><button class="btn danger" data-reset-demo>Сбросить демо-состояние</button></div></section></div>`, "Account");
}

function seller(path = "") {
  if (path.includes("profile")) return sellerProfile();
  if (path.includes("products/create")) return createProduct();
  if (path.includes("/edit")) return createProduct("edit", path.split("/").at(-2));
  if (path.includes("products")) return sellerProducts();
  if (path.includes("orders")) return sellerOrders();
  if (path.includes("finance")) return finance();
  if (path.includes("withdraw")) return withdraw();
  if (path.includes("reviews")) return dashboard("Отзывы продавца", sellerLinks, ["5★: 92%", "4★: 7%", "Негативные: 1%", "Последний отзыв: товар выдан за 4 минуты"], "Seller");
  if (path.includes("settings")) return sellerSettings();
  return dashboard("Кабинет продавца", sellerLinks, ["Продажи за день: 14", "Продажи за месяц: 390", "Активные заказы: 8", "Рейтинг: 4.98", "Баланс к выплате: 1 240 USDT", "В холде: 480 USDT", "Споры: 1"], "Seller");
}

function sellerProfile() {
  return page("Профиль продавца", `<div class="layout"><aside class="sidebar">${sideLinks(sellerLinks)}</aside><section>
    <section class="panel"><h2>Публичный профиль</h2><div class="form-grid">${field("Название магазина", "input", "PixelTrade")}${field("Telegram", "input", "@pixeltrade")}${field("Описание", "textarea", "Roblox, игровая валюта и быстрые пополнения")}${field("Статус", "select", ["Проверенный", "На проверке", "Ограничен"])}${field("Среднее время ответа", "input", "до 5 минут")}${field("Регион работы", "select", ["Любой", "EU", "US", "CIS"])}</div></section>
    <section class="panel section"><h2>Кошелек выплат</h2><div class="form-grid">${field("Валюта", "select", ["USDT"])}${field("Сеть", "select", ["TRC20", "TON", "BEP20"])}${field("Адрес", "input", "TQ9...seller")}${field("Минимальный вывод", "input", "50 USDT")}${field("Подтверждение", "select", ["Telegram + пароль", "2FA", "Админ-проверка"])}</div><p class="muted section">В MVP выплаты подтверждаются вручную администратором, tx hash добавляется после отправки.</p></section>
  </section></div>`, "Seller");
}

function sellerSettings() {
  return page("Настройки продавца", `<div class="layout"><aside class="sidebar">${sideLinks(sellerLinks)}</aside><section class="panel"><h2>Параметры магазина</h2><div class="form-grid">${field("Автовыдача", "select", ["Включена", "Выключена"])}${field("Модерация новых товаров", "select", ["Включена", "Выключена"])}${field("Уведомления о заказах", "select", ["Telegram", "Email", "Оба канала"])}${field("Гарантия по умолчанию", "input", "24 часа")}${field("Чат после оплаты", "select", ["Открывать всегда", "Только ручная выдача"])}${field("Спорный заказ", "select", ["Заморозить средства", "Ожидать решения"])}</div><section class="section"><h2>Автовыдача</h2><div class="list">${["Выдавать одну строку данных на заказ", "Скрывать данные до подтверждения оплаты", "Помечать использованную строку как списанную", "Останавливать товар при нулевом остатке"].map(row).join("")}</div></section></section></div>`, "Seller");
}

function sellerProducts() {
  return page("Мои товары", `<div class="layout"><aside class="sidebar">${sideLinks(sellerLinks)}</aside><section class="panel"><div class="section-head"><h2>Активные товары</h2><a class="btn primary" href="/seller/products/create" data-link>Создать товар</a></div><div class="list">${products.slice(0, 5).map((product, index) => `<a class="list-row" href="/seller/products/${product.id}/edit" data-link><span>${product.title}<br><span class="muted">${product.cat} · ${product.stock} шт. · ${money(product.price)}</span></span><span class="status ${index === 2 ? "wait" : "ok"}">${index === 2 ? "на модерации" : "опубликован"}</span></a>`).join("")}</div></section></div>`, "Seller");
}

function sellerOrders() {
  return page("Заказы продавца", `<div class="layout"><aside class="sidebar">${sideLinks(sellerLinks)}</aside><section class="panel"><h2>Очередь выполнения</h2><div class="list">${demoOrders.map((orderItem) => orderListRow(orderItem)).join("")}</div></section></div>`, "Seller");
}

function publicSeller() {
  return page("Продавец PixelTrade", `<div class="two-col"><section>
    <div class="panel"><div class="section-head"><div><h2>PixelTrade</h2><p class="muted">Проверенный продавец Roblox и игровых пополнений.</p></div><span class="status ok">верифицирован</span></div><div class="grid metrics">${[
      ["4.98", "рейтинг"],
      ["12 840", "продаж"],
      ["5 мин", "средняя выдача"],
      ["0.6%", "споров"],
    ].map(([value, label]) => `<div class="metric panel"><strong>${value}</strong><span>${label}</span></div>`).join("")}</div></div>
    <section class="section"><div class="section-head"><h2>Товары продавца</h2></div>${productCards(products.slice(0, 4))}</section>
  </section><aside class="panel"><h2>Отзывы</h2><div class="list">${["Быстрая автовыдача", "Отвечает в чате", "Коды рабочие", "Возвратов почти нет"].map((x) => row(x, "5★")).join("")}</div><a class="btn primary section" href="/chats" data-link>Написать продавцу</a></aside></div>`, "Seller");
}

function createProduct(mode = "create", id = 12345) {
  const p = mode === "edit" ? productById(id) : productById(12345);
  const title = mode === "edit" ? `Редактирование товара #${p.id}` : "Создание товара";
  return page(title, `<div class="layout"><aside class="sidebar">${sideLinks(sellerLinks)}</aside><section>
    <div class="panel"><div class="section-head"><h2>Основные поля</h2><span class="status ${mode === "edit" ? "wait" : "ok"}">${mode === "edit" ? "на модерации после правок" : "новый товар"}</span></div><div class="form-grid">${field("Категория", "select", categories.map((c) => c[0]))}${field("Подкатегория", "input", p.cat === "Roblox" ? "Robux" : p.cat)}${field("Название", "input", p.title)}${field("Цена в USDT", "input", p.price.toFixed(2))}${field("Наличие", "input", String(p.stock))}${field("Тип выдачи", "select", ["Автоматическая", "Ручная"])}${field("Регион", "select", ["EU", "US", "CIS", "Любой"])}${field("Платформа", "input", p.cat)}${field("Срок выполнения", "input", "5 минут")}${field("Гарантия", "input", "24 часа")}${field("Изображение", "input", "Загрузить файл")}${field("Статус", "select", ["Черновик", "На модерации", "Опубликован"])}</div></div>
    <div class="panel section"><h2>Описание и выдача</h2><div class="form-grid">${field("Описание", "textarea", "Что получает покупатель")}${field("Инструкция покупателю", "textarea", "Как активировать товар")}${field("Данные для автовыдачи", "textarea", "Один код, ключ или аккаунт на строку")}</div><div class="list section">${["Автовыдача списывает одну строку после подтверждения оплаты", "Ручная выдача открывает чат и ставит заказ в работу", "Модерация может проверять новые товары перед публикацией", "После публикации товар появится в каталоге"].map(row).join("")}</div></div>
    <section class="section"><div class="section-head"><h2>Предпросмотр</h2><a class="btn" href="/product/${p.id}" data-link>Открыть карточку</a></div>${productCards([p])}<section class="panel section"><h2>Остатки автовыдачи</h2><div class="list">${[["Всего строк", String(p.stock)], ["Зарезервировано заказами", "2"], ["Использовано", "18"], ["При нуле", "снять товар с публикации"]].map(([left, right]) => row(left, right)).join("")}</div></section></section>
    <div class="form-actions section"><button class="btn">Сохранить черновик</button><button class="btn warn">Отправить на модерацию</button><button class="btn primary">${mode === "edit" ? "Сохранить правки" : "Опубликовать"}</button></div>
  </section></div>`, "Seller");
}

function finance() {
  return page("Финансы продавца", `<div class="layout"><aside class="sidebar">${sideLinks(sellerLinks)}</aside><section>
    <div class="grid metrics">${["Общий заработок: 12 840 USDT", "Доступно: 1 240 USDT", "В холде: 480 USDT", "Комиссия: 6%"].map((x) => `<div class="metric panel"><strong>${x.split(": ")[1]}</strong><span>${x.split(": ")[0]}</span></div>`).join("")}</div>
    <section class="section panel"><h2>История продаж</h2><div class="list">${[
      ["#12345 · Robux 10 000", "84.90 USDT · в холде"],
      ["#22341 · Steam Gift Card", "47.00 USDT · доступно"],
      ["#33412 · Telegram Premium", "29.61 USDT · доступно"],
    ].map(([left, right]) => row(left, right)).join("")}</div></section>
    <section class="section panel"><h2>История средств</h2>${["В холде", "Доступно", "Запрошено на вывод", "Выплачено", "Заморожено из-за спора"].map((x) => row(x, "USDT")).join("")}</section>
  </section></div>`, "Seller");
}

function withdraw() {
  return page("Вывод средств", `<div class="layout"><aside class="sidebar">${sideLinks(sellerLinks)}</aside><section>
    <section class="panel"><h2>Новый вывод</h2><div class="form-grid">${field("Валюта", "select", ["USDT"])}${field("Сеть", "select", ["TRC20", "TON", "BEP20"])}${field("Адрес кошелька", "input", "T...")}${field("Сумма", "input", "500")}${field("Комиссия сети", "input", "1 USDT")}${field("Итого к получению", "input", "499 USDT")}</div><div class="form-actions section"><button class="btn primary">Запросить вывод</button><span class="status wait">MVP: ручное подтверждение админом</span></div></section>
    <section class="panel section"><h2>История выплат</h2><div class="list">${[
      ["#WD-120 · 500 USDT · TRC20", "На проверке"],
      ["#WD-108 · 300 USDT · TON", "Выполнен"],
      ["#WD-099 · 150 USDT · BEP20", "Отклонен"],
    ].map(([left, status]) => `<div class="list-row"><span>${left}</span><span class="status ${status === "Выполнен" ? "ok" : status === "Отклонен" ? "bad" : "wait"}">${status}</span></div>`).join("")}</div></section>
  </section></div>`, "Seller");
}

function disputes() {
  return page("Споры", `<div class="two-col"><section class="panel"><h2>Открыть спор</h2><div class="form-grid">${field("Заказ", "input", "#12345")}${field("Причина", "select", ["Товар не выдан", "Товар не работает", "Продавец не отвечает", "Неверное описание", "Проблема с оплатой", "Другое"])}${field("Описание проблемы", "textarea", "Опишите ситуацию")}${field("Доказательства", "input", "Ссылка или файл")}</div><button class="btn primary section">Отправить</button><section class="section"><h2>Активные споры</h2><div class="list">${[
    ...(state.disputeCreated ? [{ id: 45, order: 12345, reason: "Создан только что", status: "Новый" }] : []),
    ...demoDisputes,
  ].map((dispute) => `<a class="list-row" href="/disputes/${dispute.id}" data-link><span>#DSP-${dispute.id} · заказ #${dispute.order}<br><span class="muted">${dispute.reason}</span></span><span class="status wait">${dispute.status}</span></a>`).join("")}</div></section></section><aside class="panel"><h2>Решения поддержки</h2>${["Закрыть в пользу покупателя", "Закрыть в пользу продавца", "Частичный возврат", "Запросить дополнительные данные", "Заморозить средства до решения"].map(row).join("")}</aside></div>`, "Support");
}

function disputeDetail(id = 123) {
  const dispute = disputeById(id);
  const orderItem = orderById(dispute.order);
  const messages = ["Покупатель: товар не активируется, приложил скриншот ошибки.", "Продавец: нужна проверка никнейма и региона.", "Поддержка: средства заморожены до решения.", "Система: платеж и чат заказа прикреплены к спору."];
  return page(`Спор #DSP-${dispute.id}`, `<div class="two-col">
    <section class="panel"><div class="section-head"><div><h2>${dispute.reason}</h2><p class="muted">Заказ #${dispute.order} · ${orderItem.product}</p></div><span class="status wait">${dispute.status}</span></div><div class="list">${[
      ["Покупатель", dispute.buyer],
      ["Продавец", dispute.seller],
      ["Сумма заказа", money(orderItem.amount)],
      ["Escrow", "заморожен до решения"],
      ["Предварительное решение", dispute.refund],
    ].map(([left, right]) => row(left, right)).join("")}</div><section class="section"><h2>Чат спора</h2><div class="list">${messages.map((message) => `<div class="chat-message">${message}</div>`).join("")}</div></section><section class="section"><h2>Доказательства</h2><div class="list">${["Скриншот ошибки активации", "tx hash платежа", "Переписка из чата заказа", "Данные выдачи продавца"].map(row).join("")}</div></section></section>
    <aside class="panel"><h2>Действия поддержки</h2><div class="form-grid">${field("Решение", "select", ["Запросить данные", "Частичный возврат", "Полный возврат", "Закрыть в пользу продавца"])}${field("Сумма возврата", "input", "35 USDT")}${field("Комментарий", "textarea", "Опишите решение поддержки")}</div><div class="form-actions section"><button class="btn primary">Сохранить решение</button><a class="btn" href="/orders/${dispute.order}" data-link>Открыть заказ</a><a class="btn" href="/admin/payments/${dispute.payment}" data-link>Платеж</a></div></aside>
  </div>`, "Support");
}

function support(path = "") {
  if (path.includes("/tickets/")) return supportTicketDetail(path.split("/").pop());
  if (path.includes("/ticket")) return supportTicket();
  if (path.includes("/requests")) return supportRequests();
  if (path.includes("/payment")) return supportTopic("Проблемы с оплатой", ["Проверьте сеть и точную сумму", "Сохраните tx hash", "Если сумма недостаточная, доплатите только после ответа поддержки", "Не отправляйте другой токен на адрес USDT"]);
  if (path.includes("/order")) return supportTopic("Проблемы с заказом", ["Откройте страницу заказа", "Проверьте данные выдачи", "Напишите продавцу в чат", "Если ответа нет, откройте спор"]);
  if (path.includes("/seller")) return supportTopic("Проблемы с продавцом", ["Не выводите общение из чата заказа", "Приложите скриншоты или файлы", "Поддержка увидит платеж и историю", "Средства можно заблокировать до решения"]);
  if (path.includes("/faq")) return supportTopic("FAQ", ["Как оплатить USDT", "Как работает escrow", "Когда продавец получает деньги", "Как открыть спор", "Как вывести средства продавцу"]);

  const items = [
    ["FAQ", "/support/faq"],
    ["Создать тикет", "/support/ticket"],
    ["Мои обращения", "/support/requests"],
    ["Правила возврата", "/refund-policy"],
    ["Проблемы с оплатой", "/support/payment"],
    ["Проблемы с заказом", "/support/order"],
    ["Проблемы с продавцом", "/support/seller"],
  ];
  return page("Поддержка", `<div class="grid categories">${items.map(([label, href]) => `<a class="category-card" href="${href}" data-link><span class="category-icon">?</span><strong>${label}</strong><span class="muted">Раздел поддержки</span></a>`).join("")}</div>`, "Support");
}

function supportTicket() {
  return page("Создать тикет", `<div class="two-col"><section class="panel"><div class="form-grid">${field("Тема", "select", ["Проблема с оплатой", "Проблема с заказом", "Проблема с продавцом", "Выплаты", "Другое"])}${field("Связанный заказ", "input", "#12345")}${field("Описание", "textarea", "Опишите проблему подробно")}${field("Контакт", "input", "@telegram")}</div><button class="btn primary section">Создать тикет</button></section><aside class="panel"><h2>Что приложить</h2>${["tx hash", "номер заказа", "скриншоты переписки", "файлы или коды выдачи"].map(row).join("")}</aside></div>`, "Support");
}

function supportRequests() {
  return page("Мои обращения", `<section class="panel"><div class="list">${demoTickets.map(ticketListRow).join("")}</div></section>`, "Support");
}

function supportTicketDetail(id = "SUP-104") {
  const ticket = ticketById(id);
  const paymentItem = paymentByOrderId(ticket.order);
  return page(`Тикет #${ticket.id}`, `<div class="two-col">
    <section class="panel"><div class="section-head"><div><h2>${ticket.topic}</h2><p class="muted">Связан с заказом #${ticket.order}</p></div><span class="status ${statusTone(ticket.status)}">${ticket.status}</span></div><section class="section"><h2>Переписка</h2><div class="list">${[
      "Покупатель: приложил tx hash и скрин оплаты.",
      "Поддержка: проверяем сеть и сумму.",
      "Система: найден связанный платеж и заказ.",
      "Поддержка: если подтверждений достаточно, заказ будет обновлен вручную.",
    ].map((message) => `<div class="chat-message">${message}</div>`).join("")}</div></section><form class="form-actions section">${field("Ответ", "input", "Написать в поддержку")}<button class="btn primary">Отправить</button></form></section>
    <aside class="panel"><h2>Связанные сущности</h2><div class="list">${[
      ["Заказ", `#${ticket.order}`],
      ["Платеж", paymentItem.id],
      ["Сеть", paymentItem.network],
      ["tx hash", paymentItem.tx],
      ["Подтверждения", paymentItem.confirmations],
    ].map(([left, right]) => row(left, right)).join("")}</div><div class="form-actions section"><a class="btn" href="/orders/${ticket.order}" data-link>Открыть заказ</a><a class="btn" href="/admin/payments/${paymentItem.id}" data-link>Админ-платеж</a></div></aside>
  </div>`, "Support");
}

function supportTopic(title, rows) {
  return page(title, `<section class="panel"><div class="list">${rows.map(row).join("")}</div><div class="form-actions section"><a class="btn primary" href="/support/ticket" data-link>Создать тикет</a><a class="btn" href="/support" data-link>Все разделы</a></div></section>`, "Support");
}

function admin(path = "") {
  if (path.includes("/payments/")) return adminPaymentDetail(path.split("/").pop());
  if (path.includes("/payouts/")) return adminPayoutDetail(path.split("/").pop());
  if (path.includes("/users")) return adminUsers();
  if (path.includes("/sellers")) return adminSellers();
  if (path.includes("/products")) return adminProducts();
  if (path.includes("/orders")) return adminTable("Админка заказов", ["#12345 · Robux 10 000", "Покупатель Artem", "Продавец PixelTrade", "Статус: ожидает подтверждения", "Ручная смена статуса доступна"]);
  if (path.includes("/crypto")) return adminCrypto();
  if (path.includes("/payments")) return adminPayments();
  if (path.includes("/payouts")) return adminPayouts();
  if (path.includes("/disputes")) return adminTable("Админка споров", ["#12345 · покупатель открыл спор", "Причина: товар не работает", "Чат доступен", "Оплата подтверждена", "Решение: запросить данные"]);
  if (path.includes("/tickets")) return adminTickets();
  if (path.includes("/categories")) return adminCategories();
  if (path.includes("/promocodes")) return adminPromocodes();
  if (path.includes("/fees")) return adminFees();
  if (path.includes("/moderation")) return adminModeration();
  if (path !== "/admin") return adminTable(adminLinks.find((item) => item[1] === path)?.[0] || "Раздел админки", ["Список записей", "Фильтры", "Ручные действия", "История изменений"]);

  return page("Админ-панель", `<div class="layout"><aside class="sidebar">${sideLinks(adminLinks)}</aside><section><div class="grid metrics">${[
    [demoOrders.length, "заказа в системе"],
    [demoPayments.filter((paymentItem) => paymentItem.status === "Оплачено").length, "оплачено"],
    [demoTickets.filter((ticket) => ticket.status !== "Закрыт").length, "активных тикета"],
    [products.length, "товаров"],
  ].map(([value, label]) => `<div class="metric panel"><strong>${value}</strong><span>${label}</span></div>`).join("")}</div><div class="grid admin section">${adminLinks.slice(1).map(([label, href]) => `<a class="admin-tile panel" href="${href}" data-link><h3>${label}</h3><p class="muted">Смена статусов, история действий, ручная проверка и модерация.</p></a>`).join("")}</div><section class="section panel"><h2>Последние платежи</h2>${demoPayments.map(paymentListRow).join("")}</section></section></div>`, "Admin");
}

function adminPayments() {
  return page("Админка платежей", `<div class="layout"><aside class="sidebar">${sideLinks(adminLinks)}</aside><section class="panel"><div class="section-head"><h2>Крипто-транзакции</h2><button class="btn primary">Синхронизировать</button></div><div class="list">${demoPayments.map((paymentItem) => `<a class="list-row" href="/admin/payments/${paymentItem.id}" data-link><span>${paymentItem.amount.toFixed(2)} ${paymentItem.coin} · ${paymentItem.network}<br><span class="muted">#${paymentItem.order} · ${paymentItem.tx} · ${paymentItem.confirmations}</span></span><span class="status ${statusTone(paymentItem.status)}">${paymentItem.status}</span></a>`).join("")}</div><div class="form-actions section"><button class="btn">Сменить статус</button><button class="btn warn">Открыть заказ</button><button class="btn danger">Пометить ошибку сети</button></div></section></div>`, "Admin");
}

function adminPaymentDetail(id = "pay-12345") {
  const paymentItem = paymentById(id);
  const orderItem = orderById(paymentItem.order);
  return page(`Платеж ${paymentItem.id}`, `<div class="layout"><aside class="sidebar">${sideLinks(adminLinks)}</aside><section>
    <section class="panel"><div class="section-head"><div><h2>${paymentItem.amount.toFixed(2)} ${paymentItem.coin}</h2><p class="muted">${paymentItem.network} · заказ #${paymentItem.order}</p></div><span class="status ${statusTone(paymentItem.status)}">${paymentItem.status}</span></div><div class="grid metrics">${[
      [paymentItem.network, "сеть"],
      [paymentItem.confirmations, "подтверждения"],
      [paymentItem.tx, "tx hash"],
      [orderItem.order, "статус заказа"],
    ].map(([value, label]) => `<div class="metric panel"><strong>${value}</strong><span>${label}</span></div>`).join("")}</div></section>
    <section class="panel section"><h2>Ручная проверка</h2><div class="form-grid">${field("Адрес оплаты", "input", "TX9a...F2Lm")}${field("tx hash", "input", paymentItem.tx)}${field("Подтверждения", "input", paymentItem.confirmations)}${field("Статус", "select", ["Ожидает оплату", "Транзакция найдена", "Оплата подтверждена", "Недостаточная сумма", "Ошибка сети"])}${field("Комментарий админа", "textarea", "Проверить сумму и сеть перед сменой статуса")}</div><div class="form-actions section"><button class="btn primary">Сохранить статус</button><a class="btn" href="/orders/${paymentItem.order}" data-link>Связанный заказ</a><button class="btn danger">Пометить ошибку</button></div></section>
    <section class="panel section"><h2>История статусов</h2><div class="list">${["Создан адрес оплаты", "Транзакция найдена мониторингом", `Подтверждения: ${paymentItem.confirmations}`, `Текущий статус: ${paymentItem.status}`].map(row).join("")}</div></section>
  </section></div>`, "Admin");
}

function adminPayouts() {
  return page("Админка выплат", `<div class="layout"><aside class="sidebar">${sideLinks(adminLinks)}</aside><section>
    <section class="panel"><div class="section-head"><div><h2>Очередь выплат</h2><p class="muted">Ручная проверка адресов, баланса продавца и tx hash после отправки.</p></div><button class="btn primary">Обновить статусы</button></div><div class="list">${demoWithdrawals.map((withdrawalItem) => `<a class="list-row" href="/admin/payouts/${withdrawalItem.id}" data-link><span>#${withdrawalItem.id} · ${withdrawalItem.seller}<br><span class="muted">${withdrawalItem.amount.toFixed(2)} USDT · ${withdrawalItem.network} · ${withdrawalItem.address}</span></span><span class="status ${statusTone(withdrawalItem.status)}">${withdrawalItem.status}</span></a>`).join("")}</div></section>
    <section class="panel section"><h2>Проверки перед выплатой</h2><div class="grid trust">${["Адрес совпадает с профилем", "Баланс доступен без холда", "Нет открытого спора", "2FA продавца подтверждена"].map((item) => `<div class="trust-item panel"><h3>${item}</h3><p class="muted">Админ подтверждает вручную в MVP.</p></div>`).join("")}</div></section>
  </section></div>`, "Admin");
}

function adminPayoutDetail(id = "WD-120") {
  const withdrawalItem = withdrawalById(id);
  return page(`Выплата #${withdrawalItem.id}`, `<div class="layout"><aside class="sidebar">${sideLinks(adminLinks)}</aside><section>
    <section class="panel"><div class="section-head"><div><h2>${withdrawalItem.seller} · ${withdrawalItem.amount.toFixed(2)} USDT</h2><p class="muted">${withdrawalItem.network} · ${withdrawalItem.address}</p></div><span class="status ${statusTone(withdrawalItem.status)}">${withdrawalItem.status}</span></div><div class="grid metrics">${[
      [withdrawalItem.network, "сеть"],
      [withdrawalItem.tx, "tx hash"],
      [withdrawalItem.risk, "риск"],
      [withdrawalItem.status, "статус"],
    ].map(([value, label]) => `<div class="metric panel"><strong>${value}</strong><span>${label}</span></div>`).join("")}</div></section>
    <section class="panel section"><h2>Ручное подтверждение</h2><div class="form-grid">${field("Адрес кошелька", "input", withdrawalItem.address)}${field("Сеть", "select", ["TRC20", "TON", "BEP20"])}${field("Сумма", "input", `${withdrawalItem.amount.toFixed(2)} USDT`)}${field("tx hash выплаты", "input", withdrawalItem.tx)}${field("Статус", "select", ["На проверке", "В обработке", "Отправлен", "Выполнен", "Отклонен"])}${field("Комментарий", "textarea", "Проверить адрес, холды и открытые споры перед отправкой")}</div><div class="form-actions section"><button class="btn primary">Подтвердить выплату</button><button class="btn warn">Запросить проверку</button><button class="btn danger">Отклонить</button></div></section>
    <section class="panel section"><h2>История изменения статусов</h2><div class="list">${["Запрос создан продавцом", "Адрес прошел форматную проверку", `Риск: ${withdrawalItem.risk}`, `Текущий статус: ${withdrawalItem.status}`].map(row).join("")}</div></section>
  </section></div>`, "Admin");
}

function adminTable(title, rows) {
  return page(title, `<div class="layout"><aside class="sidebar">${sideLinks(adminLinks)}</aside><section class="panel"><div class="section-head"><h2>Операции</h2><button class="btn primary">Сохранить изменения</button></div><div class="list">${rows.map(row).join("")}</div><div class="form-actions section"><button class="btn">Сменить статус</button><button class="btn warn">Открыть чат</button><button class="btn danger">Заблокировать средства</button></div></section></div>`, "Admin");
}

function adminUsers() {
  return page("Пользователи", `<div class="layout"><aside class="sidebar">${sideLinks(adminLinks)}</aside><section class="panel"><div class="section-head"><h2>Аккаунты</h2><button class="btn">Экспорт</button></div><div class="list">${[
    ["Artem · buyer@example.com", "Покупатель"],
    ["PixelTrade · seller@example.com", "Продавец"],
    ["SupportOne · support@example.com", "Администратор"],
  ].map(([left, role]) => `<div class="list-row"><span>${left}</span><span class="status ok">${role}</span></div>`).join("")}</div><section class="section"><h2>Роли</h2><div class="grid trust">${["Гость", "Покупатель", "Продавец", "Администратор"].map((role) => `<div class="trust-item panel"><h3>${role}</h3><p class="muted">${roleDescription(role)}</p></div>`).join("")}</div></section></section></div>`, "Admin");
}

function adminSellers() {
  return page("Продавцы", `<div class="layout"><aside class="sidebar">${sideLinks(adminLinks)}</aside><section class="panel"><h2>Проверка продавцов</h2><div class="list">${[
    ["PixelTrade", "верифицирован"],
    ["KeyDock", "верифицирован"],
    ["NewSeller", "на проверке"],
    ["RiskyShop", "ограничен"],
  ].map(([left, status]) => `<div class="list-row"><span>${left}</span><span class="status ${status === "ограничен" ? "bad" : status === "на проверке" ? "wait" : "ok"}">${status}</span></div>`).join("")}</div><div class="form-actions section"><button class="btn">Запросить документы</button><button class="btn warn">Ограничить продажи</button><button class="btn primary">Подтвердить</button></div></section></div>`, "Admin");
}

function adminProducts() {
  return page("Товары", `<div class="layout"><aside class="sidebar">${sideLinks(adminLinks)}</aside><section class="panel"><h2>Модерация товаров</h2><div class="list">${products.slice(0, 6).map((product, index) => `<div class="list-row"><span>${product.title}<br><span class="muted">${product.seller} · ${product.cat}</span></span><span class="status ${index % 3 === 0 ? "wait" : "ok"}">${index % 3 === 0 ? "на проверке" : "активен"}</span></div>`).join("")}</div><div class="form-actions section"><button class="btn primary">Одобрить</button><button class="btn danger">Снять с публикации</button></div></section></div>`, "Admin");
}

function adminModeration() {
  const groups = ["Товар", "Жалоба", "Отзыв", "Продавец"].map((type) => {
    const items = moderationQueue.filter((item) => item.type === type);
    return `<section class="panel"><div class="section-head"><h2>${type}</h2><span class="status wait">${items.length}</span></div><div class="list">${items.map((item) => `<div class="list-row"><span>#${item.id} · ${item.target}<br><span class="muted">${item.owner} · ${item.reason}</span></span><span class="status ${statusTone(item.status)}">${item.status}</span></div>`).join("")}</div></section>`;
  }).join("");

  return page("Модерация", `<div class="layout"><aside class="sidebar">${sideLinks(adminLinks)}</aside><section>
    <div class="grid metrics">${[
      [moderationQueue.filter((item) => item.type === "Товар").length, "товаров"],
      [moderationQueue.filter((item) => item.type === "Жалоба").length, "жалоб"],
      [moderationQueue.filter((item) => item.type === "Отзыв").length, "отзывов"],
      [moderationQueue.filter((item) => item.type === "Продавец").length, "продавцов"],
    ].map(([value, label]) => `<div class="metric panel"><strong>${value}</strong><span>${label} в очереди</span></div>`).join("")}</div>
    <div class="grid admin section">${groups}</div>
    <section class="panel section"><h2>Ручное решение</h2><div class="form-grid">${field("Объект", "select", moderationQueue.map((item) => `#${item.id} · ${item.target}`))}${field("Действие", "select", ["Одобрить", "Запросить правки", "Снять товар", "Заблокировать продавца", "Скрыть отзыв"])}${field("Причина", "textarea", "Коротко опишите решение модерации")}${field("Новый статус", "select", ["Активен", "На проверке", "Ограничен", "Заблокирован"])}</div><div class="form-actions section"><button class="btn primary">Сохранить решение</button><button class="btn warn">Запросить данные</button><button class="btn danger">Заблокировать</button></div></section>
  </section></div>`, "Admin");
}

function adminTickets() {
  return page("Тикеты поддержки", `<div class="layout"><aside class="sidebar">${sideLinks(adminLinks)}</aside><section class="panel"><h2>Очередь обращений</h2><div class="list">${demoTickets.map(ticketListRow).join("")}</div><div class="form-actions section"><button class="btn warn">Запросить данные</button><button class="btn primary">Ответить</button></div></section></div>`, "Admin");
}

function roleDescription(role) {
  const map = {
    "Гость": "смотрит каталог и товары, затем регистрируется",
    "Покупатель": "покупает, оплачивает криптой, общается, открывает споры",
    "Продавец": "создает товары, выполняет заказы, получает выплаты",
    "Администратор": "управляет сайтом, платежами, выплатами и модерацией",
  };
  return map[role];
}

function adminCategories() {
  return page("Админка категорий", `<div class="layout"><aside class="sidebar">${sideLinks(adminLinks)}</aside><section class="panel"><div class="section-head"><h2>Категории</h2><button class="btn primary">Добавить категорию</button></div><div class="list">${categories.map(([name, desc]) => `<div class="list-row"><span>${name}<br><span class="muted">${desc}</span></span><span class="status ok">активна</span></div>`).join("")}</div><div class="form-grid section">${field("Название", "input", "Roblox")}${field("Slug", "input", "roblox")}${field("SEO-текст", "textarea", "Описание категории для поиска")}</div></section></div>`, "Admin");
}

function adminFees() {
  return page("Комиссии платформы", `<div class="layout"><aside class="sidebar">${sideLinks(adminLinks)}</aside><section class="panel"><h2>Правила комиссий</h2><div class="form-grid">${field("Базовая комиссия", "input", "6%")}${field("Минимальная комиссия", "input", "0.20 USDT")}${field("Холд средств", "input", "до подтверждения заказа")}${field("TRC20 сеть", "input", "ручная выплата")}${field("TON сеть", "input", "ручная выплата")}${field("BEP20 сеть", "input", "ручная выплата")}</div><section class="section"><h2>Примеры</h2><div class="list">${[
    ["Заказ 100 USDT", "6 USDT комиссия"],
    ["Продавцу начисляется", "94 USDT"],
    ["До подтверждения", "в холде"],
    ["После завершения", "доступно к выводу"],
  ].map(([left, right]) => row(left, right)).join("")}</div></section></section></div>`, "Admin");
}

function adminPromocodes() {
  return page("Промокоды", `<div class="layout"><aside class="sidebar">${sideLinks(adminLinks)}</aside><section class="panel"><div class="section-head"><h2>Будущий модуль</h2><span class="status wait">после MVP</span></div><div class="form-grid">${field("Код", "input", "WELCOME10")}${field("Скидка", "input", "10%")}${field("Лимит", "input", "100 использований")}${field("Категория", "select", ["Любая", "Roblox", "Steam", "Telegram"])}${field("Срок действия", "input", "30 дней")}${field("Статус", "select", ["Отключен", "Активен"])}</div><section class="section"><h2>Правила</h2><div class="list">${["Не входит в первую MVP-версию", "Можно добавить после стабилизации оплат", "Админ задает лимиты и категории", "Скидка учитывается до комиссии платформы"].map(row).join("")}</div></section></section></div>`, "Admin");
}

function adminCrypto() {
  return page("Настройки крипто-платежей", `<div class="layout"><aside class="sidebar">${sideLinks(adminLinks)}</aside><section>
    <div class="grid metrics">${[
      ["TRC20", "3 подтверждения"],
      ["TON", "1 подтверждение"],
      ["BEP20", "12 подтверждений"],
      ["USDT", "базовая валюта"],
    ].map(([value, label]) => `<div class="metric panel"><strong>${value}</strong><span>${label}</span></div>`).join("")}</div>
    <section class="panel section"><h2>Сети MVP</h2><div class="form-grid">${field("USDT TRC20 адрес", "input", "TX9a...F2Lm")}${field("USDT TON адрес", "input", "UQ9...Ton")}${field("USDT BEP20 адрес", "input", "0x9a...b20")}${field("Генерация", "select", ["Отдельный адрес", "Уникальная сумма"])}${field("Таймер оплаты", "input", "30 минут")}${field("Недостаточная сумма", "select", ["Открыть тикет", "Ждать доплату", "Ручная проверка"])}</div></section>
    <section class="panel section"><h2>Мониторинг</h2><div class="list">${[
      ["Последний найденный tx", "2 мин назад"],
      ["Ошибки сети", "0"],
      ["Просроченные платежи", "4"],
      ["Недостаточная сумма", "1"],
    ].map(([left, right]) => row(left, right)).join("")}</div></section>
  </section></div>`, "Admin");
}

function dashboard(title, links, rows, eyebrow = "Account") {
  return page(title, `<div class="layout"><aside class="sidebar">${sideLinks(links)}</aside><section class="panel"><h2>Обзор</h2><div class="list">${rows.map(row).join("")}</div></section></div>`, eyebrow);
}

function sideLinks(links) {
  return links.map((item, index) => {
    const label = Array.isArray(item) ? item[0] : item;
    const href = Array.isArray(item) ? item[1] : "#";
    const isActive = currentPath() === href || (index === 0 && currentPath() === href);
    return `<a class="side-link ${isActive ? "active" : ""}" href="${href}" data-link>${label}<span>›</span></a>`;
  }).join("");
}

function info(path) {
  if (path === "/status-map") return statusMap();
  if (path === "/backend-structure") return backendStructure();
  const data = infoPages[path] || ["Страница", "Раздел будет добавлен позже."];
  const rows = infoRows(path);
  return page(data[0], `<section class="panel"><p class="lead">${data[1]}</p><div class="list section">${rows.map(row).join("")}</div></section>`, "Info");
}

function statusMap() {
  const groups = [
    ["Статусы оплаты", ["Ожидает оплату", "Транзакция найдена", "Ожидает подтверждений", "Оплата подтверждена", "Недостаточная сумма", "Просрочено", "Ошибка сети", "Оплачено"]],
    ["Статусы заказа", ["Создан", "Ожидает оплату", "Оплачен", "В работе", "Ожидает подтверждения покупателя", "Завершен", "Спор", "Возврат", "Отменен"]],
    ["Статусы средств", ["В холде", "Доступно", "Запрошено на вывод", "Выплачено", "Заморожено из-за спора"]],
    ["Статусы вывода", ["Создан", "На проверке", "В обработке", "Отправлен", "Выполнен", "Отклонен"]],
  ];
  return page("Карта статусов", `<div class="grid admin">${groups.map(([title, rows]) => `<section class="admin-tile panel"><h2>${title}</h2><div class="list">${rows.map((item) => row(item)).join("")}</div></section>`).join("")}</div>`, "Info");
}

function backendStructure() {
  return page("Backend-ready структура", `<div class="two-col"><section class="panel"><h2>Будущие модели</h2><div class="list">${dataModels.map(([model, fields]) => row(model, fields)).join("")}</div></section><aside class="panel"><h2>Следующий распил файлов</h2><div class="list">${[
    ["data.js", "демо-коллекции и сиды"],
    ["routes.js", "карта SPA-маршрутов"],
    ["renderers/", "страницы каталога, заказов, продавца, админки"],
    ["api/", "будущие fetch-клиенты"],
    ["models/", "контракты User, Product, Order, Payment"],
  ].map(([left, right]) => row(left, right)).join("")}</div></aside></div>`, "Info");
}

function infoRows(path) {
  const common = ["Безопасная сделка", "Крипто-оплата", "Чат по заказу", "История действий", "Поддержка и споры"];
  const map = {
    "/crypto-payment-guide": ["Выберите USDT TRC20, TON или BEP20", "Отправьте точную сумму", "Проверьте сеть перед отправкой", "Дождитесь подтверждений", "Не отправляйте BTC или ETH на адрес USDT"],
    "/refund-policy": ["Возврат через спор", "Средства блокируются до решения", "Возможен частичный возврат", "Автовыданные данные проверяются поддержкой", "Закрытый заказ без спора считается подтвержденным"],
    "/seller-rules": ["Точное описание товара", "Запрет повторной продажи кодов", "Срок выполнения обязателен", "Чат только внутри заказа", "Выплаты после завершения заказа"],
    "/buyer-rules": ["Оплата только выбранной сетью", "Проверка товара перед подтверждением", "Не передавайте лишние данные", "Спор открывается со страницы заказа", "Отзывы только после покупки"],
    "/fees": ["Комиссия платформы удерживается после завершения", "Сетевая комиссия оплачивается отправителем", "Выплаты продавцам вручную в MVP", "Ставку комиссии задает админка"],
    "/terms": ["Пользователь принимает правила безопасной сделки", "Платформа удерживает средства до завершения заказа", "Чаты и споры ведутся внутри заказа", "Администратор может заморозить средства при споре", "Запрещены мошеннические товары и повторная продажа кодов"],
    "/privacy": ["Хранятся email, Telegram и история заказов", "Платежные данные включают сеть, адрес и tx hash", "Данные выдачи доступны только участникам заказа и поддержке", "Файлы из спора используются только для решения обращения", "Пароли и 2FA должны храниться отдельно на backend-этапе"],
    "/contacts": ["Поддержка: через /support/ticket", "Споры: через страницу заказа", "Продавцы: через чат заказа", "Административные вопросы: через тикет", "Экстренные платежи: приложите tx hash"],
    "/faq": ["Как оплатить: выберите сеть и отправьте точную сумму", "Когда выдается товар: после подтверждения оплаты", "Когда продавец получает деньги: после завершения заказа", "Что делать при ошибке сети: создать тикет с tx hash", "Как открыть спор: со страницы заказа"],
  };
  return map[path] || common;
}

function field(label, type, value) {
  if (type === "select") return `<label class="field"><span>${label}</span><select>${value.map((x) => `<option>${x}</option>`).join("")}</select></label>`;
  if (type === "textarea") return `<label class="field"><span>${label}</span><textarea>${value}</textarea></label>`;
  return `<label class="field"><span>${label}</span><input value="${value}" /></label>`;
}

function option(value, label, selected) {
  return `<option value="${value}" ${String(value) === String(selected) ? "selected" : ""}>${label}</option>`;
}

function sortTab(value, label) {
  return `<button class="tab ${state.sort === value ? "active" : ""}" data-sort="${value}">${label}</button>`;
}

function row(left, right = "") {
  return `<div class="list-row"><span>${left}</span>${right ? `<strong>${right}</strong>` : "<span></span>"}</div>`;
}

function statusTone(status) {
  if (["Завершен", "Оплачено", "Закрыт", "Выполнен"].includes(status)) return "ok";
  if (["Спор", "Отклонен", "Ошибка сети"].includes(status)) return "bad";
  return "wait";
}

function orderListRow(orderItem) {
  return `<a class="list-row" href="/orders/${orderItem.id}" data-link><span>#${orderItem.id} · ${orderItem.product}<br><span class="muted">${orderItem.seller} · ${money(orderItem.amount)} · ${orderItem.delivery}</span></span><span class="status ${statusTone(orderItem.order)}">${orderItem.order}</span></a>`;
}

function paymentListRow(paymentItem) {
  return `<div class="list-row"><span>${paymentItem.amount.toFixed(2)} ${paymentItem.coin} · ${paymentItem.network}<br><span class="muted">#${paymentItem.order} · ${paymentItem.tx} · ${paymentItem.confirmations}</span></span><span class="status ${statusTone(paymentItem.status)}">${paymentItem.status}</span></div>`;
}

function ticketListRow(ticket) {
  return `<a class="list-row" href="/support/tickets/${ticket.id}" data-link><span>#${ticket.id} · ${ticket.topic}<br><span class="muted">заказ #${ticket.order}</span></span><span class="status ${statusTone(ticket.status)}">${ticket.status}</span></a>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function slug(text) {
  return text.toLowerCase().replaceAll(" ", "-").replaceAll("/", "");
}

function pretty(slugText) {
  return decodeURIComponent(slugText || "").replaceAll("-", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function render() {
  const path = currentPath();
  if (path === "/") app.innerHTML = home();
  else if (path === "/catalog") app.innerHTML = catalog();
  else if (path.startsWith("/catalog/")) app.innerHTML = catalog(path.split("/").pop());
  else if (path.startsWith("/product/")) app.innerHTML = product(path.split("/").pop());
  else if (path === "/auth") app.innerHTML = auth();
  else if (path === "/checkout") app.innerHTML = checkout();
  else if (path.startsWith("/payment/")) app.innerHTML = payment(path.split("/").pop());
  else if (path.startsWith("/orders/")) app.innerHTML = order(path.split("/").pop());
  else if (path === "/chats") app.innerHTML = chats();
  else if (path === "/notifications") app.innerHTML = notifications();
  else if (path.startsWith("/account")) app.innerHTML = account(path);
  else if (path === "/seller/pixeltrade") app.innerHTML = publicSeller();
  else if (path.startsWith("/seller")) app.innerHTML = seller(path);
  else if (path === "/disputes") app.innerHTML = disputes();
  else if (path.startsWith("/disputes/")) app.innerHTML = disputeDetail(path.split("/").pop());
  else if (path.startsWith("/support")) app.innerHTML = support(path);
  else if (path.startsWith("/admin")) app.innerHTML = admin(path);
  else app.innerHTML = info(path);
  bind();
}

function bind() {
  document.querySelectorAll("[data-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      go(link.getAttribute("href"));
    });
  });
  document.querySelector("[data-currency]")?.addEventListener("click", () => {
    currency = currency === "USDT" ? "USD" : "USDT";
    saveState();
    render();
  });
  document.querySelector("[data-currency-select]")?.addEventListener("change", (event) => {
    currency = event.target.value;
    saveState();
    render();
  });
  document.querySelector("[data-search-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    setSearch(new FormData(event.currentTarget).get("query") || "");
  });
  document.querySelectorAll("[data-filter]").forEach((control) => {
    control.addEventListener("change", (event) => {
      const key = event.target.dataset.filter;
      state[key] = key === "maxPrice" ? Number(event.target.value || 100) : event.target.value;
      render();
    });
  });
  document.querySelectorAll("[data-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      state.sort = button.dataset.sort;
      render();
    });
  });
  document.querySelectorAll("[data-favorite]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const id = Number(button.dataset.favorite);
      if (state.favorites.has(id)) state.favorites.delete(id);
      else state.favorites.add(id);
      saveState();
      render();
    });
  });
  document.querySelector("[data-reset-filters]")?.addEventListener("click", () => {
    state.query = "";
    state.maxPrice = 100;
    state.delivery = "all";
    state.rating = "4.8";
    state.sort = "popular";
    render();
  });
  document.querySelector("[data-copy-address]")?.addEventListener("click", async () => {
    state.copiedAddress = true;
    saveState();
    try {
      await navigator.clipboard?.writeText("TX9a...F2Lm");
      notify("Адрес оплаты скопирован");
    } catch {
      notify("Адрес отмечен как скопированный");
    }
  });
  document.querySelector("[data-confirm-order]")?.addEventListener("click", () => {
    state.orderConfirmed = true;
    saveState();
    notify("Получение подтверждено, средства доступны продавцу");
  });
  document.querySelector("[data-open-dispute]")?.addEventListener("click", () => {
    state.disputeCreated = true;
    saveState();
    notify("Спор создан и средства остаются в холде");
    go("/disputes");
  });
  document.querySelector("[data-chat-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = event.currentTarget.querySelector("input");
    const message = input.value.trim();
    if (!message) return;
    state.chatMessages.push(message);
    saveState();
    notify("Сообщение отправлено в чат заказа");
    render();
  });
  document.querySelector("[data-file-action]")?.addEventListener("click", () => {
    notify("В MVP файл прикрепляется через тикет или чат заказа");
  });
  document.querySelector("[data-reset-demo]")?.addEventListener("click", () => {
    resetDemoState();
  });
  document.querySelectorAll("[data-step]").forEach((button) => button.addEventListener("click", () => {
    activeStep = Number(button.dataset.step);
    render();
  }));
  document.querySelector("[data-step-next]")?.addEventListener("click", () => {
    activeStep = Math.min(4, activeStep + 1);
    render();
  });
  document.querySelector("[data-step-prev]")?.addEventListener("click", () => {
    activeStep = Math.max(1, activeStep - 1);
    render();
  });
}

addEventListener("popstate", render);
addEventListener("hashchange", () => {
  render();
  scrollTo({ top: 0, behavior: "smooth" });
});
render();

