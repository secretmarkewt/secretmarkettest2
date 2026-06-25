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
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      toggleTheme();
    });
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
      await refreshLiveBalance();
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
  document.querySelector("[data-role-switch-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const role = String(formData.get("role") || "").trim();
    const session = sessionApi.currentSession();
    if (!["buyer", "seller"].includes(role)) {
      notify("Можно выбрать только покупателя или продавца");
      return;
    }
    if (session.role === role) {
      notify(`Роль уже выбрана: ${sessionApi.roleLabel(role)}`);
      return;
    }
    try {
      const result = await api.live.changeRole(role);
      sessionApi.updateRole?.(result.user?.role || role, result.user);
      notify(`Роль изменена: ${sessionApi.roleLabel(result.user?.role || role)}`);
      go(role === "seller" ? "/seller" : "/account");
    } catch (error) {
      notify(`Роль не изменена: ${error.message}`);
    }
  });
  document.querySelector("[data-register-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const promo = window.SECMARKET_VALIDATORS.validatePromoCode(formData.get("promoCode"), formData.get("role"));
    if (!promo.ok) {
      notify(promo.error === "promo_role_mismatch" ? "Промокод не подходит для выбранной роли" : "Промокод не найден или отключен");
      return;
    }
    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      telegram: formData.get("telegram"),
      role: formData.get("role"),
      promoCode: promo.code,
      promoTitle: promo.promo?.title || "",
    };
    try {
      const session = await api.live.register(payload);
      if (sessionApi.loginUser) sessionApi.loginUser(session.user, payload.role);
      else sessionApi.loginAs(session.user.role);
      if (session.token) await refreshLiveBalance();
      const message = session.registrationNotice?.sent
        ? "Регистрация создана и отправлена в Telegram"
        : session.requiresEmailConfirmation
          ? "Регистрация создана через Supabase. Подтвердите email, чтобы войти"
          : session.provider === "local-fallback"
            ? "Регистрация сохранена локально: Supabase сейчас недоступен"
            : session.provider === "supabase"
              ? "Регистрация создана через Supabase, Telegram secret нужно проверить"
              : "Регистрация создана, Telegram уведомление не настроено";
      notify(message);
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
      const attachment = formData.get("attachment");
      let evidence = null;
      if (attachment && attachment.size > 0) {
        const evidencePayload = await fileToEvidencePayload(attachment, "ticket", ticket.id);
        const evidenceResult = await api.live.create("evidence", evidencePayload);
        evidence = evidenceResult.evidence || evidenceResult;
        upsertLiveItem("evidence", evidence);
      }
      notify(evidence
        ? "Тикет создан, вложение сохранено для поддержки"
        : ticket.ticketNotice?.sent ? "Тикет создан и отправлен в Telegram" : "Тикет создан, Telegram уведомление не настроено");
      go("/support/requests");
    } catch (error) {
      notify(`Тикет не создан: ${error.message}`);
    }
  });
  document.querySelector("[data-developer-application-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const requiredFields = {
      name: "Введите имя",
      telegram: "Введите Telegram",
      role: "Выберите роль",
      about: "Расскажите о себе",
    };
    let hasErrors = false;

    form.querySelectorAll(".field.is-invalid").forEach((fieldNode) => fieldNode.classList.remove("is-invalid"));
    form.querySelectorAll("[data-error-for]").forEach((errorNode) => {
      errorNode.textContent = "";
    });

    Object.entries(requiredFields).forEach(([name, message]) => {
      const value = String(formData.get(name) || "").trim();
      if (value) return;
      hasErrors = true;
      form.querySelector(`[data-field="${name}"]`)?.classList.add("is-invalid");
      const errorNode = form.querySelector(`[data-error-for="${name}"]`);
      if (errorNode) errorNode.textContent = message;
    });

    if (hasErrors) {
      form.querySelector(".field.is-invalid input, .field.is-invalid select, .field.is-invalid textarea")?.focus();
      return;
    }

    const application = {
      id: `dev-${Date.now()}`,
      name: String(formData.get("name") || "").trim(),
      telegram: String(formData.get("telegram") || "").trim(),
      role: String(formData.get("role") || "").trim(),
      about: String(formData.get("about") || "").trim(),
      portfolio_url: String(formData.get("portfolio_url") || "").trim(),
      status: "new",
      created_at: new Date().toISOString(),
    };

    // TODO: Replace localStorage with backend/Supabase developer_applications table when production DB is connected.
    const storageKey = "secmarket-developer-applications";
    const existing = JSON.parse(localStorage.getItem(storageKey) || "[]");
    existing.push(application);
    localStorage.setItem(storageKey, JSON.stringify(existing));
    form.reset();
    form.querySelector("[data-developer-success]")?.removeAttribute("hidden");
    notify("Заявка разработчика сохранена");
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
  const withdrawalForm = document.querySelector("[data-withdrawal-form]");
  if (withdrawalForm) {
    updateWithdrawalPreview(withdrawalForm);
    withdrawalForm.addEventListener("input", () => updateWithdrawalPreview(withdrawalForm));
    withdrawalForm.addEventListener("change", () => updateWithdrawalPreview(withdrawalForm));
  }
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

