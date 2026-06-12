function order(id = 12345) {
  const orderItem = orderById(id);
  const paymentItem = paymentByOrderId(orderItem.id);
  const deliveryItem = deliveryByOrderId(orderItem.id);
  const deliverySecret = deliveryItem?.secret || (orderItem.delivery === "Автовыдача" ? "AUTO-DELIVERY-CODE-SEC-9K2" : "Ручная выдача через чат заказа");
  const issueButton = deliveryItem ? `<span class="status ok">Товар выдан</span>` : `<button class="btn warn" data-live-action="issue-delivery" data-order-id="${orderItem.id}">Выдать товар</button>`;
  const isConfirmed = state.orderConfirmed || orderItem.order === "Завершен";
  const isDispute = state.disputeCreated || orderItem.order === "Спор";
  const statusRows = isConfirmed
    ? [`Товар: ${orderItem.product}`, `Продавец: ${orderItem.seller}`, `Покупатель: ${orderItem.buyer}`, `Сумма: ${money(orderItem.amount)}`, `Оплата: ${orderItem.payment}`, "Гарантия: сделка завершена", "Заказ: завершен"]
    : [`Товар: ${orderItem.product}`, `Продавец: ${orderItem.seller}`, `Покупатель: ${orderItem.buyer}`, `Сумма: ${money(orderItem.amount)}`, `Оплата: ${orderItem.payment}`, isDispute ? "Гарантия: открыт арбитраж" : "Гарантия: активна", `Заказ: ${orderItem.order}`];
  const timeline = isConfirmed
    ? ["Заказ создан", "Способ оплаты выбран", "Оплата найдена", "Гарантия активирована", "Продавец выдал товар", "Покупатель подтвердил получение", "Сделка завершена"]
    : ["Заказ создан", "Способ оплаты выбран", "Оплата найдена", "Гарантия активирована", "Продавец выдал товар", "Покупатель читает инструкцию"];
  const doneSteps = isConfirmed ? 5 : isDispute ? 4 : orderItem.order === "В работе" ? 3 : 4;
  return page(`Заказ #${orderItem.id}`, `<div class="order-layout">
    <section class="panel order-card"><div class="section-head"><div><p class="eyebrow">Сделка</p><h2>${orderItem.product}</h2><p class="muted">${orderItem.seller} · ${money(orderItem.amount)}</p></div><span class="status ${isDispute ? "wait" : "ok"}">${orderItem.order}</span></div><div class="list">${statusRows.map(row).join("")}</div><section class="section"><h2>Оплата</h2>${paymentListRow(paymentItem)}<a class="btn section" href="/payment/${orderItem.id}" data-link>Открыть оплату</a></section><section class="section"><h2>Данные выдачи</h2><div class="delivery-box"><strong>${deliverySecret}</strong><span>Проверьте товар после получения, затем подтвердите заказ.</span></div></section><section class="section"><h2>Статус</h2><div class="status-flow">${["Создан", "Оплачен", "В работе", "Проверка", "Завершен"].map((x, i) => `<span class="${i < doneSteps ? "done" : ""}">${x}</span>`).join("")}</div></section><div class="actions section">${isConfirmed ? `<span class="status ok">Получение подтверждено</span>` : `${issueButton}<button class="btn primary" data-confirm-order>Подтвердить получение</button><button class="btn danger" data-open-dispute>Открыть спор</button>`}</div></section>
    <aside class="panel timeline"><h2>История</h2>${timeline.map((x, i) => `<div class="list-row"><span>${i + 1}</span><span>${x}</span><span class="status ok">OK</span></div>`).join("")}</aside>
  </div>`, "Orders");
}

