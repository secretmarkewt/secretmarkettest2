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
  const liveProductIds = new Set(liveItems("products").map((product) => String(product.id)));
  const liveRows = liveItems("products").map((product) => `<a class="list-row" href="/seller/products/${product.id}/edit" data-link><span>${product.title}<br><span class="muted">${product.category || product.cat || "catalog"} · ${product.stock ?? 0} шт. · ${money(Number(product.price || 0))}</span></span><span class="status ${statusTone(product.status)}">${statusLabel(product.status)}</span></a>`);
  const demoRows = products
    .filter((product) => !liveProductIds.has(String(product.id)))
    .slice(0, 5)
    .map((product, index) => `<a class="list-row" href="/seller/products/${product.id}/edit" data-link><span>${product.title}<br><span class="muted">${product.cat} · ${product.stock} шт. · ${money(product.price)}</span></span><span class="status ${index === 2 ? "wait" : "ok"}">${index === 2 ? "на модерации" : "опубликован"}</span></a>`);
  return page("Мои товары", `<div class="layout"><aside class="sidebar">${sideLinks(sellerLinks)}</aside><section class="panel"><div class="section-head"><h2>Активные товары</h2><a class="btn primary" href="/seller/products/create" data-link>Создать товар</a></div><div class="list">${[...liveRows, ...demoRows].join("")}</div></section></div>`, "Seller");
}

function sellerOrders() {
  const liveOrderIds = new Set(liveItems("orders").map((orderItem) => String(orderItem.id)));
  const liveRows = liveItems("orders").map((orderItem) => orderListRow(normalizeLiveOrder(orderItem)));
  const demoRows = demoOrders.filter((orderItem) => !liveOrderIds.has(String(orderItem.id))).map((orderItem) => orderListRow(orderItem));
  return page("Заказы продавца", `<div class="layout"><aside class="sidebar">${sideLinks(sellerLinks)}</aside><section class="panel"><h2>Очередь выполнения</h2><div class="list">${[...liveRows, ...demoRows].join("")}</div></section></div>`, "Seller");
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
    <div class="form-actions section"><button class="btn">Сохранить черновик</button><button class="btn warn">Отправить на модерацию</button><button class="btn primary" data-live-action="create-product">${mode === "edit" ? "Сохранить правки" : "Опубликовать"}</button></div>
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
    <section class="panel section"><h2>История выплат</h2><div class="list">${[...liveRows, ...demoRows].join("")}</div></section>
  </section></div>`, "Seller");
}
