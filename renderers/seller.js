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
  return sellerOverview();
}

function sellerOverview() {
  const orders = mixDemoRows("orders", demoOrders.slice(0, 4), liveItems("orders").slice(0, 4).map((orderItem) => normalizeLiveOrder(orderItem)));
  return page("Кабинет продавца", `<div class="layout"><aside class="sidebar">${sideLinks(sellerLinks)}</aside><section>
    <div class="section-head"><div><p class="eyebrow">Магазин</p><h1>PixelTrade</h1><p class="lead">Рабочий стол продавца: товары, заказы, остатки, рейтинг и выплаты.</p></div><a class="btn primary" href="/seller/products/create" data-link>Создать товар</a></div>
    <div class="grid metrics seller-overview">${[
      ["14", "продаж сегодня"],
      ["390", "продаж за месяц"],
      ["8", "активных заказов"],
      ["4.98", "рейтинг"],
      ["1 240 USDT", "доступно к выплате"],
      ["480 USDT", "в гарантийном холде"],
      ["1", "открытый спор"],
      ["5 мин", "средняя выдача"],
    ].map(([value, label]) => `<div class="metric panel"><strong>${value}</strong><span>${label}</span></div>`).join("")}</div>
    <section class="panel section"><div class="section-head"><h2>Очередь заказов</h2><a class="btn" href="/seller/orders" data-link>Все заказы</a></div><div class="list">${orders.length ? orders.map(orderListRow).join("") : emptySellerState("Заказов пока нет")}</div></section>
    <section class="panel section"><div class="section-head"><h2>Быстрые действия</h2></div><div class="seller-actions">${[
      ["Добавить товар", "/seller/products/create"],
      ["Проверить остатки", "/seller/products"],
      ["Открыть финансы", "/seller/finance"],
      ["Настроить автовыдачу", "/seller/settings"],
    ].map(([label, href]) => `<a class="btn" href="${href}" data-link>${label}</a>`).join("")}</div></section>
  </section></div>`, "Seller");
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
  const liveProductIds = new Set(liveItems("products").map((product) => String(product.id)));
  const liveRows = liveItems("products").map((product) => `<a class="list-row" href="/seller/products/${product.id}/edit" data-link><span>${product.title}<br><span class="muted">${product.category || product.cat || "catalog"} · ${product.stock ?? 0} шт. · ${money(Number(product.price || 0))}</span></span><span class="status ${statusTone(product.status)}">${statusLabel(product.status)}</span></a>`);
  const demoRows = products
    .filter((product) => !liveProductIds.has(String(product.id)))
    .slice(0, 5)
    .map((product, index) => `<a class="list-row" href="/seller/products/${product.id}/edit" data-link><span>${product.title}<br><span class="muted">${product.cat} · ${product.stock} шт. · ${money(product.price)}</span></span><span class="status ${index === 2 ? "wait" : "ok"}">${index === 2 ? "на модерации" : "опубликован"}</span></a>`);
  const rows = mixDemoRows("products", demoRows, liveRows);
  return page("Мои товары", `<div class="layout"><aside class="sidebar">${sideLinks(sellerLinks)}</aside><section class="panel"><div class="section-head"><h2>Активные товары</h2><a class="btn primary" href="/seller/products/create" data-link>Создать товар</a></div><div class="list">${rows.length ? rows.join("") : emptySellerState("Товаров пока нет")}</div></section></div>`, "Seller");
}

function sellerOrders() {
  const liveOrderIds = new Set(liveItems("orders").map((orderItem) => String(orderItem.id)));
  const liveRows = liveItems("orders").map((orderItem) => orderListRow(normalizeLiveOrder(orderItem)));
  const demoRows = demoOrders.filter((orderItem) => !liveOrderIds.has(String(orderItem.id))).map((orderItem) => orderListRow(orderItem));
  const rows = mixDemoRows("orders", demoRows, liveRows);
  return page("Заказы продавца", `<div class="layout"><aside class="sidebar">${sideLinks(sellerLinks)}</aside><section class="panel"><h2>Очередь выполнения</h2><div class="list">${rows.length ? rows.join("") : emptySellerState("Заказов пока нет")}</div></section></div>`, "Seller");
}

