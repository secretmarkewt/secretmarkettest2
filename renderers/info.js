const infoPageCopy = {
  "/terms": ["Пользовательское соглашение", "Правила безопасной сделки, покупки цифровых товаров, статусы заказов и ответственность сторон."],
  "/privacy": ["Политика конфиденциальности", "Какие данные нужны для заказов, чатов, платежей, поддержки и безопасной работы аккаунта."],
  "/refund-policy": ["Политика возвратов", "Возвраты рассматриваются через спор с учетом статуса выдачи, оплаты и доказательств сторон."],
  "/seller-rules": ["Правила продавцов", "Точные описания, честные сроки, рабочие товары и запрет повторной продажи уже выданных данных."],
  "/buyer-rules": ["Правила покупателей", "Оплата только выбранной сетью, проверка товара после получения и корректное ведение спора."],
  "/crypto-payment-guide": ["Инструкция по оплате криптой", "Как оплатить заказ в USDT TRC20, TON или BEP20 и не потерять платеж из-за неверной сети."],
  "/fees": ["Комиссии", "Прозрачная модель комиссий платформы, сетевых сборов и выплат продавцам."],
  "/contacts": ["Контакты", "Поддержка работает через тикеты, спор по заказу и системный чат."],
  "/faq": ["FAQ", "Ответы по оплате, выдаче, спорам, возвратам, статусам и ручным выплатам."],
  "/status-map": ["Карта статусов", "Основные статусы оплаты, заказов, средств продавца и выплат."],
  "/backend-structure": ["Backend-ready структура", "Сущности, API-контракт и правила доступа, которые уже заложены в MVP."],
  "/launch-readiness": ["Готовность к запуску", "Чеклист MVP-запуска, live API, GitHub Pages, CI и production-блокеров."],
};

