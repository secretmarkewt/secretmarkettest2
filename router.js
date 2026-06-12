function render() {
  const path = currentPath();
  if (path === "/") app.innerHTML = home();
  else if (path === "/catalog") app.innerHTML = catalog();
  else if (path.startsWith("/catalog/")) app.innerHTML = catalog(path.split("/").pop());
  else if (path.startsWith("/product/")) app.innerHTML = product(path.split("/").pop());
  else if (path === "/login") app.innerHTML = auth("login");
  else if (path === "/register") app.innerHTML = auth("register");
  else if (path === "/auth") app.innerHTML = auth();
  else if (path === "/checkout") app.innerHTML = guardedPage(["buyer"], () => checkout());
  else if (path.startsWith("/payment/")) app.innerHTML = guardedPage(["buyer", "admin"], () => payment(path.split("/").pop()));
  else if (path.startsWith("/orders/")) app.innerHTML = guardedPage(["buyer", "seller", "admin"], () => order(path.split("/").pop()));
  else if (path === "/chats") app.innerHTML = guardedPage(["buyer", "seller", "admin"], () => chats());
  else if (path === "/notifications") app.innerHTML = guardedPage(["buyer", "seller", "admin"], () => notifications());
  else if (path.startsWith("/account")) app.innerHTML = guardedPage(["buyer", "seller", "admin"], () => account(path));
  else if (path === "/seller/pixeltrade") app.innerHTML = publicSeller();
  else if (path.startsWith("/seller")) app.innerHTML = guardedPage(["seller", "admin"], () => seller(path));
  else if (path === "/disputes") app.innerHTML = guardedPage(["buyer", "seller", "admin"], () => disputes());
  else if (path.startsWith("/disputes/")) app.innerHTML = guardedPage(["buyer", "seller", "admin"], () => disputeDetail(path.split("/").pop()));
  else if (path.startsWith("/support")) app.innerHTML = support(path);
  else if (path.startsWith("/admin")) app.innerHTML = guardedPage(["admin"], () => admin(path));
  else app.innerHTML = info(path);
  bind();
}

function guardedPage(roles, renderer) {
  const session = sessionApi.currentSession();
  if (!session?.user || session.role === "guest") return accessPage("login", roles[0]);
  if (!roles.includes(session.role)) return accessPage("denied", roles[0]);
  return renderer();
}

function startRouter() {
  addEventListener("popstate", render);
  addEventListener("hashchange", () => {
    render();
    scrollTo({ top: 0, behavior: "smooth" });
  });
  render();
}