function publicSeller() {
  return page("Продавец PixelTrade", `<div class="two-col seller-storefront"><section>
    <div class="panel"><div class="section-head"><div><h2>PixelTrade</h2><p class="muted">Проверенный продавец Roblox и игровых пополнений.</p></div><span class="status ok">верифицирован</span></div><div class="grid metrics">${[
      ["4.98", "рейтинг"],
      ["12 840", "продаж"],
      ["5 мин", "средняя выдача"],
      ["0.6%", "споров"],
    ].map(([value, label]) => `<div class="metric panel"><strong>${value}</strong><span>${label}</span></div>`).join("")}</div></div>
    <section class="section"><div class="section-head"><h2>Товары продавца</h2></div>${productCards(products.slice(0, 4))}</section>
  </section><aside class="panel seller-sidebar"><h2>Отзывы</h2><div class="list">${["Быстрая автовыдача", "Отвечает в чате", "Коды рабочие", "Возвратов почти нет"].map((x) => row(x, "5★")).join("")}</div><a class="btn primary section" href="/chats" data-link>Написать продавцу</a></aside></div>`, "Seller");
}

function createProduct(mode = "create", id = 12345) {
  const p = mode === "edit" ? productById(id) : productById(12345);
  const title = mode === "edit" ? `Редактирование товара #${p.id}` : "Создание товара";
  const modeLabel = mode === "edit" ? "на модерации после правок" : "новый товар";
  return page(title, `<div class="layout"><aside class="sidebar">${sideLinks(sellerLinks)}</aside><section>
    <form class="publish-workspace" data-product-form>
      <section class="panel publish-main">
        <div class="section-head publish-head">
          <div><p class="eyebrow">Публикация</p><h2>${mode === "edit" ? "Карточка товара" : "Новый товар"}</h2><p class="muted">Заполните только то, что покупатель должен увидеть до оплаты.</p></div>
          <span class="status ${mode === "edit" ? "wait" : "ok"}">${modeLabel}</span>
        </div>
        <div class="publish-grid">
          ${productInput("title", "Название", p.title)}
          ${productInput("price", "Цена, USDT", p.price.toFixed(2), "number")}
          ${productInput("stock", "Остаток", String(p.stock), "number")}
          ${productSelect("category", "Категория", categories.map((c) => c[0]), p.cat)}
          ${productSelect("deliveryType", "Выдача", [["auto", "Автовыдача"], ["manual", "Через чат"]], "auto")}
          ${productInput("deliveryTime", "Срок", "5 минут")}
        </div>
        <details class="publish-more section">
          <summary>Дополнительно</summary>
          <div class="publish-grid section">
            ${productInput("subcategory", "Подкатегория", p.cat === "Roblox" ? "Robux" : p.cat)}
            ${productInput("platform", "Платформа", p.cat)}
            ${productSelect("region", "Регион", ["EU", "US", "CIS", "Любой"], "Любой")}
            ${productInput("warranty", "Гарантия", "24 часа")}
            ${productInput("image", "Изображение", "")}
            ${productSelect("status", "Статус", [["draft", "Черновик"], ["moderation", "На модерации"], ["published", "Опубликован"]], "moderation")}
          </div>
        </details>
        <section class="publish-delivery section">
          <h2>Описание и выдача</h2>
          <div class="publish-stack">
            ${productTextarea("description", "Короткое описание", "Что получает покупатель")}
            ${productTextarea("instructions", "Инструкция после оплаты", "Как активировать товар")}
            ${productTextarea("deliverySecrets", "Коды для автовыдачи", "Один код, ключ или аккаунт на строку")}
          </div>
        </section>
        <div class="form-actions publish-actions section">
          <button class="btn primary" type="button" data-live-action="create-product">${mode === "edit" ? "Сохранить" : "Опубликовать"}</button>
        </div>
      </section>
      <aside class="publish-side">
        <section class="panel publish-preview">
          <div class="section-head"><h2>Предпросмотр</h2><a class="btn ghost" href="/product/${p.id}" data-link>Открыть</a></div>
          ${productCards([p])}
        </section>
        <section class="panel section publish-checklist">
          <h2>Перед публикацией</h2>
          <div class="list">${[
            ["Название", "понятно без лишних слов"],
            ["Цена", `${p.price.toFixed(2)} USDT`],
            ["Выдача", "код или чат после оплаты"],
            ["Остаток", `${p.stock} шт.`],
          ].map(([left, right]) => row(left, right)).join("")}</div>
        </section>
      </aside>
    </form>
  </section></div>`, "Seller");
}

