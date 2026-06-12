function bind() {
  document.querySelectorAll("[data-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      go(link.getAttribute("href"));
    });
  });
  document.querySelector("[data-currency]")?.addEventListener("click", () => {
    currency = currency === "USDT" ? "USD" : "USDT";
    saveState();
    render();
  });
  document.querySelector("[data-currency-select]")?.addEventListener("change", (event) => {
    currency = event.target.value;
    saveState();
    render();
  });
  document.querySelector("[data-theme-toggle]")?.addEventListener("click", () => {
    toggleTheme();
  });
  document.querySelector("[data-search-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    setSearch(new FormData(event.currentTarget).get("query") || "");
  });
  document.querySelector("[data-login-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const role = event.submitter?.dataset.loginRole || formData.get("role") || "buyer";
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    try {
      const session = await api.live.login(email, role, password);
      if (sessionApi.loginUser) sessionApi.loginUser(session.user, role);
      else sessionApi.loginAs(session.user?.role || role);
      notify(session.provider === "supabase" ? "Вход выполнен через Supabase" : `Вход выполнен: ${sessionApi.roleLabel(role)} · live API подключен`);
      if (session.user?.role === "seller") go("/seller");
      else if (session.user?.role === "admin") go("/admin");
      else go("/account");
    } catch (error) {
      notify(`Вход не выполнен: ${error.message}`);
    }
  });
  document.querySelectorAll("[data-login-role]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (button.closest("[data-login-form]")) return;
      const role = button.dataset.loginRole;
      sessionApi.loginAs(role);
      try {
        await loginLiveRole(role);
        notify(`Вход выполнен: ${sessionApi.roleLabel(role)} · live API подключен`);
      } catch (error) {
        notify(`Вход выполнен локально, API: ${error.message}`);
      }
      if (role === "seller") go("/seller");
      else if (role === "admin") go("/admin");
      else go("/account");
    });
  });
  document.querySelector("[data-logout]")?.addEventListener("click", async () => {
    try {
      await api.live.logout();
    } catch {
      api.setAuthToken("");
    }
    sessionApi.logout();
    notify("Вы вышли из демо-сессии");
    go("/");
  });
  document.querySelector("[data-register-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      telegram: formData.get("telegram"),
      role: formData.get("role"),
    };
    try {
      const session = await api.live.register(payload);
      if (sessionApi.loginUser) sessionApi.loginUser(session.user, payload.role);
      else sessionApi.loginAs(session.user.role);
      notify(session.registrationNotice?.sent ? "Регистрация создана и отправлена в Telegram" : session.provider === "supabase" ? "Регистрация создана через Supabase, Telegram secret нужно проверить" : "Регистрация создана, Telegram уведомление не настроено");
      go(session.user.role === "seller" ? "/seller" : "/account");
    } catch (error) {
      notify(`Регистрация не выполнена: ${error.message}`);
    }
  });
  document.querySelector("[data-support-ticket-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const orderId = String(formData.get("orderId") || "").replace(/^#/, "").trim();
    const payload = {
      id: `SUP-${Date.now()}`,
      orderId: orderId || "general",
      buyerId: sessionApi.currentSession().user?.id || "usr-buyer",
      topic: formData.get("topic"),
      description: formData.get("description"),
      contact: formData.get("contact"),
      messages: [],
      status: "open",
    };
    try {
      await ensureLiveRole("buyer");
      const ticket = await api.live.create("tickets", payload);
      upsertLiveItem("tickets", ticket);
      notify(ticket.ticketNotice?.sent ? "Тикет создан и отправлен в Telegram" : "Тикет создан, Telegram уведомление не настроено");
      go("/support/requests");
    } catch (error) {
      notify(`Тикет не создан: ${error.message}`);
    }
  });
  document.querySelectorAll("[data-filter]").forEach((control) => {
    control.addEventListener("change", (event) => {
      const key = event.target.dataset.filter;
      state[key] = key === "maxPrice" ? Number(event.target.value || 100) : event.target.value;
      render();
    });
  });
  document.querySelectorAll("[data-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      state.sort = button.dataset.sort;
      render();
    });
  });
  document.querySelectorAll("[data-favorite]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const id = Number(button.dataset.favorite);
      if (state.favorites.has(id)) state.favorites.delete(id);
      else state.favorites.add(id);
      saveState();
      render();
    });
  });
  document.querySelector("[data-reset-filters]")?.addEventListener("click", () => {
    state.query = "";
    state.maxPrice = 100;
    state.delivery = "all";
    state.rating = "4.8";
    state.sort = "popular";
    render();
  });
  document.querySelector("[data-copy-address]")?.addEventListener("click", async () => {
    state.copiedAddress = true;
    saveState();
    const address = document.querySelector("[data-copy-address]")?.dataset.copyAddress || "";
    try {
      await navigator.clipboard?.writeText(address);
      notify("Адрес оплаты скопирован");
    } catch {
      notify("Адрес отмечен как скопированный");
    }
  });
  document.querySelector("[data-confirm-order]")?.addEventListener("click", async () => {
    try {
      await ensureLiveRole("buyer");
      const id = currentPath().split("/").pop();
      const result = await api.live.confirmOrder(id);
      upsertLiveItem("orders", result.order);
      if (result.ledgerEntry) upsertLiveItem("ledger", result.ledgerEntry);
      state.orderConfirmed = true;
      saveState();
      notify(result.alreadyConfirmed ? "Заказ уже был подтвержден в API" : "Получение подтверждено через API, escrow освобожден");
    } catch (error) {
      notify(`Не удалось подтвердить заказ: ${error.message}`);
    }
  });
  document.querySelector("[data-open-dispute]")?.addEventListener("click", async () => {
    try {
      await ensureLiveRole("buyer");
      const orderId = currentPath().split("/").pop();
      const orderItem = orderById(orderId);
      const dispute = await api.live.create("disputes", {
        id: `DSP-${Date.now()}`,
        orderId,
        buyerId: sessionApi.currentSession().user?.id || "usr-buyer",
        sellerId: orderItem.seller || "usr-seller",
        reason: "Товар не работает",
        evidence: [],
        decision: "",
        refundAmount: 0,
        status: "waiting_support",
      });
      const order = await api.live.update("orders", orderId, {
        orderStatus: "dispute",
        status: "dispute",
        escrowStatus: "hold",
      });
      upsertLiveItem("disputes", dispute);
      upsertLiveItem("orders", order);
      state.disputeCreated = true;
      saveState();
      notify("Спор создан через API, средства остаются в escrow");
      go("/disputes");
    } catch (error) {
      notify(`Не удалось открыть спор: ${error.message}`);
    }
  });
  document.querySelector("[data-chat-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = event.currentTarget.querySelector("input");
    const message = input.value.trim();
    if (!message) return;
    state.chatMessages.push(message);
    saveState();
    notify("Сообщение отправлено в чат заказа");
    render();
  });
  document.querySelector("[data-file-action]")?.addEventListener("click", () => {
    notify("В MVP файл прикрепляется через тикет или чат заказа");
  });
  document.querySelector("[data-reset-demo]")?.addEventListener("click", () => {
    resetDemoState();
  });
  document.querySelector("[data-api-settings-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const value = new FormData(form).get("apiBaseUrl") || "";
    const nextUrl = api.setApiBaseUrl(value);
    notify(`API адрес сохранен: ${nextUrl}`);
    render();
  });
  document.querySelector("[data-api-health-check]")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    const previousText = button.textContent;
    button.disabled = true;
    button.textContent = "Проверка...";
    try {
      const health = await api.live.health();
      notify(health.ok ? `API доступен: ${api.getApiBaseUrl()}` : "API ответил, но health не OK");
    } catch (error) {
      notify(`API недоступен: ${error.message}`);
    } finally {
      button.disabled = false;
      button.textContent = previousText;
    }
  });
  document.querySelector("[data-clear-api-token]")?.addEventListener("click", () => {
    api.setAuthToken("");
    notify("Live API токен сброшен");
    render();
  });
  document.querySelector("[data-live-sync]")?.addEventListener("click", async () => {
    await syncLiveData({ notify: true });
  });
  document.querySelectorAll("[data-step]").forEach((button) => button.addEventListener("click", () => {
    activeStep = Number(button.dataset.step);
    render();
  }));
  document.querySelector("[data-step-next]")?.addEventListener("click", () => {
    activeStep = Math.min(4, activeStep + 1);
    render();
  });
  document.querySelector("[data-step-prev]")?.addEventListener("click", () => {
    activeStep = Math.max(1, activeStep - 1);
    render();
  });
  document.querySelectorAll("[data-live-action]").forEach((button) => {
    button.addEventListener("click", () => runLiveAction(button));
  });
  bindHeroCursorGlow();
}

