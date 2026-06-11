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

const homeCategories = [
  ["AC", "Аккаунты", "Игровые и сервисные аккаунты"],
  ["KY", "Ключи", "Steam, Xbox, PlayStation"],
  ["IG", "Игровая валюта", "Robux, VP, UC, донат"],
  ["SB", "Подписки", "Telegram, Discord, Spotify"],
  ["SF", "Софт", "Лицензии, утилиты, VPN"],
  ["SV", "Услуги", "Буст, настройка, помощь"],
];

const homeRecommendedProducts = [
  ["RB", "Roblox 10 000 Robux", "PixelTrade", "Автовыдача", "84.90", "4.98", "8 420", ["#222a36", "#394252"]],
  ["ST", "Steam Gift Card 50$", "KeyDock", "Автовыдача", "50.00", "4.95", "6 104", ["#1f2b38", "#324150"]],
  ["TG", "Telegram Premium 12 месяцев", "SubLine", "Ручная", "31.50", "4.88", "902", ["#202936", "#344154"]],
  ["MC", "Minecraft Java аккаунт", "GameVault", "Автовыдача", "12.80", "4.92", "1 840", ["#222a24", "#394638"]],
  ["VP", "Valorant VP EU", "AimShop", "Ручная", "22.40", "4.96", "1 120", ["#2f2228", "#47333b"]],
  ["DN", "Discord Nitro 1 месяц", "NitroHub", "Автовыдача", "7.20", "4.91", "3 240", ["#24263b", "#3b3e56"]],
];

const homeSellers = [
  ["PixelTrade", "USDT TRC20", "4.98", "8 420"],
  ["KeyDock", "USDT TON", "4.95", "6 104"],
  ["SubLine", "USDT BEP20", "4.88", "4 704"],
  ["AimShop", "USDT TRC20", "4.96", "7 122"],
  ["CryptoStore", "USDT TON", "4.93", "3 916"],
  ["TopDigital", "USDT BEP20", "4.91", "5 240"],
];

function homeSection(title, body, action = "") {
  return `<section class="home-section"><div class="section-head"><h2>${title}</h2>${action}</div>${body}</section>`;
}

function homeStats() {
  return `<section class="home-stats">${[
    ["28 450+", "успешных сделок"],
    ["3 сети", "для оплаты"],
    ["4.91", "средний рейтинг"],
    ["15 мин", "типовая выдача"],
  ].map(([value, label]) => `<article class="home-stat"><strong>${value}</strong><span>${label}</span></article>`).join("")}</section>`;
}

function trustBar() {
  return `<section class="trust-bar">${[
    ["Гарантия"],
    ["Автовыдача"],
    ["Арбитраж"],
    ["USDT"],
  ].map(([title]) => `<article><span aria-hidden="true">✓</span><strong>${title}</strong></article>`).join("")}</section>`;
}

function homeCategoryGrid() {
  return `<div class="home-categories">${homeCategories.map(([icon, title, description]) => `
    <a class="home-category-card" href="/catalog/${slug(title)}" data-link>
      <span>${icon}</span><strong>${title}</strong><small>${description}</small>
    </a>`).join("")}</div>`;
}

function homeProductGrid(list) {
  return `<div class="home-product-grid">${list.map(([mark, title, seller, delivery, price, rating, sales, colors], index) => `
    <article class="home-product-card" style="--thumb-a:${colors[0]};--thumb-b:${colors[1]}">
      <a class="home-product-thumb" href="/product/${products[index % products.length].id}" data-link><span>${mark}</span></a>
      <div class="home-product-body">
        <h3>${title}</h3>
        <p class="home-seller-line"><span>${seller}</span><span>★ ${rating}</span></p>
        <p class="meta">${delivery} · ${sales} продаж</p>
        <strong class="home-price">${price} USDT</strong>
        <a class="btn primary" href="/product/${products[index % products.length].id}" data-link>Купить</a>
      </div>
    </article>`).join("")}</div>`;
}