function productInput(name, label, value, type = "text") {
  return `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${value}" /></label>`;
}

function productTextarea(name, label, value) {
  return `<label class="field"><span>${label}</span><textarea name="${name}">${value}</textarea></label>`;
}

function productSelect(name, label, options, selected) {
  return `<label class="field"><span>${label}</span><select name="${name}">${options.map((item) => {
    const value = Array.isArray(item) ? item[0] : item;
    const text = Array.isArray(item) ? item[1] : item;
    return `<option value="${value}" ${String(value) === String(selected) || String(text) === String(selected) ? "selected" : ""}>${text}</option>`;
  }).join("")}</select></label>`;
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
  const liveWithdrawalIds = new Set(liveItems("withdrawals").map((withdrawalItem) => String(withdrawalItem.id).toLowerCase()));
  const liveRows = liveItems("withdrawals").map((withdrawalItem) => `<a class="list-row" href="/admin/payouts/${withdrawalItem.id}" data-link><span>#${withdrawalItem.id} · ${Number(withdrawalItem.amount || 0).toFixed(2)} ${withdrawalItem.coin || "USDT"}<br><span class="muted">${withdrawalItem.network} · ${withdrawalItem.address}</span></span><span class="status ${statusTone(withdrawalItem.status)}">${statusLabel(withdrawalItem.status)}</span></a>`);
  const demoRows = [
    ["#WD-120 · 500 USDT · TRC20", "На проверке", "WD-120"],
    ["#WD-108 · 300 USDT · TON", "Выполнен", "WD-108"],
    ["#WD-099 · 150 USDT · BEP20", "Отклонен", "WD-099"],
  ].filter(([, , id]) => !liveWithdrawalIds.has(id.toLowerCase()))
    .map(([left, status]) => `<div class="list-row"><span>${left}</span><span class="status ${status === "Выполнен" ? "ok" : status === "Отклонен" ? "bad" : "wait"}">${status}</span></div>`);
  return page("Вывод средств", `<div class="layout"><aside class="sidebar">${sideLinks(sellerLinks)}</aside><section>
    <section class="panel"><h2>Новый вывод</h2><div class="form-grid">${field("Валюта", "select", ["USDT"])}${field("Сеть", "select", ["TRC20", "TON", "BEP20"])}${field("Адрес кошелька", "input", "T...")}${field("Сумма", "input", "500")}${field("Комиссия сети", "input", "1 USDT")}${field("Итого к получению", "input", "499 USDT")}</div><div class="form-actions section"><button class="btn primary" data-live-action="request-withdrawal">Запросить вывод</button><span class="status wait">MVP: ручное подтверждение админом</span></div></section>
    <section class="panel section"><h2>История выплат</h2><div class="list">${mixDemoRows("withdrawals", demoRows, liveRows).join("") || emptySellerState("Выплат пока нет")}</div></section>
  </section></div>`, "Seller");
}

function emptySellerState(text) {
  return `<div class="list-row"><span class="muted">${text}</span><span class="status wait">live</span></div>`;
}