function info(path) {
  if (path === "/status-map") return statusMap();
  if (path === "/backend-structure") return backendStructure();
  if (path === "/launch-readiness") return launchReadiness();
  const data = infoPageCopy[path] || ["Страница", "Раздел будет добавлен позже."];
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

function releaseReadinessData() {
  const apiBaseUrl = api.getApiBaseUrl();
  const liveConnected = state.liveStatus === "connected";
  const liveProvider = liveProviderName();
  const hasLive = hasLiveProvider();
  const publicEndpoint = api.isSupabaseEnabled?.() ? window.SECMARKET_CONFIG?.supabaseUrl : apiBaseUrl;
  const mvpItems = [
    ["Frontend Pages build", true, "dist собирается через scripts/build-pages.js и публикует статические файлы"],
    ["CI verification", true, "npm run verify проверяет маршруты, сборку, backend-контракт, Pages assets и 404"],
    ["Live API contract", true, "товары, заказы, платежи, выдача, споры, выплаты и audit покрыты проверками"],
    ["Live provider", hasLive, `${liveProvider}: ${publicEndpoint || "не настроен"}`],
    ["API health", liveConnected, `текущий статус: ${state.liveStatus}`],
    ["Data fallback", true, productionDataMode() ? "используются live-данные" : "до подключения API показываются локальные демо-данные"],
    ["Backend safety", true, "CORS allowlist, disabled reset, rate limit и security headers добавлены"],
  ];
  const productionItems = [
    ["Password auth", false, "нужны hash паролей, восстановление, сессии и 2FA для реальных аккаунтов"],
    ["Real payment watchers", false, "нужны TRC20, TON и BEP20 workers вместо mock sync"],
    ["Production database", false, "JSON store подходит для MVP, но не для реальных денег"],
    ["Encrypted delivery secrets", false, "автовыдачу нужно шифровать до production"],
    ["Evidence storage", false, "нужны файлы для споров, тикетов и risk review"],
    ["Operations", false, "нужны backup, monitoring, payout batching и refund tooling"],
  ];
  const metrics = state.liveHealth?.metrics || {};
  const metricItems = [
    [metrics.onlineUsers ?? "demo", "онлайн"],
    [metrics.publishedProducts ?? "demo", "товаров live"],
    [metrics.completedOrders ?? "demo", "завершено"],
    [state.liveStatus, "статус API"],
  ];
  return { apiBaseUrl, hasLive, liveConnected, liveProvider, mvpItems, productionItems, metricItems, publicEndpoint };
}

function releaseMetricCards() {
  const { metricItems } = releaseReadinessData();
  return `<div class="grid metrics">${metricItems.map(([value, label]) => `<div class="metric panel"><strong>${value}</strong><span>${label}</span></div>`).join("")}</div>`;
}

function releaseReadinessPanel(compact = false) {
  const { hasLive, liveConnected, liveProvider, mvpItems, productionItems, publicEndpoint } = releaseReadinessData();
  const blockers = productionItems.filter(([, ready]) => !ready);
  const shownMvpItems = compact ? mvpItems.slice(3) : mvpItems;
  return `<section class="panel release-panel">
    <div class="section-head"><div><h2>Релизный статус</h2><p class="muted">${liveProvider}: ${publicEndpoint || "не настроен"}</p></div><span class="status ${hasLive && liveConnected ? "ok" : "wait"}">${hasLive && liveConnected ? "live" : "setup"}</span></div>
    ${releaseMetricCards()}
    <div class="list section">${shownMvpItems.map(([label, ready, detail]) => readinessItem(label, ready, detail)).join("")}</div>
    ${compact ? `<p class="muted section">До production осталось закрыть ${blockers.length} блокеров. Подробный список в разделе готовности к запуску.</p><a class="btn" href="/launch-readiness" data-link>Открыть чеклист</a>` : ""}
  </section>`;
}

function launchReadiness() {
  const { hasLive, liveConnected, mvpItems, productionItems } = releaseReadinessData();
  return page("Готовность к запуску", `<div class="two-col">
    <section class="panel"><div class="section-head"><div><h2>MVP запуск</h2><p class="muted">Что нужно, чтобы показать рабочее демо на GitHub Pages с live backend.</p></div><span class="status ${hasLive && liveConnected ? "ok" : "wait"}">${hasLive && liveConnected ? "ready" : "connect API"}</span></div><div class="list section">${mvpItems.map(([label, ready, detail]) => readinessItem(label, ready, detail)).join("")}</div></section>
    <aside class="panel"><h2>Production блокеры</h2><div class="list section">${productionItems.map(([label, ready, detail]) => readinessItem(label, ready, detail)).join("")}</div></aside>
    ${releaseReadinessPanel(true)}
    <section class="panel section"><h2>Следующие действия</h2><div class="list">${[
      ["1", "Дождаться GitHub Actions verify и Pages deploy после каждого пуша"],
      ["2", "Проверить live provider: Supabase или backend API"],
      ["3", "Пройти вручную checkout, оплату, выдачу, спор и вывод"],
      ["4", "Перед реальными деньгами заменить mock payment sync на watchers"],
      ["5", "Включить production-хранилище и шифрование данных выдачи"],
    ].map(([left, right]) => row(left, right)).join("")}</div></section>
  </div>`, "Launch");
}

function backendStructure() {
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
  const endpoints = [
    ["POST /api/auth/login", "вход по email и паролю, выдача session token"],
    ["POST /api/auth/register", "регистрация с безопасным уведомлением в Telegram"],
    ["GET /api/products", "каталог, фильтры, категории и live-синхронизация"],
    ["POST /api/products", "создание товара продавцом"],
    ["POST /api/orders", "создание заказа и escrow"],
    ["POST /api/payments", "создание crypto invoice"],
    ["POST /api/orders/:id/deliver", "выдача товара после подтверждения оплаты"],
    ["POST /api/orders/:id/confirm", "подтверждение получения и release escrow"],
    ["POST /api/disputes", "открытие спора покупателем"],
    ["PATCH /api/disputes/:id/decision", "решение поддержки и возврат"],
    ["POST /api/tickets", "тикет поддержки и Telegram-уведомление"],
    ["POST /api/withdrawals", "заявка продавца на вывод"],
    ["POST /api/withdrawals/:id/settle", "админ завершает выплату и пишет payout ledger"],
    ["GET /api/audit", "журнал действий API"],
  ];
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
    <section class="panel section"><h2>Backend endpoints</h2><div class="list">${endpoints.map(([endpoint, description]) => row(endpoint, description)).join("")}</div></section>
  </section><aside class="panel"><h2>Файлы структуры</h2><div class="list">${[
    ["data.js", "демо-коллекции и сиды"],
    ["routes.js", "единый manifest страниц"],
    ["models.js", "схемы User, Product, Order, Payment"],
    ["api.js", "mock CRUD, localStorage и live API fallback"],
    ["validation.js", "правила форм и API payload"],
    ["renderers/", "страницы каталога, заказов, продавца, поддержки и админки"],
  ].map(([left, right]) => row(left, right)).join("")}</div><section class="section"><h2>Validation rules</h2><div class="list">${Object.entries(validationRules).map(([name, description]) => row(name, description)).join("")}</div></section></aside></div>`, "Info");
}

function infoRows(path) {
  const common = ["Безопасная сделка", "Оплата заказа", "Чат по заказу", "История действий", "Поддержка и споры"];
  const map = {
    "/crypto-payment-guide": ["Выберите USDT TRC20, TON или BEP20", "Отправьте точную сумму", "Проверьте сеть перед отправкой", "Дождитесь подтверждений", "Не отправляйте BTC или ETH на адрес USDT"],
    "/refund-policy": ["Возврат открывается через спор", "Средства блокируются до решения", "Возможен частичный возврат", "Данные автовыдачи проверяются поддержкой", "Закрытый заказ без спора считается подтвержденным"],
    "/seller-rules": ["Точное описание товара", "Запрет повторной продажи кодов", "Срок выполнения обязателен", "Чат только внутри заказа", "Выплаты после завершения заказа"],
    "/buyer-rules": ["Оплата только выбранной сетью", "Проверка товара перед подтверждением", "Не передавайте лишние данные", "Спор открывается со страницы заказа", "Отзывы только после покупки"],
    "/fees": ["Покупатель платит сервисный сбор сверху", "Комиссия продавца удерживается при завершении сделки", "Сетевая комиссия вывода удерживается из суммы вывода", "Выплаты продавцам проходят через ledger", "Ставки комиссии документируются в админке"],
    "/terms": ["Пользователь принимает правила безопасной сделки", "Платформа удерживает средства до завершения заказа", "Чаты и споры ведутся внутри заказа", "Администратор может заморозить средства при споре", "Запрещены мошеннические товары и повторная продажа кодов"],
    "/privacy": ["Хранятся email, Telegram и история заказов", "Платежные данные включают сеть, адрес и tx hash", "Данные выдачи доступны только участникам заказа и поддержке", "Файлы из спора используются только для решения обращения", "Пароли и 2FA должны храниться отдельно на backend-этапе"],
    "/contacts": ["Поддержка: через /support/ticket", "Споры: через страницу заказа", "Продавцы: через чат заказа", "Административные вопросы: через тикет", "Экстренные платежи: приложите tx hash"],
    "/faq": ["Как оплатить: выберите сеть и отправьте точную сумму", "Когда выдается товар: после подтверждения оплаты", "Когда продавец получает деньги: после завершения заказа", "Что делать при ошибке сети: создать тикет с tx hash", "Как открыть спор: со страницы заказа"],
  };
  return map[path] || common;
}