const NETWORK_WITHDRAWAL_FEES = {
  BEP20: 0.35,
  TON: 0.15,
  TRC20: 1,
};

function withdrawalNetworkFee(network) {
  return NETWORK_WITHDRAWAL_FEES[String(network || "TRC20").toUpperCase()] ?? NETWORK_WITHDRAWAL_FEES.TRC20;
}

function withdrawalDraftFromForm(form) {
  const formData = new FormData(form);
  const network = String(formData.get("network") || "TRC20").trim().toUpperCase();
  const amount = Number(String(formData.get("amount") || "").replace(",", "."));
  const networkFee = withdrawalNetworkFee(network);
  const netAmount = Math.max((Number.isFinite(amount) ? amount : 0) - networkFee, 0);
  return {
    address: String(formData.get("address") || "").trim(),
    amount: Number.isFinite(amount) ? amount : 0,
    coin: String(formData.get("coin") || "USDT").trim() || "USDT",
    network,
    networkFee,
    netAmount: Math.round(netAmount * 100) / 100,
  };
}

function updateWithdrawalPreview(form) {
  const draft = withdrawalDraftFromForm(form);
  const feeInput = form.querySelector("[data-withdrawal-fee]");
  const netInput = form.querySelector("[data-withdrawal-net]");
  if (feeInput) feeInput.value = `${draft.networkFee.toFixed(2)} USDT`;
  if (netInput) netInput.value = `${draft.netAmount.toFixed(2)} USDT`;
}

function payoutDraftFromButton(button, fallbackStatus = "completed") {
  const form = button.closest("[data-payout-form]");
  const formData = form ? new FormData(form) : new FormData();
  return {
    riskNote: String(formData.get("riskNote") || "").trim(),
    status: String(formData.get("status") || fallbackStatus).trim() || fallbackStatus,
    txHash: String(formData.get("txHash") || "").trim(),
  };
}

function downloadTextFile(fileName, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function fileToEvidencePayload(file, targetType, targetId) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      resolve({
        targetType,
        targetId,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        contentBase64: String(reader.result || ""),
      });
    });
    reader.addEventListener("error", () => reject(reader.error || new Error("file_read_failed")));
    reader.readAsDataURL(file);
  });
}

function paymentReviewDraftFromButton(button, fallbackStatus = "paid") {
  const form = button.closest("[data-payment-review-form]");
  if (!form) {
    return {
      adminNote: "",
      confirmations: 24,
      status: fallbackStatus,
      txHash: `TX-LIVE-${Date.now()}`,
    };
  }
  const formData = form ? new FormData(form) : new FormData();
  const confirmations = Number(String(formData.get("confirmations") || "0").replace(",", "."));
  return {
    adminNote: String(formData.get("adminNote") || "").trim(),
    confirmations: Number.isFinite(confirmations) ? confirmations : 0,
    status: String(formData.get("status") || fallbackStatus).trim() || fallbackStatus,
    txHash: String(formData.get("txHash") || "").trim(),
  };
}