function notifications() {
  return page("Уведомления", `<div class="two-col"><section class="panel"><h2>Лента событий</h2><div class="list">${[
    ["Оплата найдена по заказу #12345", "только что"],
    ["Продавец выдал товар", "3 мин назад"],
    ["Гарантия сделки активирована", "5 мин назад"],
    ["Тикет #SUP-104 получил ответ", "сегодня"],
    ["Вывод #WD-120 ожидает проверки", "вчера"],
  ].map(([left, right]) => row(left, right)).join("")}</div></section><aside class="panel"><h2>Настройки</h2><div class="list">${["Email-уведомления", "Telegram-уведомления", "Системные события", "Платежи и подтверждения", "Споры и тикеты"].map((x) => row(x, "вкл")).join("")}</div></aside></div>`, "Account");
}

function chats() {
  const messages = [
    `<div class="chat-message system">Система: заказ создан, ожидается оплата.</div>`,
    `<div class="chat-message system">Система: оплата получена, гарантия сделки активирована.</div>`,
    `<div class="chat-message me">Проверьте выдачу на EU регион.</div>`,
    `<div class="chat-message">Продавец: данные выданы, инструкция в заказе.</div>`,
    `<div class="chat-message system">Система: покупатель может подтвердить получение или открыть спор.</div>`,
    ...state.chatMessages.map((message) => `<div class="chat-message me">${escapeHtml(message)}</div>`),
  ].join("");
  return page("Чаты", `<div class="chat-shell marketplace-chat">
    <aside class="panel chat-list"><h3>Диалоги</h3>${["#12345 · PixelTrade", "#22341 · KeyDock", "Поддержка", "Спор #12345"].map((x, i) => `<a class="side-link ${i === 0 ? "active" : ""}" href="/chats" data-link>${x}<span>${uiIcon("chevron")}</span></a>`).join("")}</aside>
    <section class="panel chat-panel"><div class="section-head"><div><h2>Заказ #12345</h2><p class="muted">Товар, оплата и выдача закреплены за этим диалогом.</p></div><a class="btn" href="/orders/12345" data-link>Открыть заказ</a></div><div class="chat-thread">${messages}</div><form class="form-actions section" data-chat-form>${field("Сообщение", "input", "Написать ответ")}<button class="btn primary">Отправить</button><button class="btn" type="button" data-file-action>Файл</button></form></section>
  </div>`, "Chats");
}

function account(path = "") {
  if (path.includes("/orders")) return accountOrders();
  if (path.includes("/favorites")) return accountFavorites();
  if (path.includes("/payments")) return accountPayments();
  if (path.includes("/reviews")) return accountReviews();
  if (path.includes("/security")) return dashboard("Безопасность", accountLinks, ["Пароль: обновлен 12 дней назад", "2FA: включить", "Активные сессии: 2", "Последний вход: сегодня"], "Account");
  if (path.includes("/settings")) return accountSettings();
  const session = sessionApi.currentSession();
  return dashboard("Кабинет покупателя", accountLinks, [
    `Роль: ${sessionApi.roleLabel(session.role)}`,
    `Никнейм: ${session.user?.name || "Artem"}`,
    `Email: ${session.user?.email || "buyer@example.com"}`,
    `Telegram: ${session.user?.telegram || "@buyer"}`,
    "2FA: включить",
    "Последний вход: сегодня",
  ]);
}

function accountOrders() {
  const liveOrderIds = new Set(liveItems("orders").map((orderItem) => String(orderItem.id)));
  const liveRows = liveItems("orders").map((orderItem) => orderListRow(normalizeLiveOrder(orderItem)));
  const demoRows = demoOrders.filter((orderItem) => !liveOrderIds.has(String(orderItem.id))).map((orderItem) => orderListRow(orderItem));
  return page("Мои заказы", `<div class="layout"><aside class="sidebar">${sideLinks(accountLinks)}</aside><section class="panel"><h2>Активные и завершенные</h2><div class="list">${[...liveRows, ...demoRows].join("")}</div></section></div>`, "Account");
}

