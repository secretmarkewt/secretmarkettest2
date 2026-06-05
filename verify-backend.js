const { createApiServer } = require("./backend/server");

function request(port, path, options = {}) {
  return fetch(`http://127.0.0.1:${port}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
}

(async () => {
  const server = createApiServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;

  try {
    const health = await request(port, "/api/health").then((res) => res.json());
    if (!health.ok) throw new Error("health check failed");

    const products = await request(port, "/api/products").then((res) => res.json());
    if (!Array.isArray(products.items) || products.items.length < 1) throw new Error("products list failed");

    const created = await request(port, "/api/products", {
      method: "POST",
      body: JSON.stringify({ title: "Discord Nitro 1 мес", category: "discord", price: 8.5, stock: 10, status: "moderation" }),
    }).then((res) => res.json());
    if (!created.id) throw new Error("product create failed");

    const patched = await request(port, `/api/products/${created.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "published" }),
    }).then((res) => res.json());
    if (patched.status !== "published") throw new Error("product status patch failed");

    const rejected = await request(port, `/api/products/${created.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "bad-status" }),
    });
    if (rejected.status !== 422) throw new Error("invalid status validation failed");

    console.log("backend OK");
  } finally {
    server.close();
  }
})();