function disputeResolutionDraftFromButton(button) {
  const form = button.closest("[data-dispute-resolution-form]");
  const formData = form ? new FormData(form) : new FormData();
  const refundAmount = Number(String(formData.get("refundAmount") || "0").replace(",", "."));
  const status = String(formData.get("status") || "resolved_buyer").trim();
  return {
    decision: String(formData.get("decision") || "").trim(),
    refundAmount: Number.isFinite(refundAmount) ? Math.max(refundAmount, 0) : 0,
    status,
  };
}

function bindHeroCursorGlow() {
  const hero = document.querySelector("[data-cursor-glow]");
  if (!hero) return;

  let frame = 0;
  const setGlow = (event) => {
    if (typeof event.clientX !== "number" || typeof event.clientY !== "number") return;
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

  hero.style.setProperty("--hero-glow-opacity", "0.82");
  hero.addEventListener("pointermove", setGlow);
  hero.addEventListener("mousemove", setGlow);
  hero.addEventListener("pointerleave", () => {
    hero.style.setProperty("--hero-glow-opacity", "0.72");
  });
  hero.addEventListener("mouseleave", () => {
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
  const session = await api.live.login(email, role);
  sessionApi.loginUser?.(session.user, role);
  await refreshLiveBalance();
  return session;
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

async function refreshLiveBalance() {
  if (!api.getAuthToken()) return null;
  try {
    const balance = await api.live.balance();
    state.liveBalance = balance;
    sessionApi.updateBalance?.(balance);
    saveState();
    return balance;
  } catch {
    return null;
  }
}

async function runLiveAction(button) {
  const action = button.dataset.liveAction;
  const previousText = button.textContent;
  button.disabled = true;
  button.textContent = "Выполняется...";

  try {
    if (action === "refresh-operations") {
      await ensureLiveRole("admin");
      await syncLiveData({ notify: false });
      notify("Operations обновлены: health и readiness синхронизированы");
    } else if (action === "create-backup") {
      await ensureLiveRole("admin");
      const result = await api.live.createBackup({ reason: "admin-operations" });
      const backups = await api.live.backups();
      state.liveBackups = backups.items || [];
      saveState();
      render();
      notify(result.ok ? `Backup создан: ${result.fileName}` : "Backup не создан");
    } else if (action === "create-checkout") {
      await ensureLiveRole("buyer");
      const buyerId = sessionApi.currentSession().user?.id || "usr-buyer";
      const product = checkoutProduct();
      const commission = checkoutCommission(product);
      const orderId = `ord-${Date.now()}`;
      const order = await api.live.create("orders", {
        id: orderId,
        buyerId,
        sellerId: product.sellerId || product.seller,
        productId: product.id,
        productTitle: product.title,
        amount: commission.itemAmount,
        ...commission,
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
        amount: commission.buyerTotal,
        ...commission,
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
    } else if (action === "deposit-balance") {
      await ensureLiveRole(sessionApi.currentSession().role === "guest" ? "buyer" : sessionApi.currentSession().role);
      const form = button.closest("[data-balance-deposit-form]");
      const formData = form ? new FormData(form) : null;
      const amount = Number(formData?.get("amount") || 0);
      const result = await api.live.deposit({
        amount,
        paymentMethod: String(formData?.get("paymentMethod") || "USDT TRC20"),
        details: { comment: String(formData?.get("comment") || "") },
        idempotencyKey: `dep-${sessionApi.currentSession().user?.id || "user"}-${Date.now()}`,
      });
      upsertLiveItem("transactions", result.transaction);
      if (result.balance) {
        state.liveBalance = result.balance;
        sessionApi.updateBalance?.(result.balance);
        saveState();
      }
      notify(`Заявка на пополнение ${result.transaction.id}: ${statusLabel(result.transaction.status)}`);
    } else if (action === "withdraw-balance") {
      await ensureLiveRole(sessionApi.currentSession().role === "guest" ? "buyer" : sessionApi.currentSession().role);
      const form = button.closest("[data-balance-withdraw-form]");
      const formData = form ? new FormData(form) : null;
      const amount = Number(formData?.get("amount") || 0);
      const result = await api.live.withdrawBalance({
        amount,
        network: String(formData?.get("network") || "TRC20"),
        address: String(formData?.get("address") || ""),
        idempotencyKey: `wd-bal-${sessionApi.currentSession().user?.id || "user"}-${Date.now()}`,
      });
      upsertLiveItem("transactions", result.transaction);
      if (result.balance) {
        state.liveBalance = result.balance;
        sessionApi.updateBalance?.(result.balance);
        saveState();
      }
      notify(`Заявка на вывод ${result.transaction.id}: заморожено ${Number(result.transaction.amount || 0).toFixed(2)} USDT`);
    } else if (action === "create-product") {
      await ensureLiveRole("seller");
      const sellerId = sessionApi.currentSession().user?.id || "usr-seller";
      const form = button.closest("[data-product-form]");
      const formData = form ? new FormData(form) : null;
      const deliverySecrets = String(formData?.get("deliverySecrets") || "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
      const product = await api.live.create("products", {
        sellerId,
        title: String(formData?.get("title") || "Новый товар").trim(),
        category: String(formData?.get("category") || "catalog").trim(),
        subcategory: String(formData?.get("subcategory") || "").trim(),
        platform: String(formData?.get("platform") || "").trim(),
        price: Number(formData?.get("price") || 0),
        stock: Number(formData?.get("stock") || deliverySecrets.length || 0),
        deliveryType: String(formData?.get("deliveryType") || "auto"),
        region: String(formData?.get("region") || "Любой"),
        deliveryTime: String(formData?.get("deliveryTime") || "5 минут"),
        warranty: String(formData?.get("warranty") || "24 часа"),
        image: String(formData?.get("image") || ""),
        description: String(formData?.get("description") || ""),
        instructions: String(formData?.get("instructions") || ""),
        deliverySecrets,
        status: String(formData?.get("status") || "moderation"),
      });
      upsertLiveItem("products", product);
      notify(`Товар #${product.id} создан и отправлен на модерацию`);
    } else if (action === "request-withdrawal") {
      await ensureLiveRole("seller");
      const sellerId = sessionApi.currentSession().user?.id || "usr-seller";
      const form = button.closest("[data-withdrawal-form]");
      const draft = form ? withdrawalDraftFromForm(form) : {
        address: "TYJmyeYEVHpF2CEZTXheWp1kM6zVUoeWsB",
        amount: 25,
        coin: "USDT",
        network: "TRC20",
        networkFee: 1,
        netAmount: 24,
      };
      if (!(draft.amount > draft.networkFee)) throw new Error("сумма должна быть больше комиссии сети");
      if (!draft.address) throw new Error("укажите адрес кошелька");
      const result = await api.live.requestWithdrawal({
        sellerId,
        amount: draft.amount,
        grossAmount: draft.amount,
        coin: draft.coin,
        network: draft.network,
        address: draft.address,
        networkFee: draft.networkFee,
        netAmount: draft.netAmount,
      });
      upsertLiveItem("withdrawals", result.withdrawal);
      notify(`Вывод ${result.withdrawal.id} создан: к получению ${draft.netAmount.toFixed(2)} USDT`);
    } else if (action === "sync-payment") {
      await ensureLiveRole("admin");
      const id = button.dataset.paymentId || currentPath().split("/").pop();
      const draft = paymentReviewDraftFromButton(button, "paid");
      if (draft.status !== "waiting" && !draft.txHash) throw new Error("укажите ID транзакции платежа");
      const result = await api.live.syncPayment(id, draft);
      upsertLiveItem("payments", result.payment);
      upsertLiveItem("orders", result.order);
      notify(`Платеж ${result.payment.id}: ${result.payment.status}`);
    } else if (action === "mark-payment-error") {
      await ensureLiveRole("admin");
      const id = button.dataset.paymentId || currentPath().split("/").pop();
      const draft = paymentReviewDraftFromButton(button, "network_error");
      const result = await api.live.syncPayment(id, { ...draft, status: "network_error" });
      upsertLiveItem("payments", result.payment);
      upsertLiveItem("orders", result.order);
      notify(`Платеж ${result.payment.id}: ошибка сети`);
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
      const draft = disputeResolutionDraftFromButton(button);
      if (draft.status === "partial_refund" && !(draft.refundAmount > 0)) throw new Error("укажите сумму частичного возврата");
      const dispute = await api.live.update("disputes", disputeId, {
        status: draft.status,
        decision: draft.decision || statusLabel(draft.status),
        refundAmount: draft.refundAmount,
      });
      upsertLiveItem("disputes", dispute);
      if (orderId) {
        const orderPatch = ["resolved_buyer", "partial_refund"].includes(draft.status)
          ? { orderStatus: "refunded", status: "refunded", escrowStatus: "refunded" }
          : draft.status === "resolved_seller"
            ? { orderStatus: "awaiting_buyer", status: "awaiting_buyer", escrowStatus: "hold" }
            : { orderStatus: "dispute", status: "dispute", escrowStatus: "hold" };
        const order = await api.live.update("orders", orderId, {
          ...orderPatch,
        });
        upsertLiveItem("orders", order);
      }
      notify(`Спор #${dispute.id} решен: ${statusLabel(dispute.status)}`);
    } else if (action === "settle-withdrawal") {
      await ensureLiveRole("admin");
      const id = button.dataset.withdrawalId || currentPath().split("/").pop();
      const draft = payoutDraftFromButton(button, "completed");
      if ((draft.status === "sent" || draft.status === "completed") && !draft.txHash) throw new Error("укажите ID транзакции выплаты");
      const result = await api.live.settleWithdrawal(id, draft);
      upsertLiveItem("withdrawals", result.withdrawal);
      if (result.ledgerEntry) upsertLiveItem("ledger", result.ledgerEntry);
      notify(`Выплата ${result.withdrawal.id}: ${result.withdrawal.status}`);
    } else if (action === "review-withdrawal") {
      await ensureLiveRole("admin");
      const id = button.dataset.withdrawalId || currentPath().split("/").pop();
      const draft = payoutDraftFromButton(button, "processing");
      const result = await api.live.settleWithdrawal(id, { ...draft, status: "processing" });
      upsertLiveItem("withdrawals", result.withdrawal);
      notify(`Выплата ${result.withdrawal.id}: дополнительная проверка`);
    } else if (action === "reject-withdrawal") {
      await ensureLiveRole("admin");
      const id = button.dataset.withdrawalId || currentPath().split("/").pop();
      const draft = payoutDraftFromButton(button, "rejected");
      const result = await api.live.settleWithdrawal(id, { ...draft, status: "rejected" });
      upsertLiveItem("withdrawals", result.withdrawal);
      notify(`Выплата ${result.withdrawal.id}: отклонена`);
    } else if (action === "create-payout-batch") {
      await ensureLiveRole("admin");
      const result = await api.live.createPayoutBatch({ statuses: ["review", "processing"] });
      upsertLiveItem("payoutBatches", result.batch);
      (result.withdrawals || []).forEach((withdrawal) => upsertLiveItem("withdrawals", withdrawal));
      if (result.csv) downloadTextFile(`${result.batch.id}.csv`, result.csv, "text/csv;charset=utf-8");
      notify(`Batch ${result.batch.id}: ${result.batch.withdrawalCount} выплат, к отправке ${Number(result.batch.totalNet || 0).toFixed(2)} USDT`);
    } else if (action === "export-payouts") {
      await ensureLiveRole("admin");
      const result = await api.live.exportPayouts({ statuses: ["review", "processing"] });
      downloadTextFile(`payouts-${new Date().toISOString().slice(0, 10)}.csv`, result.csv || "", "text/csv;charset=utf-8");
      notify(`CSV выплат готов: ${result.rows?.length || 0} строк`);
    } else if (action === "approve-transaction") {
      const id = button.dataset.transactionId;
      const result = await api.live.approveTransaction(id);
      upsertLiveItem("transactions", result.transaction);
      notify(`Транзакция ${id}: ${statusLabel(result.transaction.status)}`);
    } else if (action === "reject-transaction") {
      const id = button.dataset.transactionId;
      const result = await api.live.rejectTransaction(id, { reason: "Отклонено администратором" });
      upsertLiveItem("transactions", result.transaction);
      notify(`Транзакция ${id}: ${statusLabel(result.transaction.status)}`);
    } else if (action === "adjust-balance") {
      const form = button.closest("[data-admin-adjust-form]");
      const formData = form ? new FormData(form) : null;
      const userId = String(formData?.get("userId") || "").trim();
      const result = await api.live.adjustBalance(userId, {
        amount: Number(formData?.get("amount") || 0),
        comment: String(formData?.get("comment") || ""),
      });
      upsertLiveItem("transactions", result.transaction);
      notify(`Баланс ${userId} скорректирован: ${Number(result.transaction.amount || 0).toFixed(2)} USDT`);
    } else if (action === "approve-product") {
      await ensureLiveRole("admin");
      const product = await api.live.updateStatus("products", button.dataset.productId || 33412, "published");
      upsertLiveItem("products", product);
      notify(`Товар #${product.id} опубликован`);
    } else if (action === "reject-product") {
      await ensureLiveRole("admin");
      const product = await api.live.updateStatus("products", button.dataset.productId, "rejected");
      upsertLiveItem("products", product);
      notify(`Товар #${product.id} снят с публикации`);
    } else if (action === "close-ticket") {
      await ensureLiveRole("admin");
      const ticket = await api.live.updateStatus("tickets", button.dataset.ticketId, "closed");
      upsertLiveItem("tickets", ticket);
      notify(`Тикет #${ticket.id} закрыт`);
    } else if (action === "mark-order-paid") {
      await ensureLiveRole("admin");
      const order = await api.live.update("orders", button.dataset.orderId, {
        paymentStatus: "paid",
        orderStatus: "paid",
        status: "paid",
      });
      upsertLiveItem("orders", order);
      notify(`Заказ #${order.id}: оплачен`);
    } else if (action === "complete-order") {
      await ensureLiveRole("admin");
      const order = await api.live.update("orders", button.dataset.orderId, {
        orderStatus: "completed",
        escrowStatus: "released",
        status: "completed",
      });
      upsertLiveItem("orders", order);
      notify(`Заказ #${order.id}: завершен`);
    } else if (action === "refund-order") {
      await ensureLiveRole("admin");
      const result = await api.live.refundOrder(button.dataset.orderId, {
        reason: "Возврат по решению администратора",
      });
      upsertLiveItem("orders", result.order);
      if (result.transaction) upsertLiveItem("transactions", result.transaction);
      if (result.ledgerEntry) upsertLiveItem("ledger", result.ledgerEntry);
      if (result.dispute) upsertLiveItem("disputes", result.dispute);
      notify(`Заказ #${result.order.id}: возврат ${Number(result.transaction?.amount || result.order.refundAmount || 0).toFixed(2)} USDT`);
    }
  } catch (error) {
    notify(`API действие не выполнено: ${error.message}`);
  } finally {
    button.disabled = false;
    button.textContent = previousText;
  }
}
