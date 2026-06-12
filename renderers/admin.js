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
  if (path.includes("/audit")) return adminAudit();
  if (path.includes("/moderation")) return adminModeration();
  if (path !== "/admin") return adminTable(adminLinks.find((item) => item[1] === path)?.[0] || "Раздел админки", ["Список записей", "Фильтры", "Ручные действия", "История изменений"]);

  const orders = mixDemoRows("orders", demoOrders, liveItems("orders"));
  const payments = mixDemoRows("payments", demoPayments, liveItems("payments"));
  const tickets = mixDemoRows("tickets", demoTickets, liveItems("tickets"));
  const catalogProducts = mixDemoRows("products", products, liveItems("products"));
  const paymentRows = payments.map((paymentItem) => paymentListRow(paymentItem.order ? paymentItem : normalizeLivePayment(paymentItem)));
  return page("Админ-панель", `<div class="layout"><aside class="sidebar">${sideLinks(adminLinks)}</aside><section><div class="grid metrics">${[
    [orders.length, "заказа в системе"],
    [payments.filter((paymentItem) => ["Оплачено", "paid", "completed"].includes(paymentItem.status)).length, "оплачено"],
    [tickets.filter((ticket) => !["Закрыт", "closed", "resolved"].includes(ticket.status)).length, "активных тикета"],
    [catalogProducts.length, "товаров"],
  ].map(([value, label]) => `<div class="metric panel"><strong>${value}</strong><span>${label}</span></div>`).join("")}</div><div class="grid admin section">${adminLinks.slice(1).map(([label, href]) => `<a class="admin-tile panel" href="${href}" data-link><h3>${label}</h3><p class="muted">Смена статусов, история действий, ручная проверка и модерация.</p></a>`).join("")}</div><section class="section panel"><h2>Последние платежи</h2>${paymentRows.length ? paymentRows.join("") : emptyAdminState("Платежей пока нет")}</section></section></div>`, "Admin");
}

function adminPayments() {
  const livePaymentIds = new Set(liveItems("payments").map((paymentItem) => String(paymentItem.id)));
  const liveRows = liveItems("payments").map((paymentItem) => {
    const normalized = normalizeLivePayment(paymentItem);
    return `<a class="list-row" href="/admin/payments/${normalized.id}" data-link><span>${normalized.amount.toFixed(2)} ${normalized.coin} · ${normalized.network}<br><span class="muted">#${normalized.order} · ${normalized.tx || "tx pending"} · ${normalized.confirmations}</span></span><span class="status ${statusTone(normalized.status)}">${statusLabel(normalized.status)}</span></a>`;
  });
  const demoRows = demoPayments
    .filter((paymentItem) => !livePaymentIds.has(String(paymentItem.id)))
    .map((paymentItem) => `<a class="list-row" href="/admin/payments/${paymentItem.id}" data-link><span>${paymentItem.amount.toFixed(2)} ${paymentItem.coin} · ${paymentItem.network}<br><span class="muted">#${paymentItem.order} · ${paymentItem.tx} · ${paymentItem.confirmations}</span></span><span class="status ${statusTone(paymentItem.status)}">${paymentItem.status}</span></a>`);
  const rows = mixDemoRows("payments", demoRows, liveRows);
  return page("Админка платежей", `<div class="layout"><aside class="sidebar">${sideLinks(adminLinks)}</aside><section class="panel"><div class="section-head"><h2>Платежи заказов</h2><button class="btn primary" data-live-action="sync-payment" data-payment-id="pay-12345">Синхронизировать</button></div><div class="list">${rows.length ? rows.join("") : emptyAdminState("Платежей пока нет")}</div><div class="form-actions section"><button class="btn">Сменить статус</button><button class="btn warn">Открыть заказ</button><button class="btn danger">Пометить ошибку сети</button></div></section></div>`, "Admin");
}