function bindHeroCursorGlow() {
  const hero = document.querySelector("[data-cursor-glow]");
  if (!hero || !matchMedia("(pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let frame = 0;
  const setGlow = (event) => {
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const rect = hero.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      hero.style.setProperty("--hero-glow-x", `${Math.max(0, Math.min(100, x))}%`);
      hero.style.setProperty("--hero-glow-y", `${Math.max(0, Math.min(100, y))}%`);
      hero.style.setProperty("--hero-glow-opacity", "1");
    });
  };

  hero.addEventListener("pointermove", setGlow);
  hero.addEventListener("pointerleave", () => {
    hero.style.setProperty("--hero-glow-opacity", "0.72");
  });
}

const liveDemoUsers = {
  admin: "support@example.com",
  buyer: "buyer@example.com",
  seller: "seller@example.com",
};

async function loginLiveRole(role) {
  const email = liveDemoUsers[role];
  if (!email) throw new Error("роль не поддерживается live API");
  return api.live.login(email, role);
}

async function ensureLiveRole(role) {
  if (api.isSupabaseEnabled?.()) {
    if (!api.getAuthToken()) throw new Error("сначала войдите в аккаунт");
    const activeRole = sessionApi.currentSession().role;
    if (activeRole !== role) throw new Error(`нужна роль: ${sessionApi.roleLabel(role)}`);
    return api.getAuthToken();
  }
  if (api.getAuthToken() && sessionApi.currentSession().role === role) return api.getAuthToken();
  await loginLiveRole(role);
  return api.getAuthToken();
}

