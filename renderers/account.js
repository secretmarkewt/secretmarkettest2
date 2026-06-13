function order(id = 12345) {
  const orderItem = orderById(id);
  const paymentItem = paymentByOrderId(orderItem.id);
  const deliveryItem = deliveryByOrderId(orderItem.id);
  const session = sessionApi.currentSession();
  const isSellerView = session.role === "seller" || session.role === "admin";
  const isBuyerView = session.role === "buyer";
  const deliverySecret = deliveryItem?.secret || (orderItem.delivery === "Автовыдача" ? "AUTO-DELIVERY-CODE-SEC-9K2" : "Ручная выдача через чат заказа");
  const sellerActions = deliveryItem ? `<span class="status ok">Товар выдан</span>` : `<button class="btn warn" data-live-action="issue-delivery" data-order-id="${orderItem.id}">Выдать товар</button>`;
  const buyerActions = `<button class="btn primary" data-confirm-order>Подтвердить получение</button><button class="btn danger" data-open-dispute>Открыть спор</button>`;
  const guestActions = `<a class="btn primary" href="/login" data-link>Войти для действий</a>`;
  const isConfirmed = state.orderConfirmed || orderItem.order === "Завершен";
  const isDispute = state.disputeCreated || orderItem.order === "Спор";
  const orderActions = isConfirmed ? `<span class="status ok">Получение подтверждено</span>` : isSellerView ? sellerActions : isBuyerView ? buyerActions : guestActions;
  const isPaid = ["Оплачено", "paid", "completed"].includes(orderItem.payment) || paymentItem.status === "paid";
  const currentHint = isConfirmed
    ? "Сделка завершена. Средства отпущены продавцу, спор по заказу больше не нужен."
    : isDispute
      ? "По заказу открыта проверка. Поддержка удерживает средства до решения."
      : deliveryItem
        ? "Товар выдан. Проверьте данные и подтвердите получение, если все работает."
        : isSellerView
          ? "Оплата найдена. Выдайте товар покупателю и держите общение в чате заказа."
          : "Ожидаем выдачу товара продавцом. После получения проверьте данные и подтвердите заказ.";
  const progressSteps = [
    ["Создан", true],
    ["Оплачен", isPaid],
    ["Выдача", Boolean(deliveryItem) || orderItem.order === "Ожидает подтверждения" || isConfirmed],
    ["Проверка", Boolean(deliveryItem) || isDispute || isConfirmed],
    ["Завершен", isConfirmed],
  ];
  const timeline = [
    ["Заказ создан", true],
    ["Оплата закреплена за сделкой", progressSteps[1][1]],
    ["Продавец выдает товар", progressSteps[2][1]],
    [isDispute ? "Поддержка проверяет спор" : "Покупатель проверяет товар", progressSteps[3][1]],
    ["Сделка завершена", isConfirmed],
  ];
  return page(`Заказ #${orderItem.id}`, `<div class="order-layout">
    <section class="panel order-card order-detail-card">
      <div class="order-hero">
        <div><p class="eyebrow">Сделка #${orderItem.id}</p><h2>${orderItem.product}</h2><p class="muted">${orderItem.seller} · ${money(orderItem.amount)}</p></div>
        <span class="status ${isDispute ? "wait" : isConfirmed ? "ok" : "wait"}">${orderItem.order}</span>
      </div>
      <div class="order-current"><strong>${isSellerView ? "Что нужно сделать" : "Текущий шаг"}</strong><span>${currentHint}</span></div>
      <div class="order-info-grid">
        <article><span>Товар</span><strong>${orderItem.product}</strong><small>${orderItem.seller}</small></article>
        <article><span>Оплата</span><strong>${orderItem.payment}</strong><small>${paymentItem.network} · ${paymentItem.confirmations}</small></article>
        <article><span>Гарантия</span><strong>${isDispute ? "проверка" : isConfirmed ? "завершена" : "активна"}</strong><small>${isDispute ? "средства удержаны" : "защита сделки включена"}</small></article>
      </div>
      <section class="section"><h2>Данные выдачи</h2><div class="delivery-box"><strong>${deliverySecret}</strong><span>Проверьте товар после получения, затем подтвердите заказ.</span></div></section>
      <section class="section"><h2>Прогресс</h2><div class="status-flow order-flow">${progressSteps.map(([label, done]) => `<span class="${done ? "done" : ""}">${label}</span>`).join("")}</div></section>
      <div class="actions order-actions">${orderActions}<a class="btn" href="/payment/${orderItem.id}" data-link>Открыть оплату</a><a class="btn" href="/chats" data-link>Чат заказа</a></div>
    </section>
    <aside class="panel timeline order-timeline"><h2>История</h2>${timeline.map(([label, done], i) => `<div class="order-step ${done ? "done" : ""}"><span>${i + 1}</span><strong>${label}</strong><small>${done ? "готово" : "ожидает"}</small></div>`).join("")}</aside>
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
  if (path.includes("/security")) return accountSecurity();
  if (path.includes("/settings")) return accountSettings();
  return accountOverview();
}

function accountOverview() {
  const session = sessionApi.currentSession();
  const liveOrderIds = new Set(liveItems("orders").map((orderItem) => String(orderItem.id)));
  const orders = mixDemoRows(
    "orders",
    demoOrders.filter((orderItem) => !liveOrderIds.has(String(orderItem.id))).slice(0, 3).map(orderListRow),
    liveItems("orders").slice(0, 3).map((orderItem) => orderListRow(normalizeLiveOrder(orderItem))),
  );
  const openTickets = mixDemoRows(
    "tickets",
    window.SECMARKET_DATA.demoTickets.filter((ticket) => ticket.status !== "Закрыт").map(ticketListRow),
    liveItems("tickets").filter((ticket) => !["closed", "resolved"].includes(ticket.status)).map((ticket) => ticketListRow(normalizeLiveTicket(ticket))),
  );
  const activePayments = mixDemoRows(
    "payments",
    demoPayments.slice(0, 2).map(paymentListRow),
    liveItems("payments").slice(0, 2).map((paymentItem) => paymentListRow(normalizeLivePayment(paymentItem))),
  );
  const profileRows = [
    ["Роль", sessionApi.roleLabel(session.role)],
    ["Никнейм", session.user?.name || "Artem"],
    ["Email", session.user?.email || "buyer@example.com"],
    ["Telegram", session.user?.telegram || "@buyer"],
    ["Промокод", session.user?.promoCode || "нет"],
  ];
  return page("Кабинет", `<div class="layout"><aside class="sidebar">${sideLinks(accountLinks)}</aside><section>
    <section class="panel account-hero"><div class="section-head"><div><p class="eyebrow">Профиль</p><h1>${session.user?.name || "Artem"}</h1><p class="lead">Заказы, платежи, обращения и безопасность аккаунта в одном месте.</p></div><span class="status ${session.role === "guest" ? "wait" : "ok"}">${sessionApi.roleLabel(session.role)}</span></div>
      <div class="grid metrics">${[
        [orders.length, "последних заказа"],
        [openTickets.length, "открытых обращения"],
        [activePayments.length, "платежа в истории"],
        [state.favorites.size, "в избранном"],
      ].map(([value, label]) => `<div class="metric panel"><strong>${value}</strong><span>${label}</span></div>`).join("")}</div>
      <div class="form-actions section"><a class="btn primary" href="/catalog" data-link>Открыть каталог</a><a class="btn" href="/support/ticket" data-link>Создать тикет</a><a class="btn" href="/account/security" data-link>Безопасность</a></div>
    </section>
    <div class="two-col section">
      <section class="panel"><div class="section-head"><h2>Последние заказы</h2><a class="btn" href="/account/orders" data-link>Все</a></div><div class="list">${orders.length ? orders.join("") : emptyAccountState("Заказов пока нет")}</div></section>
      <aside class="panel"><h2>Профиль</h2><div class="list">${profileRows.map(([left, right]) => row(left, right)).join("")}</div></aside>
    </div>
    <div class="two-col section">
      <section class="panel"><div class="section-head"><h2>Обращения</h2><a class="btn" href="/support/requests" data-link>Открыть</a></div><div class="list">${openTickets.length ? openTickets.slice(0, 3).join("") : emptyAccountState("Обращений пока нет")}</div></section>
      <aside class="panel"><div class="section-head"><h2>Платежи</h2><a class="btn" href="/account/payments" data-link>История</a></div><div class="list">${activePayments.length ? activePayments.join("") : emptyAccountState("Платежей пока нет")}</div></aside>
    </div>
  </section></div>`, "Account");
}

function accountSecurity() {
  const session = sessionApi.currentSession();
  return page("Безопасность", `<div class="layout"><aside class="sidebar">${sideLinks(accountLinks)}</aside><section>
    <section class="panel"><div class="section-head"><div><h2>Защита аккаунта</h2><p class="muted">Перед релизом важно держать вход, Telegram и сессии под контролем.</p></div><span class="status wait">MVP</span></div><div class="list">${[
      ["Email", session.user?.email || "buyer@example.com"],
      ["Telegram", session.user?.telegram || "@buyer"],
      ["Пароль", "обновлен 12 дней назад"],
      ["2FA", "следующий production-шаг"],
      ["Активная сессия", api.getAuthToken() ? "live token сохранен" : "локальная сессия"],
    ].map(([left, right]) => row(left, right)).join("")}</div></section>
    <section class="panel section"><h2>Рекомендации</h2><div class="list">${[
      "Не выводить общение с продавцом из чата заказа",
      "Проверять адрес оплаты и сеть перед отправкой USDT",
      "Хранить Telegram актуальным для уведомлений поддержки",
      "Перед реальными деньгами включить 2FA и восстановление пароля",
    ].map(row).join("")}</div></section>
  </section></div>`, "Account");
}

function accountOrders() {
  const liveOrderIds = new Set(liveItems("orders").map((orderItem) => String(orderItem.id)));
  const liveRows = liveItems("orders").map((orderItem) => orderListRow(normalizeLiveOrder(orderItem)));
  const demoRows = demoOrders.filter((orderItem) => !liveOrderIds.has(String(orderItem.id))).map((orderItem) => orderListRow(orderItem));
  const rows = mixDemoRows("orders", demoRows, liveRows);
  return page("Мои заказы", `<div class="layout"><aside class="sidebar">${sideLinks(accountLinks)}</aside><section class="panel"><h2>Активные и завершенные</h2><div class="list">${rows.length ? rows.join("") : emptyAccountState("Заказов пока нет")}</div></section></div>`, "Account");
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
  const rows = mixDemoRows("payments", demoRows, liveRows);
  return page("История оплат", `<div class="layout"><aside class="sidebar">${sideLinks(accountLinks)}</aside><section class="panel"><h2>Платежи заказов</h2>${rows.length ? rows.join("") : emptyAccountState("Платежей пока нет")}</section></div>`, "Account");
}

function emptyAccountState(text) {
  return `<div class="list-row"><span class="muted">${text}</span><span class="status wait">live</span></div>`;
}

function accountReviews() {
  return page("Мои отзывы", `<div class="layout"><aside class="sidebar">${sideLinks(accountLinks)}</aside><section class="panel"><div class="section-head"><h2>Оставить отзыв</h2><span class="status ok">после завершенного заказа</span></div><div class="form-grid">${field("Заказ", "select", ["#12345 · Robux 10 000", "#22341 · Steam Gift Card"])}${field("Оценка", "select", ["5", "4", "3", "2", "1"])}${field("Текст", "textarea", "Быстрая выдача, все работает")}</div><button class="btn primary section">Опубликовать отзыв</button><section class="section"><h2>Опубликованные</h2><div class="list">${["#22341 · 5★ · ключ подошел", "#33412 · 4★ · продавец ответил быстро"].map(row).join("")}</div></section></section></div>`, "Account");
}

function accountSettings() {
  const apiBaseUrl = api.getApiBaseUrl();
  const authToken = api.getAuthToken();
  return page("Настройки", `<div class="layout"><aside class="sidebar">${sideLinks(accountLinks)}</aside><section><section class="panel"><h2>Предпочтения</h2><div class="list">${[
    ["Язык", "RU"],
    ["Валюта отображения", currency],
    ["Избранных товаров", String(state.favorites.size)],
    ["Сообщений в чате", String(state.chatMessages.length)],
    ["Заказ подтвержден", state.orderConfirmed ? "да" : "нет"],
  ].map(([left, right]) => row(left, right)).join("")}</div>
  <section class="section"><h2>Live API</h2><div class="list">${[
    ["Провайдер", hasLiveProvider() ? liveProviderName() : "не настроен"],
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
  <div class="form-actions section"><button class="btn danger" data-reset-demo>Сбросить демо-состояние</button></div></section>${releaseReadinessPanel(true)}</section></div>`, "Account");
}
