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
  document.querySelector("[data-search-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    setSearch(new FormData(event.currentTarget).get("query") || "");
  });
  document.querySelectorAll("[data-login-role]").forEach((button) => {
    button.addEventListener("click", () => {
      const role = button.dataset.loginRole;
      sessionApi.loginAs(role);
      notify(`Вход выполнен: ${sessionApi.roleLabel(role)}`);
      if (role === "seller") go("/seller");
      else if (role === "admin") go("/admin");
      else go("/account");
    });
  });
  document.querySelector("[data-logout]")?.addEventListener("click", () => {
    sessionApi.logout();
    notify("Вы вышли из демо-сессии");
    go("/");
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
    try {
      await navigator.clipboard?.writeText("TX9a...F2Lm");
      notify("Адрес оплаты скопирован");
    } catch {
      notify("Адрес отмечен как скопированный");
    }
  });
  document.querySelector("[data-confirm-order]")?.addEventListener("click", () => {
    state.orderConfirmed = true;
    saveState();
    notify("Получение подтверждено, средства доступны продавцу");
  });
  document.querySelector("[data-open-dispute]")?.addEventListener("click", () => {
    state.disputeCreated = true;
    saveState();
    notify("Спор создан и средства остаются в холде");
    go("/disputes");
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
}