async function runLiveAction(button) {
  const action = button.dataset.liveAction;
  const previousText = button.textContent;
  button.disabled = true;
  button.textContent = "Выполняется...";

  try {
    if (action === "create-checkout") {
      await ensureLiveRole("buyer");
      const buyerId = sessionApi.currentSession().user?.id || "usr-buyer";
      const orderId = `ord-${Date.now()}`;
      const order = await api.live.create("orders", {
        id: orderId,
        buyerId,
        sellerId: "usr-seller",
        productId: 12345,
        amount: 88.3,
        paymentStatus: "waiting",
        orderStatus: "awaiting_payment",
        escrowStatus: "hold",
        status: "awaiting_payment",
      });
      const payment = await api.live.create("payments", {
        id: `pay-${order.id}`,
        orderId: order.id,
        buyerId,
        sellerId: order.sellerId,
        amount: order.amount,
        coin: "USDT",
        network: "TRC20",
        address: window.SECMARKET_DATA.paymentWallets.TRC20,
        confirmations: 0,
        status: "waiting",
      });
      upsertLiveItem("orders", order);
      upsertLiveItem("payments", payment);
      go(`/payment/${order.id}`);
      notify(`Заказ #${order.id} создан, счет готов к оплате`);
    } else if (action === "create-product") {
      await ensureLiveRole("seller");
      const sellerId = sessionApi.currentSession().user?.id || "usr-seller";
      const product = await api.live.create("products", {
        sellerId,
        title: "Discord Nitro 1 мес",
        category: "discord",
        price: 8.5,
        stock: 10,
        deliveryType: "auto",
        status: "moderation",
      });
      upsertLiveItem("products", product);
      notify(`Товар #${product.id} создан и отправлен на модерацию`);
    } else if (action === "request-withdrawal") {
      await ensureLiveRole("seller");
      const sellerId = sessionApi.currentSession().user?.id || "usr-seller";
      const result = await api.live.requestWithdrawal({
        sellerId,
        amount: 25,
        coin: "USDT",
        network: "TRC20",
        address: "TYJmyeYEVHpF2CEZTXheWp1kM6zVUoeWsB",
      });
      upsertLiveItem("withdrawals", result.withdrawal);
      notify(`Вывод ${result.withdrawal.id} создан: ${result.withdrawal.status}`);
    } else if (action === "sync-payment") {
      await ensureLiveRole("admin");
      const id = button.dataset.paymentId || currentPath().split("/").pop();
      const result = await api.live.syncPayment(id, { txHash: `TX-LIVE-${Date.now()}`, confirmations: 24 });
      upsertLiveItem("payments", result.payment);
      upsertLiveItem("orders", result.order);
      notify(`Платеж ${result.payment.id}: ${result.payment.status}`);
    } else if (action === "issue-delivery") {
      await ensureLiveRole("seller");
      const id = button.dataset.orderId || currentPath().split("/").pop();
      const result = await api.live.issueDelivery(id);
      upsertLiveItem("deliveries", result.delivery);
      upsertLiveItem("orders", result.order);
      upsertLiveItem("products", result.product);
      notify(result.alreadyIssued ? "Выдача уже была создана" : `Товар выдан по заказу #${id}`);
    } else if (action === "resolve-dispute") {
      await ensureLiveRole("admin");
      const disputeId = button.dataset.disputeId || currentPath().split("/").pop();
      const orderId = button.dataset.orderId;
      const dispute = await api.live.update("disputes", disputeId, {
        status: "resolved_buyer",
        decision: "Support resolved in favor of buyer",
        refundAmount: 35,
      });
      upsertLiveItem("disputes", dispute);
      if (orderId) {
        const order = await api.live.update("orders", orderId, {
          orderStatus: "refunded",
          status: "refunded",
          escrowStatus: "refunded",
        });
        upsertLiveItem("orders", order);
      }
      notify(`Спор #${dispute.id} решен: ${statusLabel(dispute.status)}`);
    } else if (action === "settle-withdrawal") {
      await ensureLiveRole("admin");
      const id = button.dataset.withdrawalId || currentPath().split("/").pop();
      const result = await api.live.settleWithdrawal(id, { txHash: `TX-OUT-${Date.now()}`, status: "completed" });
      upsertLiveItem("withdrawals", result.withdrawal);
      if (result.ledgerEntry) upsertLiveItem("ledger", result.ledgerEntry);
      notify(`Выплата ${result.withdrawal.id}: ${result.withdrawal.status}`);
    } else if (action === "approve-product") {
      await ensureLiveRole("admin");
      const product = await api.live.updateStatus("products", button.dataset.productId || 33412, "published");
      upsertLiveItem("products", product);
      notify(`Товар #${product.id} опубликован`);
    }
  } catch (error) {
    notify(`API действие не выполнено: ${error.message}`);
  } finally {
    button.disabled = false;
    button.textContent = previousText;
  }
}
