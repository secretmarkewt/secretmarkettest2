function admin(path = "") {
  if (path.includes("/payments/")) return adminPaymentDetail(path.split("/").pop());
  if (path.includes("/payouts/")) return adminPayoutDetail(path.split("/").pop());
  if (path.includes("/users")) return adminUsers();
  if (path.includes("/sellers")) return adminSellers();
  if (path.includes("/products")) return adminProducts();
  if (path.includes("/orders")) return adminOrders();
  if (path.includes("/crypto")) return adminCrypto();
  if (path.includes("/payments")) return adminPayments();
  if (path.includes("/payouts")) return adminPayouts();
  if (path.includes("/operations")) return adminOperations();
  if (path.includes("/disputes")) return adminTable("Админка споров", ["#12345 · покупатель открыл спор", "Причина: товар не работает", "Чат доступен", "Оплата подтверждена", "Решение: запросить данные"]);
  if (path.includes("/tickets")) return adminTickets();
  if (path.includes("/categories")) return adminCategories();
  if (path.includes("/promocodes")) return adminPromocodes();
  if (path.includes("/fees")) return adminFees();
  if (path.includes("/transactions")) return adminTransactions();
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
  ].map(([value, label]) => `<div class="metric panel"><strong>${value}</strong><span>${label}</span></div>`).join("")}</div>${releaseReadinessPanel(true)}<div class="grid admin section">${adminLinks.slice(1).map(([label, href]) => `<a class="admin-tile panel" href="${href}" data-link><h3>${label}</h3><p class="muted">Смена статусов, история действий, ручная проверка и модерация.</p></a>`).join("")}</div><section class="section panel"><h2>Последние платежи</h2>${paymentRows.length ? paymentRows.join("") : emptyAdminState("Платежей пока нет")}</section></section></div>`, "Admin");
}

function adminPayments() {
  const livePaymentIds = new Set(liveItems("payments").map((paymentItem) => String(paymentItem.id)));
  const liveRows = liveItems("payments").map((paymentItem) => {
    const normalized = normalizeLivePayment(paymentItem);
    return `<a class="list-row" href="/admin/payments/${normalized.id}" data-link><span>${normalized.amount.toFixed(2)} ${normalized.coin} · ${normalized.network}<br><span class="muted">#${normalized.order} · ${normalized.tx || "транзакция ожидается"} · ${normalized.confirmations}</span></span><span class="status ${statusTone(normalized.status)}">${statusLabel(normalized.status)}</span></a>`;
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
  const statusOptions = [
    ["waiting", "Ожидает оплату"],
    ["found", "Транзакция найдена"],
    ["confirming", "Подтверждается"],
    ["paid", "Оплата подтверждена"],
    ["underpaid", "Недостаточная сумма"],
    ["network_error", "Ошибка сети"],
  ];
  return page(`Платеж ${paymentItem.id}`, `<div class="layout"><aside class="sidebar">${sideLinks(adminLinks)}</aside><section>
    <section class="panel"><div class="section-head"><div><h2>${paymentItem.amount.toFixed(2)} ${paymentItem.coin}</h2><p class="muted">${paymentItem.network} · заказ #${paymentItem.order}</p></div><span class="status ${statusTone(paymentItem.status)}">${statusLabel(paymentItem.status)}</span></div><div class="grid metrics">${[
      [paymentItem.network, "сеть"],
      [paymentItem.confirmations, "подтверждения"],
      [paymentItem.tx, "ID транзакции"],
      [orderItem.order, "статус заказа"],
    ].map(([value, label]) => `<div class="metric panel"><strong>${value}</strong><span>${label}</span></div>`).join("")}</div></section>
    <section class="panel section"><h2>Ручная проверка</h2><form data-payment-review-form><div class="form-grid">
      <label class="field"><span>Адрес оплаты</span><input name="address" value="${escapeHtml(paymentAddress)}" readonly /></label>
      <label class="field"><span>ID транзакции</span><input name="txHash" placeholder="ID..." value="${escapeHtml(paymentItem.tx)}" /></label>
      <label class="field"><span>Подтверждения</span><input name="confirmations" inputmode="numeric" value="${escapeHtml(paymentItem.confirmations)}" /></label>
      <label class="field"><span>Статус</span><select name="status">${statusOptions.map(([value, label]) => `<option value="${value}" ${paymentItem.status === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>
      <label class="field"><span>Комментарий админа</span><textarea name="adminNote" placeholder="Проверить сумму и сеть перед сменой статуса"></textarea></label>
    </div><div class="form-actions section"><button class="btn primary" type="button" data-live-action="sync-payment" data-payment-id="${paymentItem.id}">Сохранить статус</button><a class="btn" href="/orders/${paymentItem.order}" data-link>Связанный заказ</a><button class="btn danger" type="button" data-live-action="mark-payment-error" data-payment-id="${paymentItem.id}">Пометить ошибку</button></div></form></section>
    <section class="panel section"><h2>История статусов</h2><div class="list">${["Создан адрес оплаты", "Транзакция найдена мониторингом", `Подтверждения: ${paymentItem.confirmations}`, `Текущий статус: ${statusLabel(paymentItem.status)}`].map(row).join("")}</div></section>
  </section></div>`, "Admin");
}

function adminPayouts() {
  const liveWithdrawalIds = new Set(liveItems("withdrawals").map((withdrawalItem) => String(withdrawalItem.id).toLowerCase()));
  const liveRows = liveItems("withdrawals").map((withdrawalItem) => `<a class="list-row" href="/admin/payouts/${withdrawalItem.id}" data-link><span>#${withdrawalItem.id} · ${withdrawalItem.sellerId}<br><span class="muted">${Number(withdrawalItem.amount || 0).toFixed(2)} ${withdrawalItem.coin || "USDT"} · ${withdrawalItem.network} · ${withdrawalItem.address}${withdrawalItem.batchId ? ` · batch ${withdrawalItem.batchId}` : ""}</span></span><span class="status ${statusTone(withdrawalItem.status)}">${statusLabel(withdrawalItem.status)}</span></a>`);
  const demoRows = demoWithdrawals
    .filter((withdrawalItem) => !liveWithdrawalIds.has(String(withdrawalItem.id).toLowerCase()))
    .map((withdrawalItem) => `<a class="list-row" href="/admin/payouts/${withdrawalItem.id}" data-link><span>#${withdrawalItem.id} · ${withdrawalItem.seller}<br><span class="muted">${withdrawalItem.amount.toFixed(2)} USDT · ${withdrawalItem.network} · ${withdrawalItem.address}</span></span><span class="status ${statusTone(withdrawalItem.status)}">${withdrawalItem.status}</span></a>`);
  return page("Админка выплат", `<div class="layout"><aside class="sidebar">${sideLinks(adminLinks)}</aside><section>
    <section class="panel"><div class="section-head"><div><h2>Очередь выплат</h2><p class="muted">Ручная проверка адресов, баланса продавца и ID транзакции после отправки.</p></div><div class="actions-inline"><button class="btn primary" type="button" data-live-action="create-payout-batch">Собрать batch</button><button class="btn" type="button" data-live-action="export-payouts">CSV</button></div></div><div class="list">${mixDemoRows("withdrawals", demoRows, liveRows).join("") || emptyAdminState("Заявок на вывод пока нет")}</div></section>
    <section class="panel section"><h2>Проверки перед выплатой</h2><div class="grid trust">${["Адрес совпадает с профилем", "Баланс доступен без холда", "Нет открытого спора", "2FA продавца подтверждена"].map((item) => `<div class="trust-item panel"><h3>${item}</h3><p class="muted">Админ подтверждает вручную в MVP.</p></div>`).join("")}</div></section>
  </section></div>`, "Admin");
}

function operationStatusRow(label, ready, detail) {
  return `<div class="list-row"><span>${label}<br><span class="muted">${detail}</span></span><span class="status ${ready ? "ok" : "wait"}">${ready ? "OK" : "нужно"}</span></div>`;
}

function adminOperations() {
  const health = state.liveHealth || {};
  const ready = state.liveReady || {};
  const watchers = health.paymentWatchers || ready.paymentWatchers || {};
  const watcherRows = Object.entries(watchers).map(([network, watcher]) => operationStatusRow(
    network,
    Boolean(watcher.configured),
    watcher.endpoint || watcher.url ? `watcher: ${watcher.endpoint || watcher.url} · confirmations ${watcher.confirmationsRequired || "n/a"} · timeout ${watcher.timeoutMs || "n/a"}ms` : "worker URL не настроен",
  ));
  const deploymentIssues = Array.isArray(ready.deploymentIssues) ? ready.deploymentIssues : [];
  const issueRows = deploymentIssues.length
    ? deploymentIssues.map((issue) => `<div class="list-row"><span>${issue}</span><span class="status wait">blocker</span></div>`)
    : [operationStatusRow("Deployment issues", true, "критичных блокеров от /api/ready нет")];
  const storage = health.storage || ready.storage || {};
  const backups = health.operations?.backups || {};
  const backupRows = (state.liveBackups || []).map((backup) => `<div class="list-row"><span>${backup.fileName}<br><span class="muted">${Math.ceil(Number(backup.size || 0) / 1024)} KB · ${backup.updatedAt || backup.createdAt || ""}</span></span><span class="status ok">backup</span></div>`);
  const metrics = health.metrics || {};

  return page("Operations", `<div class="layout"><aside class="sidebar">${sideLinks(adminLinks)}</aside><section>
    <div class="grid metrics">${[
      [health.ok ? "online" : state.liveStatus, "API status"],
      [metrics.onlineUsers ?? "n/a", "online users"],
      [metrics.publishedProducts ?? "n/a", "published products"],
      [metrics.completedOrders ?? "n/a", "completed orders"],
    ].map(([value, label]) => `<div class="metric panel"><strong>${value}</strong><span>${label}</span></div>`).join("")}</div>
    <section class="panel section"><div class="section-head"><div><h2>Backend readiness</h2><p class="muted">Живые данные из /api/health и /api/ready: storage, backup, reset, rate limit и production blockers.</p></div><button class="btn primary" type="button" data-live-action="refresh-operations">Обновить</button></div><div class="list">${[
      operationStatusRow("Persistent storage", Boolean(storage.persistent), storage.configured ? "DB file configured" : "DB file не настроен"),
      operationStatusRow("Atomic JSON writes", Boolean(storage.atomicWrites), storage.atomicWrites ? "tmp + rename enabled" : "atomic writes не подтверждены"),
      operationStatusRow("Backup storage", Boolean(backups.persistent || storage.backupPersistent), backups.configured || storage.backupConfigured ? "backup directory configured" : "backup directory не настроен"),
      operationStatusRow("Rate limit", Boolean(health.rateLimit?.max), `${health.rateLimit?.max || "n/a"} requests / ${health.rateLimit?.windowMs || "n/a"}ms`),
      operationStatusRow("Reset disabled for production", !health.resetEnabled || health.environment !== "production", health.resetEnabled ? "reset сейчас включен" : "reset выключен"),
    ].join("")}</div></section>
    <section class="panel section"><div class="section-head"><div><h2>Payment watchers</h2><p class="muted">TRC20 / TON / BEP20 должны иметь реальные worker URL перед production.</p></div><span class="status ${watcherRows.every((item) => item.includes(">OK<")) ? "ok" : "wait"}">watchers</span></div><div class="list">${watcherRows.join("") || emptyAdminState("Данных по watcher пока нет")}</div></section>
    <section class="panel section"><div class="section-head"><div><h2>Backups</h2><p class="muted">Ручные snapshot-файлы JSON store для отката и миграции в production database.</p></div><button class="btn primary" type="button" data-live-action="create-backup">Создать backup</button></div><div class="list">${backupRows.join("") || emptyAdminState("Backup-файлов пока нет")}</div></section>
    <section class="panel section"><div class="section-head"><div><h2>Production blockers</h2><p class="muted">Если список пустой, backend readiness считает конфигурацию безопасной.</p></div><span class="status ${deploymentIssues.length ? "wait" : "ok"}">${deploymentIssues.length || "OK"}</span></div><div class="list">${issueRows.join("")}</div></section>
  </section></div>`, "Admin");
}

function adminPayoutDetail(id = "WD-120") {
  const withdrawalItem = withdrawalById(id);
  const coin = withdrawalItem.coin || "USDT";
  const grossAmount = Number(withdrawalItem.grossAmount || withdrawalItem.amount || 0);
  const networkFee = Number(withdrawalItem.networkFee || 0);
  const netAmount = Number(withdrawalItem.netAmount || Math.max(grossAmount - networkFee, 0));
  const txHash = withdrawalItem.tx || "";
  return page(`Выплата #${withdrawalItem.id}`, `<div class="layout"><aside class="sidebar">${sideLinks(adminLinks)}</aside><section>
    <section class="panel"><div class="section-head"><div><h2>${withdrawalItem.seller} · ${grossAmount.toFixed(2)} ${coin}</h2><p class="muted">${withdrawalItem.network} · ${withdrawalItem.address}</p></div><span class="status ${statusTone(withdrawalItem.status)}">${statusLabel(withdrawalItem.status)}</span></div><div class="grid metrics">${[
      [withdrawalItem.network, "сеть"],
      [networkFee.toFixed(2), "комиссия сети"],
      [netAmount.toFixed(2), "к получению"],
      [statusLabel(withdrawalItem.status), "статус"],
    ].map(([value, label]) => `<div class="metric panel"><strong>${value}</strong><span>${label}</span></div>`).join("")}</div></section>
    <section class="panel section"><h2>Ручное подтверждение</h2><form data-payout-form><div class="form-grid">
      <label class="field"><span>Адрес кошелька</span><input name="address" value="${escapeHtml(withdrawalItem.address)}" readonly /></label>
      <label class="field"><span>Сеть</span><input name="network" value="${escapeHtml(withdrawalItem.network)}" readonly /></label>
      <label class="field"><span>Сумма списания</span><input name="grossAmount" value="${grossAmount.toFixed(2)} ${coin}" readonly /></label>
      <label class="field"><span>Комиссия сети</span><input name="networkFee" value="${networkFee.toFixed(2)} ${coin}" readonly /></label>
      <label class="field"><span>К получению</span><input name="netAmount" value="${netAmount.toFixed(2)} ${coin}" readonly /></label>
      <label class="field"><span>ID транзакции выплаты</span><input name="txHash" placeholder="ID-OUT-..." value="${escapeHtml(txHash)}" /></label>
      <label class="field"><span>Статус</span><select name="status"><option value="processing">В обработке</option><option value="sent">Отправлен</option><option value="completed" selected>Выполнен</option><option value="rejected">Отклонен</option></select></label>
      <label class="field"><span>Комментарий</span><textarea name="riskNote" placeholder="Проверить адрес, холды и открытые споры перед отправкой">${escapeHtml(withdrawalItem.risk || "")}</textarea></label>
    </div><div class="form-actions section"><button class="btn primary" type="button" data-live-action="settle-withdrawal" data-withdrawal-id="${withdrawalItem.id}">Подтвердить выплату</button><button class="btn warn" type="button" data-live-action="review-withdrawal" data-withdrawal-id="${withdrawalItem.id}">Запросить проверку</button><button class="btn danger" type="button" data-live-action="reject-withdrawal" data-withdrawal-id="${withdrawalItem.id}">Отклонить</button></div></form></section>
    <section class="panel section"><h2>История изменения статусов</h2><div class="list">${["Запрос создан продавцом", "Адрес прошел форматную проверку", `Риск: ${withdrawalItem.risk}`, `Текущий статус: ${statusLabel(withdrawalItem.status)}`].map(row).join("")}</div></section>
  </section></div>`, "Admin");
}

function adminTransactions() {
  const rows = liveItems("transactions").length ? liveItems("transactions") : (window.SECMARKET_DATA.demoTransactions || []);
  const listRows = rows.map((transaction) => `<div class="list-row"><span>${transaction.id} · ${transaction.userId}<br><span class="muted">${transaction.type} · ${Number(transaction.amount || 0).toFixed(2)} USDT · ${transaction.paymentMethod || "USDT"}</span></span><span class="status ${statusTone(transaction.status)}">${statusLabel(transaction.status)}</span>${transaction.status === "pending" ? `<button class="btn primary" data-live-action="approve-transaction" data-transaction-id="${transaction.id}">Approve</button><button class="btn danger" data-live-action="reject-transaction" data-transaction-id="${transaction.id}">Reject</button>` : ""}</div>`);
  return page("Админка балансов", `<div class="layout"><aside class="sidebar">${sideLinks([...adminLinks, ["Балансы", "/admin/transactions"]])}</aside><section>
    <section class="panel"><div class="section-head"><div><h2>Транзакции баланса</h2><p class="muted">Пополнения, выводы и ручные корректировки. Повторный approve не начисляет деньги второй раз.</p></div><span class="status ok">server only</span></div><div class="list">${listRows.join("") || emptyAdminState("Транзакций пока нет")}</div></section>
    <section class="panel section"><h2>Ручная корректировка</h2><form data-admin-adjust-form><div class="form-grid">
      <label class="field"><span>User ID</span><input name="userId" placeholder="usr-buyer" /></label>
      <label class="field"><span>Сумма</span><input name="amount" inputmode="decimal" placeholder="10.00" /></label>
      <label class="field"><span>Комментарий</span><input name="comment" placeholder="Причина обязательна" /></label>
    </div><div class="form-actions section"><button class="btn warn" type="button" data-live-action="adjust-balance">Сохранить корректировку</button></div></form></section>
  </section></div>`, "Admin");
}

function adminTable(title, rows) {
  return page(title, `<div class="layout"><aside class="sidebar">${sideLinks(adminLinks)}</aside><section class="panel"><div class="section-head"><h2>Операции</h2><button class="btn primary">Сохранить изменения</button></div><div class="list">${rows.map(row).join("")}</div><div class="form-actions section"><button class="btn">Сменить статус</button><button class="btn warn">Открыть чат</button><button class="btn danger">Заблокировать средства</button></div></section></div>`, "Admin");
}

function adminOrders() {
  const liveOrderIds = new Set(liveItems("orders").map((orderItem) => String(orderItem.id)));
  const liveRows = liveItems("orders").map((orderItem) => {
    const normalized = normalizeLiveOrder(orderItem);
    return `<div class="list-row"><span>#${normalized.id} · ${normalized.product}<br><span class="muted">${normalized.buyer || "buyer"} · ${normalized.seller || "seller"} · ${money(normalized.amount)}</span></span><span class="admin-row-actions"><span class="status ${statusTone(orderItem.status)}">${statusLabel(orderItem.status)}</span><button class="btn tiny" data-live-action="mark-order-paid" data-order-id="${orderItem.id}">Оплачен</button><button class="btn tiny" data-live-action="complete-order" data-order-id="${orderItem.id}">Завершить</button><button class="btn tiny danger" data-live-action="refund-order" data-order-id="${orderItem.id}">Возврат</button></span></div>`;
  });
  const demoRows = demoOrders
    .filter((orderItem) => !liveOrderIds.has(String(orderItem.id)))
    .map((orderItem) => orderListRow(orderItem));
  const rows = mixDemoRows("orders", demoRows, liveRows);
  return page("Админка заказов", `<div class="layout"><aside class="sidebar">${sideLinks(adminLinks)}</aside><section class="panel"><div class="section-head"><h2>Заказы</h2><button class="btn" data-live-sync>Обновить</button></div><div class="list">${rows.length ? rows.join("") : emptyAdminState("Заказов пока нет")}</div></section></div>`, "Admin");
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
  const liveRows = liveItems("products").map((product) => `<div class="list-row"><span>${product.title}<br><span class="muted">${product.sellerId || "seller"} · ${product.category || "catalog"}</span></span><span class="admin-row-actions"><span class="status ${statusTone(product.status)}">${statusLabel(product.status)}</span><button class="btn tiny" data-live-action="approve-product" data-product-id="${product.id}">Одобрить</button><button class="btn tiny danger" data-live-action="reject-product" data-product-id="${product.id}">Снять</button></span></div>`);
  const demoRows = products
    .filter((product) => !liveProductIds.has(String(product.id)))
    .slice(0, 6)
    .map((product, index) => `<div class="list-row"><span>${product.title}<br><span class="muted">${product.seller} · ${product.cat}</span></span><span class="status ${index % 3 === 0 ? "wait" : "ok"}">${index % 3 === 0 ? "на проверке" : "активен"}</span></div>`);
  const rows = mixDemoRows("products", demoRows, liveRows);
  return page("Товары", `<div class="layout"><aside class="sidebar">${sideLinks(adminLinks)}</aside><section class="panel"><div class="section-head"><h2>Модерация товаров</h2><button class="btn" data-live-sync>Обновить</button></div><div class="list">${rows.length ? rows.join("") : emptyAdminState("Товаров на модерации пока нет")}</div></section></div>`, "Admin");
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
  const priorityLabel = (ticket) => {
    if (["open", "waiting_support"].includes(ticket.rawStatus)) return "срочно";
    if (ticket.rawStatus === "waiting_user") return "ждём клиента";
    return "обычно";
  };
  const liveRows = liveItems("tickets").map((ticketItem) => {
    const ticket = normalizeLiveTicket(ticketItem);
    return `<div class="list-row"><span>#${ticket.id} · ${ticket.topic}<br><span class="muted">заказ ${ticket.order} · ${ticket.contact || "контакт не указан"}${ticket.description ? ` · ${ticket.description}` : ""}</span></span><span class="admin-row-actions"><span class="status ${priorityLabel(ticket) === "срочно" ? "bad" : "wait"}">${priorityLabel(ticket)}</span><span class="status ${statusTone(ticket.rawStatus)}">${ticket.status}</span><a class="btn tiny" href="/support/tickets/${ticket.id}" data-link>Открыть</a><button class="btn tiny" data-live-action="close-ticket" data-ticket-id="${ticket.id}">Закрыть</button></span></div>`;
  });
  const rows = mixDemoRows("tickets", demoTickets.map(ticketListRow), liveRows);
  const openCount = liveItems("tickets").filter((ticket) => ["open", "waiting_support"].includes(ticket.status)).length || demoTickets.filter((ticket) => ticket.status !== "Закрыт").length;
  return page("Тикеты поддержки", `<div class="layout"><aside class="sidebar">${sideLinks(adminLinks)}</aside><section>
    <div class="grid metrics">${[
      [openCount, "требуют ответа"],
      [liveItems("tickets").length || demoTickets.length, "всего тикетов"],
      ["Telegram", "уведомления"],
      ["24/7", "очередь поддержки"],
    ].map(([value, label]) => `<div class="metric panel"><strong>${value}</strong><span>${label}</span></div>`).join("")}</div>
    <section class="panel section"><div class="section-head"><div><h2>Очередь обращений</h2><p class="muted">Сначала закрывайте оплату и споры, затем общие вопросы.</p></div><button class="btn" data-live-sync>Обновить</button></div><div class="list">${rows.length ? rows.join("") : emptyAdminState("Тикетов пока нет")}</div></section>
  </section></div>`, "Admin");
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
  const example = window.SECMARKET_FEES.calculateCommission(100);
  return page("Комиссии платформы", `<div class="layout"><aside class="sidebar">${sideLinks(adminLinks)}</aside><section class="panel"><h2>Правила комиссий</h2><div class="form-grid">${field("Сбор покупателя", "input", "2% сверху")}${field("Комиссия продавца", "input", "4% удержание")}${field("Минимальная общая комиссия", "input", "0.20 USDT")}${field("TRC20 сеть", "input", "ручная выплата")}${field("TON сеть", "input", "ручная выплата")}${field("BEP20 сеть", "input", "ручная выплата")}</div><section class="section"><h2>Примеры</h2><div class="list">${[
    ["Цена товара", `${money(example.itemAmount)} · заказ хранит эту сумму`],
    ["Покупатель платит", `${money(example.buyerTotal)} · включая ${money(example.buyerFee)} сбора`],
    ["Продавцу начисляется", `${money(example.sellerNet)} · после ${money(example.sellerFee)} комиссии`],
    ["Доход платформы", money(example.platformFeeTotal)],
    ["До подтверждения", "в холде"],
    ["После завершения", "доступно к выводу"],
  ].map(([left, right]) => row(left, right)).join("")}</div></section></section></div>`, "Admin");
}

function adminPromocodes() {
  const promoRows = window.SECMARKET_DATA.promoCodes.map((promo) => `<div class="list-row"><span>${promo.code}<br><span class="muted">${promo.title} · ${promo.description}</span></span><span class="status ${promo.status === "active" ? "ok" : "wait"}">${promo.role === "seller" ? "продавец" : "покупатель"}</span></div>`);
  return page("Промокоды", `<div class="layout"><aside class="sidebar">${sideLinks(adminLinks)}</aside><section class="panel"><div class="section-head"><div><h2>Регистрационные промокоды</h2><p class="muted">Код проверяется при регистрации и сохраняется в профиле пользователя.</p></div><span class="status ok">MVP</span></div><div class="list">${promoRows.join("")}</div><section class="section"><h2>Правила</h2><div class="list">${["Пустое поле промокода разрешено", "Неверный код блокирует регистрацию", "Код покупателя не подходит продавцу и наоборот", "Промокод уходит в Telegram-уведомление без пароля"].map(row).join("")}</div></section></section></div>`, "Admin");
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
      ["Последняя транзакция", "2 мин назад"],
      ["Ошибки сети", "0"],
      ["Просроченные платежи", "4"],
      ["Недостаточная сумма", "1"],
    ].map(([left, right]) => row(left, right)).join("")}</div></section>
  </section></div>`, "Admin");
}