function accountFavorites() {
  const favoriteProducts = products.filter((product) => state.favorites.has(product.id));
  const body = favoriteProducts.length
    ? productCards(favoriteProducts)
    : `<div class="empty-state"><strong>Избранное пустое</strong><span>Нажмите звезду на карточке товара, чтобы сохранить его здесь.</span><a class="btn primary" href="/catalog" data-link>Перейти в каталог</a></div>`;
  return page("Избранное", `<div class="layout"><aside class="sidebar">${sideLinks(accountLinks)}</aside><section>${body}</section></div>`, "Account");
}

function accountPayments() {
  const livePaymentIds = new Set(liveItems("payments").map((paymentItem) => String(paymentItem.id)));
  const liveRows = liveItems("payments").map((paymentItem) => paymentListRow(normalizeLivePayment(paymentItem)));
  const demoRows = demoPayments.filter((paymentItem) => !livePaymentIds.has(String(paymentItem.id))).map((paymentItem) => paymentListRow(paymentItem));
  return page("История оплат", `<div class="layout"><aside class="sidebar">${sideLinks(accountLinks)}</aside><section class="panel"><h2>Платежи заказов</h2>${[...liveRows, ...demoRows].join("")}</section></div>`, "Account");
}

function accountReviews() {
  return page("Мои отзывы", `<div class="layout"><aside class="sidebar">${sideLinks(accountLinks)}</aside><section class="panel"><div class="section-head"><h2>Оставить отзыв</h2><span class="status ok">после завершенного заказа</span></div><div class="form-grid">${field("Заказ", "select", ["#12345 · Robux 10 000", "#22341 · Steam Gift Card"])}${field("Оценка", "select", ["5", "4", "3", "2", "1"])}${field("Текст", "textarea", "Быстрая выдача, все работает")}</div><button class="btn primary section">Опубликовать отзыв</button><section class="section"><h2>Опубликованные</h2><div class="list">${["#22341 · 5★ · ключ подошел", "#33412 · 4★ · продавец ответил быстро"].map(row).join("")}</div></section></section></div>`, "Account");
}

function accountSettings() {
  const apiBaseUrl = api.getApiBaseUrl();
  const authToken = api.getAuthToken();
  return page("Настройки", `<div class="layout"><aside class="sidebar">${sideLinks(accountLinks)}</aside><section class="panel"><h2>Предпочтения</h2><div class="list">${[
    ["Язык", "RU"],
    ["Валюта отображения", currency],
    ["Избранных товаров", String(state.favorites.size)],
    ["Сообщений в чате", String(state.chatMessages.length)],
    ["Заказ подтвержден", state.orderConfirmed ? "да" : "нет"],
  ].map(([left, right]) => row(left, right)).join("")}</div>
  <section class="section"><h2>Live API</h2><div class="list">${[
    ["Текущий адрес", apiBaseUrl],
    ["Статус", state.liveStatus],
    ["Последняя синхронизация", state.liveSyncedAt ? new Date(state.liveSyncedAt).toLocaleString("ru-RU") : "нет"],
    ["Версия API", state.liveHealth?.version || "нет данных"],
    ["Токен сессии", authToken ? "сохранен" : "нет"],
  ].map(([left, right]) => row(left, right)).join("")}</div>
  <form class="form-grid section" data-api-settings-form>
    <label class="field"><span>API URL</span><input name="apiBaseUrl" value="${escapeHtml(apiBaseUrl)}" placeholder="https://secret-market-api.example.com" /></label>
    <div class="form-actions"><button class="btn primary">Сохранить</button><button class="btn" type="button" data-api-health-check>Проверить</button><button class="btn" type="button" data-live-sync>Синхронизировать</button><button class="btn warn" type="button" data-clear-api-token>Сбросить токен</button></div>
  </form></section>
  <div class="form-actions section"><button class="btn danger" data-reset-demo>Сбросить демо-состояние</button></div></section></div>`, "Account");
}
