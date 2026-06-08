function info(path) {
  if (path === "/status-map") return statusMap();
  if (path === "/backend-structure") return backendStructure();
  if (path === "/launch-readiness") return launchReadiness();
  const data = window.SECMARKET_DATA.infoPages[path] || ["Страница", "Раздел будет добавлен позже."];
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

function readinessItem(label, ready, detail) {
  return `<div class="list-row"><span>${label}<br><span class="muted">${detail}</span></span><span class="status ${ready ? "ok" : "wait"}">${ready ? "готово" : "нужно"}</span></div>`;
}

function launchReadiness() {
  const apiBaseUrl = api.getApiBaseUrl();
  const liveConnected = state.liveStatus === "connected";
  const hasApiUrl = Boolean(apiBaseUrl && !apiBaseUrl.includes("127.0.0.1"));
  const mvpItems = [
    ["Frontend Pages build", true, "dist собирается через scripts/build-pages.js и публикует только статические файлы"],
    ["CI verification", true, "GitHub Actions запускает npm run verify до Pages deploy"],
    ["Live API contract", true, "товары, заказы, платежи, выдача, споры, выплаты и audit покрыты verify"],
    ["API health", liveConnected, `текущий статус: ${state.liveStatus}`],
    ["Public API URL", hasApiUrl, apiBaseUrl],
    ["Backend safety", true, "CORS allowlist, disabled reset, rate limit и security headers добавлены"],
  ];
  const productionItems = [
    ["Password auth", false, "нужны hash паролей, регистрация, восстановление и 2FA"],
    ["Real payment watchers", false, "нужны TRC20, TON и BEP20 workers вместо mock sync"],
    ["Production database", false, "JSON store подходит для MVP, но не для реальных денег"],
    ["Encrypted delivery secrets", false, "автовыдачу нужно шифровать до production"],
    ["Evidence storage", false, "нужны файлы для споров, тикетов и risk review"],
    ["Operations", false, "нужны backup, monitoring, payout batching и refund tooling"],
  ];
  return page("Готовность к запуску", `<div class="two-col">
    <section class="panel"><div class="section-head"><div><h2>MVP запуск</h2><p class="muted">Что нужно, чтобы показать рабочее демо на GitHub Pages с live backend.</p></div><span class="status ${hasApiUrl && liveConnected ? "ok" : "wait"}">${hasApiUrl && liveConnected ? "ready" : "connect API"}</span></div><div class="list section">${mvpItems.map(([label, ready, detail]) => readinessItem(label, ready, detail)).join("")}</div></section>
    <aside class="panel"><h2>Production блокеры</h2><div class="list section">${productionItems.map(([label, ready, detail]) => readinessItem(label, ready, detail)).join("")}</div></aside>
    <section class="panel section"><h2>Следующие действия</h2><div class="list">${[
      ["1", "Закоммитить и запушить текущие изменения"],
      ["2", "Дождаться GitHub Actions verify и Pages deploy"],
      ["3", "Развернуть backend API через render.yaml или аналог"],
      ["4", "Вписать публичный API URL в config.js"],
      ["5", "Проверить checkout, оплату, выдачу, спор и вывод"],
    ].map(([left, right]) => row(left, right)).join("")}</div></section>
  </div>`, "Launch");
}

function backendStructure() {
  const data = window.SECMARKET_DATA;
  const api = window.SECMARKET_API;
  const models = window.SECMARKET_MODELS;
  const routes = window.SECMARKET_ROUTES;
  const routeHelpers = window.SECMARKET_ROUTE_HELPERS;
  const sessionApi = window.SECMARKET_SESSION;
  const validationRules = window.SECMARKET_VALIDATION_RULES;
  const snapshot = api.getSnapshot();
  const modelRows = Object.entries(models).map(([modelName, schema]) => [modelName, schema.fields.join(", ")]);
  const session = sessionApi.currentSession();
  const routeAreas = routes.reduce((areas, route) => {
    areas[route.area] = (areas[route.area] || 0) + 1;
    return areas;
  }, {});
  const routeRoles = routes.reduce((roles, route) => {
    routeHelpers.allowedRolesFor(route.path).forEach((role) => {
      roles[role] = (roles[role] || 0) + 1;
    });
    return roles;
  }, {});
  return page("Backend-ready структура", `<div class="two-col"><section>
    <section class="panel"><h2>Модели</h2><div class="list">${modelRows.map(([modelName, fields]) => row(modelName, fields)).join("")}</div></section>
    <section class="panel section"><h2>Session</h2><div class="list">${[
      ["Роль", sessionApi.roleLabel(session.role)],
      ["Пользователь", session.user?.name || "Гость"],
      ["Статус", session.user?.status || "demo"],
    ].map(([left, right]) => row(left, right)).join("")}</div></section>
    <section class="panel section"><h2>Mock API snapshot</h2><div class="grid metrics">${Object.entries(snapshot).map(([name, count]) => `<div class="metric panel"><strong>${count}</strong><span>${name}</span></div>`).join("")}</div></section>
    <section class="panel section"><h2>Route manifest</h2><div class="grid metrics">${Object.entries(routeAreas).map(([area, count]) => `<div class="metric panel"><strong>${count}</strong><span>${area}</span></div>`).join("")}</div></section>
    <section class="panel section"><h2>Route access</h2><div class="grid metrics">${Object.entries(routeRoles).map(([role, count]) => `<div class="metric panel"><strong>${count}</strong><span>${sessionApi.roleLabel(role)}</span></div>`).join("")}</div></section>
    <section class="panel section"><h2>Backend endpoints</h2><div class="list">${data.apiEndpoints.map(([endpoint, description]) => row(endpoint, description)).join("")}</div></section>
  </section><aside class="panel"><h2>Файлы структуры</h2><div class="list">${[
    ["data.js", "демо-коллекции и сиды"],
    ["routes.js", "единый manifest страниц"],
    ["models.js", "схемы User, Product, Order, Payment"],
    ["api.js", "mock CRUD и localStorage до backend"],
    ["validation.js", "правила форм и API payload"],
    ["renderers/", "следующий шаг: страницы каталога, заказов, продавца, админки"],
  ].map(([left, right]) => row(left, right)).join("")}</div><section class="section"><h2>Validation rules</h2><div class="list">${Object.entries(validationRules).map(([name, description]) => row(name, description)).join("")}</div></section><section class="section"><h2>Старый список</h2><div class="list">${data.dataModels.map(([model, fields]) => row(model, fields)).join("")}</div></section></aside></div>`, "Info");
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