function adminPaymentDetail(id = "pay-12345") {
  const paymentItem = paymentById(id);
  const orderItem = orderById(paymentItem.order);
  const paymentAddress = window.SECMARKET_DATA.paymentWallets[paymentItem.network] || window.SECMARKET_DATA.paymentWallets.TRC20;
  return page(`Платеж ${paymentItem.id}`, `<div class="layout"><aside class="sidebar">${sideLinks(adminLinks)}</aside><section>
    <section class="panel"><div class="section-head"><div><h2>${paymentItem.amount.toFixed(2)} ${paymentItem.coin}</h2><p class="muted">${paymentItem.network} · заказ #${paymentItem.order}</p></div><span class="status ${statusTone(paymentItem.status)}">${statusLabel(paymentItem.status)}</span></div><div class="grid metrics">${[
      [paymentItem.network, "сеть"],
      [paymentItem.confirmations, "подтверждения"],
      [paymentItem.tx, "tx hash"],
      [orderItem.order, "статус заказа"],
    ].map(([value, label]) => `<div class="metric panel"><strong>${value}</strong><span>${label}</span></div>`).join("")}</div></section>
    <section class="panel section"><h2>Ручная проверка</h2><div class="form-grid">${field("Адрес оплаты", "input", paymentAddress)}${field("tx hash", "input", paymentItem.tx)}${field("Подтверждения", "input", paymentItem.confirmations)}${field("Статус", "select", ["Ожидает оплату", "Транзакция найдена", "Оплата подтверждена", "Недостаточная сумма", "Ошибка сети"])}${field("Комментарий админа", "textarea", "Проверить сумму и сеть перед сменой статуса")}</div><div class="form-actions section"><button class="btn primary" data-live-action="sync-payment" data-payment-id="${paymentItem.id}">Сохранить статус</button><a class="btn" href="/orders/${paymentItem.order}" data-link>Связанный заказ</a><button class="btn danger">Пометить ошибку</button></div></section>
    <section class="panel section"><h2>История статусов</h2><div class="list">${["Создан адрес оплаты", "Транзакция найдена мониторингом", `Подтверждения: ${paymentItem.confirmations}`, `Текущий статус: ${statusLabel(paymentItem.status)}`].map(row).join("")}</div></section>
  </section></div>`, "Admin");
}

function adminPayouts() {
  const liveWithdrawalIds = new Set(liveItems("withdrawals").map((withdrawalItem) => String(withdrawalItem.id).toLowerCase()));
  const liveRows = liveItems("withdrawals").map((withdrawalItem) => `<a class="list-row" href="/admin/payouts/${withdrawalItem.id}" data-link><span>#${withdrawalItem.id} · ${withdrawalItem.sellerId}<br><span class="muted">${Number(withdrawalItem.amount || 0).toFixed(2)} ${withdrawalItem.coin || "USDT"} · ${withdrawalItem.network} · ${withdrawalItem.address}</span></span><span class="status ${statusTone(withdrawalItem.status)}">${statusLabel(withdrawalItem.status)}</span></a>`);
  const demoRows = demoWithdrawals
    .filter((withdrawalItem) => !liveWithdrawalIds.has(String(withdrawalItem.id).toLowerCase()))
    .map((withdrawalItem) => `<a class="list-row" href="/admin/payouts/${withdrawalItem.id}" data-link><span>#${withdrawalItem.id} · ${withdrawalItem.seller}<br><span class="muted">${withdrawalItem.amount.toFixed(2)} USDT · ${withdrawalItem.network} · ${withdrawalItem.address}</span></span><span class="status ${statusTone(withdrawalItem.status)}">${withdrawalItem.status}</span></a>`);
  return page("Админка выплат", `<div class="layout"><aside class="sidebar">${sideLinks(adminLinks)}</aside><section>
    <section class="panel"><div class="section-head"><div><h2>Очередь выплат</h2><p class="muted">Ручная проверка адресов, баланса продавца и tx hash после отправки.</p></div><button class="btn primary">Обновить статусы</button></div><div class="list">${mixDemoRows("withdrawals", demoRows, liveRows).join("") || emptyAdminState("Заявок на вывод пока нет")}</div></section>
    <section class="panel section"><h2>Проверки перед выплатой</h2><div class="grid trust">${["Адрес совпадает с профилем", "Баланс доступен без холда", "Нет открытого спора", "2FA продавца подтверждена"].map((item) => `<div class="trust-item panel"><h3>${item}</h3><p class="muted">Админ подтверждает вручную в MVP.</p></div>`).join("")}</div></section>
  </section></div>`, "Admin");
}