function marketplaceIntro() {
  return `<section class="market-intro">
    <div>
      <p class="eyebrow">Маркетплейс цифровых товаров</p>
      <h1>Покупайте аккаунты, ключи, валюту и подписки</h1>
      <p class="lead">Быстрый поиск по товарам, рейтинги продавцов, автовыдача и арбитраж по каждому заказу.</p>
    </div>
    <form class="market-search" data-search-form>
      <span>⌕</span>
      <input name="query" value="${state.query}" placeholder="Robux, Steam, Telegram Premium" />
      <button class="btn primary">Найти</button>
    </form>
  </section>`;
}

function paymentBlock() {
  return `<section class="payment-block">
    <div>
      <p class="eyebrow">Crypto checkout</p>
      <h2>Оплата в USDT</h2>
      <p class="muted">Выбирайте сеть перед оплатой, отправляйте точную сумму и отслеживайте подтверждения прямо в заказе.</p>
    </div>
    <div class="payment-badges">${["USDT TRC20", "USDT TON", "USDT BEP20"].map((network) => `<span>${network}</span>`).join("")}</div>
  </section>`;
}

function homeSellerGrid() {
  return `<div class="home-sellers">${homeSellers.map(([name, network, rating, sales]) => `
    <article class="home-seller-card">
      <div class="seller-avatar">${name.slice(0, 2).toUpperCase()}</div>
      <strong>${name}</strong>
      <span class="status ok">${network}</span>
      <small>★ ${rating} · ${sales} продаж</small>
    </article>`).join("")}</div>`;
}

function home() {
  return `${header()}<main class="main">
    ${marketplaceIntro()}
    ${trustBar()}
    ${homeSection("Популярные категории", homeCategoryGrid(), `<a class="btn ghost" href="/catalog" data-link>Все категории</a>`)}
    ${homeSection("Рекомендованные товары", homeProductGrid(homeRecommendedProducts), `<a class="btn ghost" href="/catalog" data-link>Смотреть все</a>`)}
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
      <div class="form-actions section"><button class="btn" data-step-prev>Назад</button><button class="btn primary" data-step-next>Далее</button><button class="btn warn" data-live-action="create-checkout">Перейти к оплате</button></div>
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

function payment(id = 12345) {
  const paymentItem = paymentByOrderId(id === "order-id" ? 12345 : id);
  const paymentAddress = window.SECMARKET_DATA.paymentWallets[paymentItem.network] || window.SECMARKET_DATA.paymentWallets.TRC20;
  const qrCells = Array.from({ length: 49 }, (_, i) => [0, 1, 2, 7, 14, 8, 16, 34, 35, 42, 43, 44, 6, 13, 20, 28, 36, 48, 5, 19, 24, 30, 39, 46].includes(i));
  return page("Крипто-оплата заказа", `<div class="two-col">
    <section class="panel"><h2>${paymentItem.amount.toFixed(2)} ${paymentItem.coin} · ${paymentItem.coin} ${paymentItem.network}</h2><p class="muted">Адрес для оплаты</p><div class="list-row"><strong>${paymentAddress}</strong><button class="btn" data-copy-address="${paymentAddress}">${state.copiedAddress ? "Скопировано" : "Копировать"}</button></div><div class="section qr">${qrCells.map((on) => `<span style="opacity:${on ? 1 : 0}"></span>`).join("")}</div><div class="list section">${[
      ["Монета", paymentItem.coin],
      ["Сеть", paymentItem.network],
      ["Точная сумма", `${paymentItem.amount.toFixed(2)} ${paymentItem.coin}`],
      ["Уникальность заказа", "отдельный адрес"],
      ["Окно оплаты", "30 минут"],
    ].map(([left, right]) => row(left, right)).join("")}</div></section>
    <aside class="panel"><h2>Статус</h2>${["Ожидает оплату", "Транзакция найдена", "Ожидает подтверждений", "Оплата подтверждена", "Средства в escrow", "Товар можно выдавать"].map((x, i) => `<div class="list-row"><span>${x}</span><span class="status ${i < 3 ? "ok" : "wait"}">${i < 3 ? "готово" : "ожидание"}</span></div>`).join("")}<p class="muted section">Таймер оплаты: 29:42. Подтверждений: 1 из 3. Если сумма меньше нужной, заказ перейдет в статус “Недостаточная сумма”.</p></aside>
  </div>`, "Payment");
}
