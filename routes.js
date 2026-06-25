const SECMARKET_ROUTES = [
  { path: "/", area: "public", title: "Главная" },
  { path: "/catalog", area: "catalog", title: "Каталог" },
  { path: "/catalog/roblox", area: "catalog", title: "Roblox" },
  { path: "/catalog/steam", area: "catalog", title: "Steam" },
  { path: "/catalog/telegram", area: "catalog", title: "Telegram" },
  { path: "/catalog/discord", area: "catalog", title: "Discord" },
  { path: "/catalog/minecraft", area: "catalog", title: "Minecraft" },
  { path: "/product/12345", area: "catalog", title: "Карточка товара" },
  { path: "/seller/pixeltrade", area: "seller-public", title: "Публичный продавец" },
  { path: "/login", area: "auth", title: "Вход" },
  { path: "/register", area: "auth", title: "Регистрация" },
  { path: "/auth", area: "auth", title: "Вход" },
  { path: "/checkout", area: "checkout", title: "Checkout" },
  { path: "/payment/order-id", area: "payment", title: "Оплата заказа" },
  { path: "/payment/12345", area: "payment", title: "Платеж #12345" },
  { path: "/payment/33412", area: "payment", title: "Платеж #33412" },
  { path: "/orders/12345", area: "orders", title: "Заказ #12345" },
  { path: "/orders/22341", area: "orders", title: "Заказ #22341" },
  { path: "/orders/33412", area: "orders", title: "Заказ #33412" },
  { path: "/orders/77102", area: "orders", title: "Заказ #77102" },
  { path: "/chats", area: "messages", title: "Чаты" },
  { path: "/notifications", area: "account", title: "Уведомления" },
  { path: "/account", area: "account", title: "Кабинет покупателя" },
  { path: "/account/orders", area: "account", title: "Мои заказы" },
  { path: "/account/favorites", area: "account", title: "Избранное" },
  { path: "/account/reviews", area: "account", title: "Отзывы" },
  { path: "/account/payments", area: "account", title: "История оплат" },
  { path: "/account/balance", area: "account", title: "Баланс" },
  { path: "/seller", area: "seller", title: "Кабинет продавца" },
  { path: "/seller/profile", area: "seller", title: "Профиль продавца" },
  { path: "/seller/products", area: "seller", title: "Товары продавца" },
  { path: "/seller/products/create", area: "seller", title: "Создать товар" },
  { path: "/seller/products/12345/edit", area: "seller", title: "Редактировать товар" },
  { path: "/seller/orders", area: "seller", title: "Заказы продавца" },
  { path: "/seller/finance", area: "seller", title: "Финансы продавца" },
  { path: "/seller/withdraw", area: "seller", title: "Вывод средств" },
  { path: "/seller/settings", area: "seller", title: "Настройки продавца" },
  { path: "/disputes", area: "support", title: "Споры" },
  { path: "/disputes/123", area: "support", title: "Спор #123" },
  { path: "/support", area: "support", title: "Поддержка" },
  { path: "/support/faq", area: "support", title: "FAQ поддержки" },
  { path: "/support/ticket", area: "support", title: "Создать тикет" },
  { path: "/support/tickets/SUP-104", area: "support", title: "Тикет #SUP-104" },
  { path: "/support/requests", area: "support", title: "Мои обращения" },
  { path: "/support/payment", area: "support", title: "Проблемы с оплатой" },
  { path: "/support/order", area: "support", title: "Проблемы с заказом" },
  { path: "/support/seller", area: "support", title: "Проблемы с продавцом" },
  { path: "/terms", area: "info", title: "Пользовательское соглашение" },
  { path: "/privacy", area: "info", title: "Политика конфиденциальности" },
  { path: "/contacts", area: "info", title: "Контакты" },
  { path: "/faq", area: "info", title: "FAQ" },
  { path: "/status-map", area: "info", title: "Карта статусов" },
  { path: "/backend-structure", area: "info", title: "Backend-ready структура" },
  { path: "/launch-readiness", area: "info", title: "Готовность к запуску" },
  { path: "/developers", area: "info", title: "Стать разработчиком" },
  { path: "/crypto-payment-guide", area: "info", title: "Инструкция по оплате" },
  { path: "/refund-policy", area: "info", title: "Политика возвратов" },
  { path: "/seller-rules", area: "info", title: "Правила продавцов" },
  { path: "/buyer-rules", area: "info", title: "Правила покупателей" },
  { path: "/fees", area: "info", title: "Комиссии" },
  { path: "/admin", area: "admin", title: "Админ-панель" },
  { path: "/admin/users", area: "admin", title: "Пользователи" },
  { path: "/admin/sellers", area: "admin", title: "Продавцы" },
  { path: "/admin/products", area: "admin", title: "Товары" },
  { path: "/admin/orders", area: "admin", title: "Заказы" },
  { path: "/admin/payments", area: "admin", title: "Платежи" },
  { path: "/admin/payments/pay-12345", area: "admin", title: "Платеж pay-12345" },
  { path: "/admin/payouts", area: "admin", title: "Выплаты" },
  { path: "/admin/payouts/WD-120", area: "admin", title: "Выплата WD-120" },
  { path: "/admin/operations", area: "admin", title: "Operations" },
  { path: "/admin/disputes", area: "admin", title: "Споры" },
  { path: "/admin/tickets", area: "admin", title: "Тикеты" },
  { path: "/admin/developers", area: "admin", title: "Разработчики" },
  { path: "/admin/categories", area: "admin", title: "Категории" },
  { path: "/admin/promocodes", area: "admin", title: "Промокоды" },
  { path: "/admin/fees", area: "admin", title: "Комиссии" },
  { path: "/admin/transactions", area: "admin", title: "Балансы" },
  { path: "/admin/crypto", area: "admin", title: "Крипто-платежи" },
  { path: "/admin/audit", area: "admin", title: "Журнал аудита" },
  { path: "/admin/moderation", area: "admin", title: "Модерация" },
];

function routesByArea() {
  return SECMARKET_ROUTES.reduce((areas, route) => {
    areas[route.area] ||= [];
    areas[route.area].push(route);
    return areas;
  }, {});
}

function allowedRolesFor(path) {
  const route = SECMARKET_ROUTES.find((item) => item.path === path);
  if (route?.roles) return route.roles;
  if (path.startsWith("/admin")) return ["admin"];
  if (path.startsWith("/seller")) return ["seller", "admin"];
  if (path.startsWith("/account") || path.startsWith("/orders") || path.startsWith("/chats") || path.startsWith("/disputes")) return ["buyer", "seller", "admin"];
  return ["guest", "buyer", "seller", "admin"];
}

window.SECMARKET_ROUTES = SECMARKET_ROUTES;
window.SECMARKET_ROUTE_HELPERS = {
  allowedRolesFor,
  routesByArea,
};
