function render() {
  const path = currentPath();
  if (path === "/") app.innerHTML = home();
  else if (path === "/catalog") app.innerHTML = catalog();
  else if (path.startsWith("/catalog/")) app.innerHTML = catalog(path.split("/").pop());
  else if (path.startsWith("/product/")) app.innerHTML = product(path.split("/").pop());
  else if (path === "/login") app.innerHTML = auth("login");
  else if (path === "/register") app.innerHTML = auth("register");
  else if (path === "/auth") app.innerHTML = auth();
  else if (path === "/checkout") app.innerHTML = checkout();
  else if (path.startsWith("/payment/")) app.innerHTML = payment(path.split("/").pop());
  else if (path.startsWith("/orders/")) app.innerHTML = order(path.split("/").pop());
  else if (path === "/chats") app.innerHTML = chats();
  else if (path === "/notifications") app.innerHTML = notifications();
  else if (path.startsWith("/account")) app.innerHTML = account(path);
  else if (path === "/seller/pixeltrade") app.innerHTML = publicSeller();
  else if (path.startsWith("/seller")) app.innerHTML = seller(path);
  else if (path === "/disputes") app.innerHTML = disputes();
  else if (path.startsWith("/disputes/")) app.innerHTML = disputeDetail(path.split("/").pop());
  else if (path.startsWith("/support")) app.innerHTML = support(path);
  else if (path.startsWith("/admin")) app.innerHTML = admin(path);
  else app.innerHTML = info(path);
  bind();
}

function startRouter() {
  addEventListener("popstate", render);
  addEventListener("hashchange", () => {
    render();
    scrollTo({ top: 0, behavior: "smooth" });
  });
  render();
}
