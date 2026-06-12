function uiIcon(name) {
  const icons = {
    search: '<circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path>',
    home: '<path d="m3 11 9-8 9 8"></path><path d="M5 10v10h14V10"></path><path d="M9 20v-6h6v6"></path>',
    catalog: '<rect width="7" height="7" x="3" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="14" rx="1"></rect><rect width="7" height="7" x="3" y="14" rx="1"></rect>',
    orders: '<path d="M4 4h16v16H4z"></path><path d="M8 9h8"></path><path d="M8 13h8"></path><path d="M8 17h5"></path>',
    chat: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path>',
    user: '<circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path>',
    star: '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.9-5.4 2.9 1-6-4.4-4.3 6.1-.9z"></path>',
    chevron: '<path d="m9 18 6-6-6-6"></path>',
    info: '<circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path>',
  };
  return `<svg class="ui-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icons[name] || icons.info}</svg>`;
}

function dashboard(title, links, rows, eyebrow = "Account") {
  return page(title, `<div class="layout"><aside class="sidebar">${sideLinks(links)}</aside><section class="panel"><h2>Обзор</h2><div class="list">${rows.map(row).join("")}</div></section></div>`, eyebrow);
}

function sideLinks(links) {
  return links.map((item, index) => {
    const label = Array.isArray(item) ? item[0] : item;
    const href = Array.isArray(item) ? item[1] : "#";
    const isActive = currentPath() === href || (index === 0 && currentPath() === href);
    return `<a class="side-link ${isActive ? "active" : ""}" href="${href}" data-link>${label}<span>${uiIcon("chevron")}</span></a>`;
  }).join("");
}

function field(label, type, value) {
  if (type === "select") return `<label class="field"><span>${label}</span><select>${value.map((x) => `<option>${x}</option>`).join("")}</select></label>`;
  if (type === "textarea") return `<label class="field"><span>${label}</span><textarea>${value}</textarea></label>`;
  return `<label class="field"><span>${label}</span><input value="${value}" /></label>`;
}

function option(value, label, selected) {
  return `<option value="${value}" ${String(value) === String(selected) ? "selected" : ""}>${label}</option>`;
}

function sortTab(value, label) {
  return `<button class="tab ${state.sort === value ? "active" : ""}" data-sort="${value}">${label}</button>`;
}

function row(left, right = "") {
  return `<div class="list-row"><span>${left}</span>${right ? `<strong>${right}</strong>` : "<span></span>"}</div>`;
}

function statusTone(status) {
  if (["Завершен", "Оплачено", "Закрыт", "Выполнен", "paid", "published", "completed", "approved", "posted", "refunded", "resolved_buyer", "resolved_seller"].includes(status)) return "ok";
  if (["Спор", "Отклонен", "Ошибка сети", "blocked", "rejected", "network_error", "underpaid"].includes(status)) return "bad";
  return "wait";
}

function statusLabel(status) {
  const labels = {
    awaiting_buyer: "ожидает подтверждения",
    awaiting_payment: "ожидает оплату",
    blocked: "заблокирован",
    completed: "завершен",
    confirming: "подтверждается",
    draft: "черновик",
    expired: "истек",
    found: "транзакция найдена",
    moderation: "на модерации",
    paid: "оплачен",
    paused: "пауза",
    processing: "в обработке",
    published: "опубликован",
    rejected: "отклонен",
    refunded: "возврат",
    review: "на проверке",
    sent: "отправлен",
    underpaid: "недоплата",
    waiting: "ожидает",
    waiting_support: "ожидает поддержку",
    need_more_data: "нужны данные",
    resolved_buyer: "решено в пользу покупателя",
    resolved_seller: "решено в пользу продавца",
    partial_refund: "частичный возврат",
  };
  return labels[status] || status || "—";
}

function orderListRow(orderItem) {
  return `<a class="list-row" href="/orders/${orderItem.id}" data-link><span>#${orderItem.id} · ${orderItem.product}<br><span class="muted">${orderItem.seller} · ${money(orderItem.amount)} · ${orderItem.delivery}</span></span><span class="status ${statusTone(orderItem.order)}">${orderItem.order}</span></a>`;
}

function paymentListRow(paymentItem) {
  return `<div class="list-row"><span>${paymentItem.amount.toFixed(2)} ${paymentItem.coin} · ${paymentItem.network}<br><span class="muted">#${paymentItem.order} · ${paymentItem.tx} · ${paymentItem.confirmations}</span></span><span class="status ${statusTone(paymentItem.status)}">${statusLabel(paymentItem.status)}</span></div>`;
}

function ticketListRow(ticket) {
  return `<a class="list-row" href="/support/tickets/${ticket.id}" data-link><span>#${ticket.id} · ${ticket.topic}<br><span class="muted">заказ #${ticket.order}</span></span><span class="status ${statusTone(ticket.status)}">${ticket.status}</span></a>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function slug(text) {
  return text.toLowerCase().replaceAll(" ", "-").replaceAll("/", "");
}

function pretty(slugText) {
  return decodeURIComponent(slugText || "").replaceAll("-", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}