function adminPayoutDetail(id = "WD-120") {
  const withdrawalItem = withdrawalById(id);
  return page(`Выплата #${withdrawalItem.id}`, `<div class="layout"><aside class="sidebar">${sideLinks(adminLinks)}</aside><section>
    <section class="panel"><div class="section-head"><div><h2>${withdrawalItem.seller} · ${withdrawalItem.amount.toFixed(2)} USDT</h2><p class="muted">${withdrawalItem.network} · ${withdrawalItem.address}</p></div><span class="status ${statusTone(withdrawalItem.status)}">${statusLabel(withdrawalItem.status)}</span></div><div class="grid metrics">${[
      [withdrawalItem.network, "сеть"],
      [withdrawalItem.tx, "tx hash"],
      [withdrawalItem.risk, "риск"],
      [statusLabel(withdrawalItem.status), "статус"],
    ].map(([value, label]) => `<div class="metric panel"><strong>${value}</strong><span>${label}</span></div>`).join("")}</div></section>
    <section class="panel section"><h2>Ручное подтверждение</h2><div class="form-grid">${field("Адрес кошелька", "input", withdrawalItem.address)}${field("Сеть", "select", ["TRC20", "TON", "BEP20"])}${field("Сумма", "input", `${withdrawalItem.amount.toFixed(2)} USDT`)}${field("tx hash выплаты", "input", withdrawalItem.tx)}${field("Статус", "select", ["На проверке", "В обработке", "Отправлен", "Выполнен", "Отклонен"])}${field("Комментарий", "textarea", "Проверить адрес, холды и открытые споры перед отправкой")}</div><div class="form-actions section"><button class="btn primary" data-live-action="settle-withdrawal" data-withdrawal-id="${withdrawalItem.id}">Подтвердить выплату</button><button class="btn warn">Запросить проверку</button><button class="btn danger">Отклонить</button></div></section>
    <section class="panel section"><h2>История изменения статусов</h2><div class="list">${["Запрос создан продавцом", "Адрес прошел форматную проверку", `Риск: ${withdrawalItem.risk}`, `Текущий статус: ${statusLabel(withdrawalItem.status)}`].map(row).join("")}</div></section>
  </section></div>`, "Admin");
}

function adminTable(title, rows) {
  return page(title, `<div class="layout"><aside class="sidebar">${sideLinks(adminLinks)}</aside><section class="panel"><div class="section-head"><h2>Операции</h2><button class="btn primary">Сохранить изменения</button></div><div class="list">${rows.map(row).join("")}</div><div class="form-actions section"><button class="btn">Сменить статус</button><button class="btn warn">Открыть чат</button><button class="btn danger">Заблокировать средства</button></div></section></div>`, "Admin");
}

