function disputes() {
  const state = window.SECMARKET_STATE;
  const demoDisputes = window.SECMARKET_DATA.demoDisputes;
  const liveDisputeIds = new Set(liveItems("disputes").map((dispute) => String(dispute.id)));
  const liveRows = liveItems("disputes").map((dispute) => normalizeLiveDispute(dispute));
  const demoRows = demoDisputes.filter((dispute) => !liveDisputeIds.has(String(dispute.id)));
  return page("Споры", `<div class="two-col"><section class="panel"><h2>Открыть спор</h2><div class="form-grid">${field("Заказ", "input", "#12345")}${field("Причина", "select", ["Товар не выдан", "Товар не работает", "Продавец не отвечает", "Неверное описание", "Проблема с оплатой", "Другое"])}${field("Описание проблемы", "textarea", "Опишите ситуацию")}${field("Доказательства", "input", "Ссылка или файл")}</div><button class="btn primary section">Отправить</button><section class="section"><h2>Активные споры</h2><div class="list">${[
    ...(state.disputeCreated ? [{ id: 45, order: 12345, reason: "Создан только что", status: "Новый" }] : []),
    ...liveRows,
    ...demoRows,
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
    <aside class="panel"><h2>Действия поддержки</h2><form data-dispute-resolution-form><div class="form-grid">
      <label class="field"><span>Решение</span><select name="status"><option value="need_more_data">Запросить данные</option><option value="partial_refund">Частичный возврат</option><option value="resolved_buyer">Полный возврат</option><option value="resolved_seller">Закрыть в пользу продавца</option></select></label>
      <label class="field"><span>Сумма возврата</span><input name="refundAmount" inputmode="decimal" placeholder="35.00" /></label>
      <label class="field"><span>Комментарий</span><textarea name="decision" placeholder="Опишите решение поддержки"></textarea></label>
    </div><div class="form-actions section"><button class="btn primary" type="button" data-live-action="resolve-dispute" data-dispute-id="${dispute.id}" data-order-id="${dispute.order}">Сохранить решение</button><a class="btn" href="/orders/${dispute.order}" data-link>Открыть заказ</a><a class="btn" href="/admin/payments/${dispute.payment}" data-link>Платеж</a></div></form></aside>
  </div>`, "Support");
}

function support(path = "") {
  if (path.includes("/tickets/")) return supportTicketDetail(path.split("/").pop());
  if (path.includes("/ticket")) return supportTicket();
  if (path.includes("/requests")) return supportRequests();
  if (path.includes("/payment")) return supportTopic("Проблемы с оплатой", ["Проверьте сеть и точную сумму", "Сохраните tx hash", "Если сумма недостаточная, доплатите только после ответа поддержки", "Не отправляйте другой токен на адрес USDT"]);
  if (path.includes("/order")) return supportTopic("Проблемы с заказом", ["Откройте страницу заказа", "Проверьте данные выдачи", "Напишите продавцу в чат", "Если ответа нет, откройте спор"]);
  if (path.includes("/seller")) return supportTopic("Проблемы с продавцом", ["Не выводите общение из чата заказа", "Приложите скриншоты или файлы", "Поддержка увидит платеж и историю", "Средства можно заблокировать до решения"]);
  if (path.includes("/faq")) return supportTopic("FAQ", ["Как оплатить заказ", "Как работает гарантия сделки", "Когда продавец получает деньги", "Как открыть спор", "Как вывести средства продавцу"]);

  const items = [
    ["FAQ", "/support/faq"],
    ["Создать тикет", "/support/ticket"],
    ["Мои обращения", "/support/requests"],
    ["Правила возврата", "/refund-policy"],
    ["Проблемы с оплатой", "/support/payment"],
    ["Проблемы с заказом", "/support/order"],
    ["Проблемы с продавцом", "/support/seller"],
  ];
  return page("Поддержка", `<div class="support-grid">${items.map(([label, href]) => `<a class="category-card support-card" href="${href}" data-link><span class="category-icon">i</span><strong>${label}</strong><span class="muted">Раздел поддержки</span></a>`).join("")}</div>`, "Support");
}

function supportTicket() {
  return page("Создать тикет", `<div class="two-col"><section class="panel"><form data-support-ticket-form><div class="form-grid">
    <label class="field"><span>Тема</span><select name="topic"><option>Проблема с оплатой</option><option>Проблема с заказом</option><option>Проблема с продавцом</option><option>Выплаты</option><option>Другое</option></select></label>
    <label class="field"><span>Связанный заказ</span><input name="orderId" placeholder="#12345" /></label>
    <label class="field"><span>Описание</span><textarea name="description" placeholder="Опишите проблему подробно"></textarea></label>
    <label class="field"><span>Контакт</span><input name="contact" placeholder="@telegram" /></label>
  </div><button class="btn primary section" type="submit">Создать тикет</button></form></section><aside class="panel"><h2>Что приложить</h2>${["tx hash", "номер заказа", "скриншоты переписки", "файлы или коды выдачи"].map(row).join("")}</aside></div>`, "Support");
}

function supportRequests() {
  const liveRows = liveItems("tickets").map((ticket) => ticketListRow({
    id: ticket.id,
    topic: ticket.topic,
    order: ticket.orderId || "—",
    status: statusLabel(ticket.status),
  }));
  const rows = mixDemoRows("tickets", window.SECMARKET_DATA.demoTickets.map(ticketListRow), liveRows);
  return page("Мои обращения", `<section class="panel"><div class="list">${rows.length ? rows.join("") : `<div class="list-row"><span class="muted">Обращений пока нет</span><span class="status wait">live</span></div>`}</div></section>`, "Support");
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
