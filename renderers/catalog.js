function categoryCards() {
  return `<div class="grid categories">${categories.map(([name, desc, icon]) => `
    <a class="category-card" href="/catalog/${slug(name)}" data-link>
      ${categoryVisual(name, icon)}
      <strong>${name}</strong>
      <span class="muted">${desc}</span>
    </a>`).join("")}</div>`;
}

const categoryImages = {
  "Аккаунты": "assets/categories/accounts.png",
  "Ключи": "assets/categories/keys.png",
  "Игровая валюта": "assets/categories/game-currency.png",
  "Подписки": "assets/categories/subscriptions.png",
  "Софт": "assets/categories/software.png",
  "Услуги": "assets/categories/services.png",
};

function categoryVisual(title, fallback) {
  const image = categoryImages[title];
  if (!image) return `<span class="category-icon">${fallback}</span>`;
  return `<span class="category-image"><img src="${assetPath(image)}" alt="" loading="lazy" /></span>`;
}

function productSketch(mark, label = "") {
  const key = String(mark || label || "SM").slice(0, 2).toLowerCase();
  const cleanLabel = escapeHtml(label || mark || "Товар");
  return `<span class="product-sketch product-sketch-${key}" aria-label="${cleanLabel}">
    <span class="sketch-shadow"></span>
    <span class="sketch-base"></span>
    <span class="sketch-accent"></span>
    <span class="sketch-prop"></span>
    <span class="sketch-mark"></span>
    <span class="sketch-spark"></span>
    <span class="sketch-shine"></span>
  </span>`;
}

function productCards(list = products) {
  if (!list.length) {
    return `<div class="empty-state"><strong>Товары не найдены</strong><span>Попробуйте снять фильтры или изменить поисковый запрос.</span><button class="btn" data-reset-filters>Сбросить фильтры</button></div>`;
  }

  return `<div class="grid products">${list.map((p) => `
    <article class="product-card" style="--thumb-a:${p.colors[0]};--thumb-b:${p.colors[1]}">
      <button class="favorite-btn ${state.favorites.has(p.id) ? "active" : ""}" data-favorite="${p.id}" title="В избранное" aria-label="В избранное">${uiIcon("star")}</button>
      <a class="product-link" href="/product/${p.id}" data-link>
        <div class="product-thumb">${productSketch(p.mark, p.title)}</div>
        <div class="product-body">
          <span class="badge">${p.type}</span>
          <strong>${p.title}</strong>
          <span class="product-seller">${p.seller} <span>★ ${p.rating}</span></span>
          <span class="meta">${p.sales} продаж · ${p.stock} шт.</span>
          <span class="price">${money(p.price)}</span>
        </div>
      </a>
      <a class="btn primary product-buy" href="/checkout?product=${encodeURIComponent(p.id)}" data-link>Купить</a>
    </article>`).join("")}</div>`;
}

const homeCategories = [
  ["Аккаунты", "Игровые и сервисные аккаунты"],
  ["Ключи", "Steam, Xbox, PlayStation"],
  ["Игровая валюта", "Robux, VP, UC, донат"],
  ["Подписки", "Telegram, Discord, Spotify"],
  ["Софт", "Лицензии, утилиты, VPN"],
  ["Услуги", "Буст, настройка, помощь"],
];