function adminUsers() {
  const liveRows = liveItems("profiles").map((profile) => `<div class="list-row"><span>${profile.name || profile.email}<br><span class="muted">${profile.email}${profile.telegram ? ` · ${profile.telegram}` : ""}</span></span><span class="status ${profile.role === "admin" ? "warn" : profile.role === "seller" ? "wait" : "ok"}">${roleName(profile.role)}</span></div>`);
  const demoRows = [
    ["Artem · buyer@example.com", "Покупатель"],
    ["PixelTrade · seller@example.com", "Продавец"],
    ["SupportOne · support@example.com", "Администратор"],
  ].map(([left, role]) => `<div class="list-row"><span>${left}</span><span class="status ok">${role}</span></div>`);
  const rows = mixDemoRows("profiles", demoRows, liveRows);
  return page("Пользователи", `<div class="layout"><aside class="sidebar">${sideLinks(adminLinks)}</aside><section class="panel"><div class="section-head"><h2>Аккаунты</h2><button class="btn">Экспорт</button></div><div class="list">${rows.length ? rows.join("") : emptyAdminState("Пользователей пока нет")}</div><section class="section"><h2>Роли</h2><div class="grid trust">${["Гость", "Покупатель", "Продавец", "Администратор"].map((role) => `<div class="trust-item panel"><h3>${role}</h3><p class="muted">${roleDescription(role)}</p></div>`).join("")}</div></section></section></div>`, "Admin");
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
  const liveProductIds = new Set(liveItems("products").map((product) => String(product.id)));
  const liveRows = liveItems("products").map((product) => `<div class="list-row"><span>${product.title}<br><span class="muted">${product.sellerId || "seller"} · ${product.category || "catalog"}</span></span><span class="status ${statusTone(product.status)}">${statusLabel(product.status)}</span></div>`);
  const demoRows = products
    .filter((product) => !liveProductIds.has(String(product.id)))
    .slice(0, 6)
    .map((product, index) => `<div class="list-row"><span>${product.title}<br><span class="muted">${product.seller} · ${product.cat}</span></span><span class="status ${index % 3 === 0 ? "wait" : "ok"}">${index % 3 === 0 ? "на проверке" : "активен"}</span></div>`);
  const rows = mixDemoRows("products", demoRows, liveRows);
  return page("Товары", `<div class="layout"><aside class="sidebar">${sideLinks(adminLinks)}</aside><section class="panel"><h2>Модерация товаров</h2><div class="list">${rows.length ? rows.join("") : emptyAdminState("Товаров на модерации пока нет")}</div><div class="form-actions section"><button class="btn primary" data-live-action="approve-product" data-product-id="33412">Одобрить</button><button class="btn danger">Снять с публикации</button></div></section></div>`, "Admin");
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

function adminAudit() {
  const auditRows = [
    ["usr-admin", "patch payments pay-12345", "from confirming to paid"],
    ["usr-admin", "patch withdrawals WD-120", "from review to processing"],
    ["usr-admin", "patch disputes 123", "from waiting_support to partial_refund"],
    ["usr-seller", "create products", "status moderation"],
    ["system", "reset system seed", "demo data restored"],
  ];

  return page("Журнал аудита", `<div class="layout"><aside class="sidebar">${sideLinks(adminLinks)}</aside><section>
    <section class="panel"><div class="section-head"><div><h2>Последние действия</h2><p class="muted">API пишет такие события в /api/audit при создании и изменении записей.</p></div><span class="status ok">live-ready</span></div><div class="list">${auditRows.map(([actor, action, details]) => `<div class="list-row"><span>${actor}<br><span class="muted">${details}</span></span><strong>${action}</strong></div>`).join("")}</div></section>
    <section class="panel section"><h2>Что фиксируется</h2><div class="grid trust">${["Кто изменил запись", "Какой ресурс изменен", "ID заказа, платежа или выплаты", "Старый и новый статус", "Время действия"].map((item) => `<div class="trust-item panel"><h3>${item}</h3><p class="muted">Нужно для споров, выплат и ручной модерации.</p></div>`).join("")}</div></section>
  </section></div>`, "Admin");
}

function adminTickets() {
  const liveRows = liveItems("tickets").map((ticket) => ticketListRow({
    id: ticket.id,
    title: ticket.topic || "Обращение",
    order: ticket.orderId || "general",
    status: statusLabel(ticket.status),
  }));
  const rows = mixDemoRows("tickets", demoTickets.map(ticketListRow), liveRows);
  return page("Тикеты поддержки", `<div class="layout"><aside class="sidebar">${sideLinks(adminLinks)}</aside><section class="panel"><h2>Очередь обращений</h2><div class="list">${rows.length ? rows.join("") : emptyAdminState("Тикетов пока нет")}</div><div class="form-actions section"><button class="btn warn">Запросить данные</button><button class="btn primary">Ответить</button></div></section></div>`, "Admin");
}

function roleName(role) {
  const map = {
    admin: "Администратор",
    buyer: "Покупатель",
    seller: "Продавец",
  };
  return map[role] || role || "Гость";
}

function emptyAdminState(text) {
  return `<div class="list-row"><span class="muted">${text}</span><span class="status wait">live</span></div>`;
}

function roleDescription(role) {
  const map = {
    "Гость": "смотрит каталог и товары, затем регистрируется",
    "Покупатель": "покупает товары, общается с продавцами и открывает споры",
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
    <section class="panel section"><h2>Сети MVP</h2><div class="form-grid">${field("USDT TRC20 адрес", "input", window.SECMARKET_DATA.paymentWallets.TRC20)}${field("USDT TON адрес", "input", window.SECMARKET_DATA.paymentWallets.TON)}${field("USDT BEP20 адрес", "input", window.SECMARKET_DATA.paymentWallets.BEP20)}${field("Генерация", "select", ["Отдельный адрес", "Уникальная сумма"])}${field("Таймер оплаты", "input", "30 минут")}${field("Недостаточная сумма", "select", ["Открыть тикет", "Ждать доплату", "Ручная проверка"])}</div></section>
    <section class="panel section"><h2>Мониторинг</h2><div class="list">${[
      ["Последний найденный tx", "2 мин назад"],
      ["Ошибки сети", "0"],
      ["Просроченные платежи", "4"],
      ["Недостаточная сумма", "1"],
    ].map(([left, right]) => row(left, right)).join("")}</div></section>
  </section></div>`, "Admin");
}
