const fs = require("fs");
const vm = require("vm");
const { createApiServer } = require("./backend/server");

(async () => {
  const server = createApiServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;

  const storage = new Map();
  const context = {
    fetch,
    window: {},
    localStorage: {
      getItem(key) {
        return storage.get(key) || null;
      },
      setItem(key, value) {
        storage.set(key, String(value));
      },
      removeItem(key) {
        storage.delete(key);
      },
    },
  };
  context.window.window = context.window;
  context.window.localStorage = context.localStorage;
  context.window.fetch = fetch;
  Object.assign(context, context.window);
  vm.createContext(context);

  try {
    for (const file of ["data.js", "api.js"]) {
      vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
    }

    const api = context.window.SECMARKET_API;
    api.setApiBaseUrl(`http://127.0.0.1:${port}`);

    const health = await api.live.health();
    if (!health.ok) throw new Error("live health failed");

    const products = await api.live.list("products");
    if (!Array.isArray(products) || products.length < 1) throw new Error("live products failed");

    const created = await api.live.create("products", { title: "API client product", price: 7, status: "moderation" });
    const patched = await api.live.updateStatus("products", created.id, "published");
    if (patched.status !== "published") throw new Error("live status patch failed");

    console.log("api client OK");
  } finally {
    server.close();
  }
})();