const homeRecommendedProducts = [
  ["RB", "Roblox 10 000 Robux", "PixelTrade", "Автовыдача", "84.90", "4.98", "8 420", ["#173d2b", "#1fd86f"]],
  ["ST", "Steam Gift Card 50$", "KeyDock", "Автовыдача", "50.00", "4.95", "6 104", ["#18253b", "#2c9df5"]],
  ["TG", "Telegram Premium 12 месяцев", "SubLine", "Ручная", "31.50", "4.88", "902", ["#16334a", "#4cc9ff"]],
  ["MC", "Minecraft Java аккаунт", "GameVault", "Автовыдача", "12.80", "4.92", "1 840", ["#1b3d25", "#78d95d"]],
  ["VP", "Valorant VP EU", "AimShop", "Ручная", "22.40", "4.96", "1 120", ["#47202d", "#ff5f73"]],
  ["DN", "Discord Nitro 1 месяц", "NitroHub", "Автовыдача", "7.20", "4.91", "3 240", ["#272a68", "#7b85ff"]],
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
    ["500+", "успешных сделок"],
    ["3 сети", "для оплаты"],
    ["4.91", "средний рейтинг"],
    ["15 мин", "типовая выдача"],
  ].map(([value, label]) => `<article class="home-stat"><strong>${value}</strong><span>${label}</span></article>`).join("")}</section>`;
}

function compactNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return "0";
  if (number >= 1000) return `${Math.round(number / 100) / 10}k`;
  return String(Math.round(number));
}

function homePulseItems() {
  const metrics = state.liveHealth?.metrics || {};
  const liveOnline = Number(metrics.onlineUsers ?? metrics.activeSessions);
  const liveProducts = liveItems("products");
  const newProducts = productionDataMode() && liveProducts.length
    ? liveProducts.filter((product) => {
      const createdAt = product.createdAt ? new Date(product.createdAt).getTime() : 0;
      return createdAt && Date.now() - createdAt <= 24 * 60 * 60 * 1000;
    }).length
    : 12;
  return [
    `Онлайн ${productionDataMode() && liveOnline > 0 ? compactNumber(liveOnline) : "24"}`,
    `Новые товары ${productionDataMode() ? compactNumber(newProducts) : "12"}`,
    "Средняя выдача 7 мин",
  ];
}

function trustBar() {
  return `<section class="trust-bar">${[
    ["Гарантия"],
    ["Автовыдача"],
    ["Доверие"],
    ["USDT"],
  ].map(([title]) => `<article><span aria-hidden="true">✓</span><strong>${title}</strong></article>`).join("")}</section>`;
}

function homeCategoryGrid() {
  return `<div class="home-categories">${homeCategories.map(([title, description]) => `
    <a class="home-category-card" href="/catalog/${slug(title)}" data-link>
      ${categoryVisual(title, title.slice(0, 2).toUpperCase())}<strong>${title}</strong><small>${description}</small>
    </a>`).join("")}</div>`;
}

function quickPicks() {
  return `<div class="quick-picks">${[
    ["Roblox", "Robux, аккаунты, донат", "/catalog/roblox"],
    ["Steam", "Ключи, гифт-карты, кошелёк", "/catalog/steam"],
    ["Подписки без лишнего", "Telegram, Discord, Spotify", "/catalog/telegram"],
  ].map(([title, text, href]) => `<a class="quick-pick" href="${href}" data-link><strong>${title}</strong><span>${text}</span></a>`).join("")}</div>`;
}

function homeProductGrid(list) {
  return `<div class="home-product-grid">${list.map(([mark, title, seller, delivery, price, rating, sales, colors], index) => `
    <article class="home-product-card" style="--thumb-a:${colors[0]};--thumb-b:${colors[1]}">
      <a class="home-product-thumb" href="/product/${products[index % products.length].id}" data-link>${productSketch(mark, title)}</a>
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
  return `<section class="market-intro" data-cursor-glow>
    <div class="market-radar" aria-hidden="true">
      <span></span><span></span><span></span>
    </div>
    <div class="market-intro-copy">
      <p class="eyebrow hero-badge">${uiIcon("info")} Безопасный маркетплейс цифровых товаров</p>
      <div class="hero-kicker"><span>SM-01</span><span>protected checkout</span><span>digital goods</span></div>
      <h1>Цифровые товары <span>под защитой сделки</span></h1>
      <p class="lead">Выбирай продавца по рейтингу, оплачивай USDT и держи заказ, чат и спор в одной безопасной сделке.</p>
      <div class="market-pulse">${homePulseItems().map((item) => `<span>${item}</span>`).join("")}</div>
      <div class="hero-actions">
        <a class="btn primary" href="/catalog" data-link>Открыть каталог</a>
        <a class="btn ghost" href="/seller/products/create" data-link>Разместить товар</a>
      </div>
      <form class="market-search" data-search-form>
        <span>${uiIcon("search")}</span>
        <input name="query" value="${state.query}" placeholder="Найти Robux, Steam key, Telegram Premium..." />
        <button class="btn primary">Найти</button>
      </form>
      <div class="hero-tags">${["Robux", "Steam", "Minecraft", "VPN", "Windows 11", "Telegram Premium"].map((tag) => `<a href="/catalog?query=${encodeURIComponent(tag)}" data-link>${tag}</a>`).join("")}</div>
    </div>
    <div class="market-tools">
      <aside class="market-mascot" aria-label="Secret Market assistant">
        <div class="mascot-glow"></div>
        <img src="${assetPath("assets/hero-mascot.png")}" alt="Secret Market" />
        <div class="mascot-card mascot-card-top"><strong>4.91</strong><span>средний рейтинг</span></div>
        <div class="mascot-card mascot-card-bottom"><strong>500+</strong><span>сделок закрыто</span></div>
      </aside>
      <div class="market-command-card">
        <span>live desk</span>
        <strong>escrow / chat / payout</strong>
        <small>заказы, тикеты и баланс в одном контуре</small>
      </div>
    </div>
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
    ${homeStats()}
    ${trustBar()}
    ${quickPicks()}
    ${homeSection("Популярные категории", homeCategoryGrid(), `<a class="btn ghost" href="/catalog" data-link>Все категории</a>`)}
    ${paymentBlock()}
    ${homeSection("Рекомендованные товары", homeProductGrid(homeRecommendedProducts), `<a class="btn ghost" href="/catalog" data-link>Смотреть все</a>`)}
    ${homeSection("Продавцы в онлайне", homeSellerGrid(), `<a class="btn ghost" href="/catalog" data-link>Все продавцы</a>`)}
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
      <aside class="sidebar catalog-sidebar">
        <h3>Категории</h3>
        ${["Все товары", ...homeCategories.map((item) => item[0])].map((x) => `<a class="side-link ${pretty(category) === x || (!category && x === "Все товары") ? "active" : ""}" href="${x === "Все товары" ? "/catalog" : `/catalog/${slug(x)}`}" data-link>${x}<span>${uiIcon("chevron")}</span></a>`).join("")}
        <section class="section"><h3>Игры и сервисы</h3>${Object.keys(categoryPages).map((key) => `<a class="side-link ${category === key ? "active" : ""}" href="/catalog/${key}" data-link>${categoryPages[key].title}<span>${uiIcon("chevron")}</span></a>`).join("")}</section>
      </aside>
      <section class="catalog-content">
        <div class="catalog-head panel">
          <div>
            <p class="eyebrow">Каталог</p>
            <h1>${title}</h1>
            <p class="lead">${categoryInfo ? categoryInfo.description : "Аккаунты, ключи, игровая валюта, подписки, софт и услуги от проверенных продавцов."}</p>
          </div>
          <div class="catalog-summary">
            <strong>${list.length}</strong>
            <span>товаров найдено</span>
          </div>
        </div>
        ${subs.length ? `<div class="chips catalog-chips">${subs.map((name) => `<a class="chip" href="/catalog/${category}" data-link>${name}</a>`).join("")}</div>` : ""}
        <details class="panel filters-panel" ${isCompactViewport() ? "" : "open"}>
          <summary>Фильтры и сортировка</summary>
          <div class="filter-grid">
            <label class="field"><span>Цена до, USDT</span><input type="number" min="1" step="1" value="${state.maxPrice}" data-filter="maxPrice" /></label>
            <label class="field"><span>Выдача</span><select data-filter="delivery">${option("all", "Любая", state.delivery)}${option("автовыдача", "Автоматическая", state.delivery)}${option("ручная", "Ручная", state.delivery)}</select></label>
            <label class="field"><span>Рейтинг</span><select data-filter="rating">${option("4.8", "4.8+", state.rating)}${option("4.5", "4.5+", state.rating)}${option("any", "Любой", state.rating)}</select></label>
            <label class="field"><span>Валюта</span><select data-currency-select>${option("USDT", "USDT", currency)}${option("USD", "USD", currency)}</select></label>
          </div>
          <div class="tabs section">
            ${sortTab("popular", "Популярные")}${sortTab("cheap", "Дешевые")}${sortTab("expensive", "Дорогие")}${sortTab("new", "Новые")}${sortTab("rating", "По рейтингу")}
          </div>
        </details>
        <section class="section">${productCards(list)}</section>
        <section class="section panel catalog-info"><h2>FAQ по категории</h2><div class="list">${[
          ...(categoryInfo?.faq || []),
          "Проверяйте сеть оплаты, тип выдачи, регион и условия получения перед оформлением заказа.",
          "Если товар не получен или не работает, обращайтесь в поддержку со страницы заказа.",
        ].map(row).join("")}</div><p class="muted section">SEO: товары ${category ? pretty(category) : "цифрового каталога"} продаются с ценой в USDT, рейтингом продавца, количеством продаж и прозрачным статусом выдачи.</p></section>
        ${categoryInfo ? `<section class="section panel"><h2>SEO-описание</h2><p class="muted">${categoryInfo.seo}</p></section>` : ""}
      </section>
    </div>${footer()}</main>`;
}

function product(id = 12345) {
  const p = productById(id);
  return `${header()}<main class="main">
    <div class="product-detail">
      <section class="product-main panel">
        <div class="detail-media" style="--thumb-a:${p.colors[0]};--thumb-b:${p.colors[1]}">${productSketch(p.mark, p.title)}</div>
        <div class="product-main-copy">
          <span class="badge">${p.cat} · ${p.type}</span>
          <h1>${p.title}</h1>
          <p class="lead">Проверенный цифровой товар с историей продаж, рейтингом продавца и поддержкой доверия внутри заказа.</p>
          <div class="grid metrics product-metrics">
            <div class="metric"><strong>${p.stock}</strong><span>в наличии</span></div>
            <div class="metric"><strong>5 мин</strong><span>типовая выдача</span></div>
            <div class="metric"><strong>${p.rating}</strong><span>рейтинг</span></div>
            <div class="metric"><strong>${p.sales}</strong><span>продаж</span></div>
          </div>
        </div>
      </section>
      <aside class="buy-box panel">
        <span class="muted">Цена</span>
        <strong class="buy-price">${money(p.price)}</strong>
        <span class="muted">≈ $${p.usd.toFixed(2)}</span>
        <a class="btn primary" href="/checkout?product=${encodeURIComponent(p.id)}" data-link>Купить</a>
        <a class="btn" href="/chats" data-link>Написать продавцу</a>
        <div class="seller-mini">
          <div class="seller-avatar">${p.seller.slice(0, 2).toUpperCase()}</div>
          <div>
            <strong>${p.seller}</strong>
            <span>★ ${p.rating} · ${p.sales} продаж</span>
          </div>
        </div>
        <div class="list">
          ${["Гарантия сделки", "Доверие по заказу", "Чат с продавцом", "Безопасная выдача"].map(row).join("")}
        </div>
      </aside>
    </div>
    <section class="product-info-grid section">
      <article class="panel"><h2>Описание</h2><p class="muted">Покупатель получает код, аккаунт или инструкцию после подтверждения оплаты. Для ручных заказов открывается чат с продавцом, все действия остаются в истории заказа.</p></article>
      <article class="panel"><h2>Условия получения</h2><div class="list">${["Проверьте регион и тип товара до оплаты", "Автовыдача доступна после подтверждения заказа", "Покупатель подтверждает получение", "Спор доступен со страницы заказа"].map(row).join("")}</div></article>
    </section>
    <section class="section"><div class="section-head"><h2>Отзывы</h2></div><div class="grid sellers">${[
      ["Быстрая выдача, код подошел", "5.0"],
      ["Продавец ответил в чате за пару минут", "4.9"],
      ["Оплатил TRC20, подтверждение пришло быстро", "5.0"],
      ["Все ок, заказ завершил сразу", "4.8"],
    ].map(([text, rating]) => `<div class="seller-card"><strong>★ ${rating}</strong><span>${text}</span><span class="muted">проверенный заказ</span></div>`).join("")}</div></section>
    <section class="section"><div class="section-head"><h2>Похожие товары</h2></div>${productCards(catalogProducts().filter((item) => String(item.id) !== String(p.id)).slice(0, 4))}</section>${footer()}</main>`;
}

function checkout() {
  const p = checkoutProduct();
  const commission = checkoutCommission(p);
  const steps = ["Товар", "Данные", "Оплата", "Подтверждение"];
  return page("Оформление заказа", `<div class="checkout-layout">
    <section class="panel checkout-panel">
      <div class="checkout-steps">${steps.map((x, i) => `<button class="step ${i + 1 === activeStep ? "active" : ""}" data-step="${i + 1}">${i + 1}. ${x}</button>`).join("")}</div>
      ${checkoutStepBody()}
      <div class="form-actions section"><button class="btn" data-step-prev>Назад</button><button class="btn primary" data-step-next>Далее</button><button class="btn warn" data-live-action="create-checkout">Перейти к оплате</button></div>
    </section>
    <aside class="panel order-summary">
      <h2>Ваш заказ</h2>
      <div class="summary-product">${productSketch(p.mark, p.title)}<div><strong>${p.title}</strong><small>${p.seller} · ${p.rating}</small></div></div>
      <div class="list">${[
        ["Цена товара", money(commission.itemAmount)],
        ["Сервисный сбор покупателя 2%", money(commission.buyerFee)],
        ["Итого к оплате", money(commission.buyerTotal)],
      ].map(([left, right]) => row(left, right)).join("")}</div>
      <p class="muted section">Платёж закрепляется за заказом. Продавцу после завершения начисляется ${money(commission.sellerNet)} с учётом комиссии продавца 4%.</p>
    </aside>
  </div>`, "Checkout");
}

function checkoutStepBody() {
  const p = checkoutProduct();
  const commission = checkoutCommission(p);
  if (activeStep === 1) {
    return `<div class="list">${[
      ["Товар", p.title],
      ["Продавец", `${p.seller} · ${p.rating}`],
      ["Цена товара", money(commission.itemAmount)],
      ["Сервисный сбор покупателя 2%", money(commission.buyerFee)],
      ["Итого к оплате", money(commission.buyerTotal)],
      ["Продавец получит", money(commission.sellerNet)],
    ].map(([left, right]) => row(left, right)).join("")}</div>`;
  }
  if (activeStep === 2) {
    return `<div class="form-grid">${field("Никнейм", "input", "Artem")}${field("Email", "input", "buyer@example.com")}${field("Telegram", "input", "@buyer")}${field("ID аккаунта", "input", "123456789")}${field("Комментарий", "textarea", "Нужна выдача на EU регион")}</div>`;
  }
  if (activeStep === 3) {
    return `<div class="payment-methods">${["USDT TRC20", "USDT TON", "USDT BEP20"].map((network, index) => `<button class="trust-item panel ${index === 0 ? "chip active" : ""}" data-network="${network}"><h3>${network}</h3><p class="muted">${index === 0 ? "Рекомендуемый способ" : "Доступно для заказа"}</p></button>`).join("")}</div>`;
  }
  return `<div class="checkout-confirm"><h2>Подтверждение</h2><p class="lead">Проверьте товар, данные аккаунта и выбранный способ оплаты. К оплате будет выставлено ${money(commission.buyerTotal)}.</p><div class="list">${["Заказ создаётся с отдельным платёжным реквизитом", "Средства удерживаются до подтверждения получения", "Товар выдаётся автоматически или через чат", "Проверка доступна со страницы заказа"].map(row).join("")}</div></div>`;
}

function payment(id = 12345) {
  const paymentItem = paymentByOrderId(id === "order-id" ? 12345 : id);
  const paymentAddress = window.SECMARKET_DATA.paymentWallets[paymentItem.network] || window.SECMARKET_DATA.paymentWallets.TRC20;
  const qrCells = Array.from({ length: 49 }, (_, i) => [0, 1, 2, 7, 14, 8, 16, 34, 35, 42, 43, 44, 6, 13, 20, 28, 36, 48, 5, 19, 24, 30, 39, 46].includes(i));
  return page("Оплата заказа", `<div class="payment-layout">
    <section class="panel payment-panel"><div class="section-head"><div><p class="eyebrow">Оплата заказа</p><h2>${paymentItem.amount.toFixed(2)} ${paymentItem.coin}</h2><p class="muted">${paymentItem.network} · заказ #${paymentItem.order}</p></div><span class="status wait">ожидает</span></div><p class="muted">Скопируйте реквизит и отправьте точную сумму. После подтверждения заказ автоматически перейдёт к выдаче.</p><div class="payment-address"><strong>${paymentAddress}</strong><button class="btn" data-copy-address="${paymentAddress}">${state.copiedAddress ? "Скопировано" : "Копировать"}</button></div><div class="payment-body"><div class="qr">${qrCells.map((on) => `<span style="opacity:${on ? 1 : 0}"></span>`).join("")}</div><div class="list">${[
      ["Монета", paymentItem.coin],
      ["Сеть", paymentItem.network],
      ["Точная сумма", `${paymentItem.amount.toFixed(2)} ${paymentItem.coin}`],
      ["Реквизит", "закреплён за заказом"],
      ["Окно оплаты", "30 минут"],
    ].map(([left, right]) => row(left, right)).join("")}</div></div></section>
    <aside class="panel payment-status"><h2>Статус заказа</h2>${["Ожидает оплату", "Платёж найден", "Подтверждается", "Готов к выдаче"].map((x, i) => `<div class="list-row"><span>${x}</span><span class="status ${i < 2 ? "ok" : "wait"}">${i < 2 ? "готово" : "ожидание"}</span></div>`).join("")}<p class="muted section">Если сумма или сеть отличаются, заказ попадёт на ручную проверку поддержки.</p><a class="btn" href="/orders/${paymentItem.order}" data-link>Открыть заказ</a></aside>
  </div>`, "Payment");
}
