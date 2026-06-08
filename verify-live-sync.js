const fs = require("fs");
const os = require("os");
const path = require("path");
const vm = require("vm");
const { createApiServer } = require("./backend/server");
const { createStore } = require("./backend/repository");

(async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "secmarket-live-sync-"));
  const server = createApiServer({ store: createStore({ filePath: path.join(tempDir, "db.json") }) });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const storage = new Map();
  let renderCount = 0;

  const context = {
    fetch,
    window: {
      clearTimeout() {},
      setTimeout() {
        return 1;
      },
      innerWidth: 1024,
    },
    location: {
      protocol: "https:",
      hostname: "localhost",
      pathname: "/",
      hash: "",
    },
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
    render() {
      renderCount += 1;
    },
  };

  context.window.window = context.window;
  context.window.location = context.location;
  context.window.localStorage = context.localStorage;
  context.window.fetch = fetch;
  Object.assign(context, context.window);
  vm.createContext(context);

  try {
    for (const file of ["data.js", "api.js", "state.js"]) {
      vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
    }

    const api = context.window.SECMARKET_API;
    api.setApiBaseUrl(`http://127.0.0.1:${port}`);

    const guestSync = await context.syncLiveData({ silent: true });
    const state = context.window.SECMARKET_STATE;
    if (!guestSync || state.liveStatus !== "connected") throw new Error("guest live sync failed");
    if (!state.liveHealth?.version) throw new Error("live sync health metadata failed");
    if (!state.live.products.some((product) => product.id === 12345)) throw new Error("guest products sync failed");
    if (state.live.orders.length) throw new Error("guest sync loaded private orders");

    await api.live.login("buyer@example.com", "buyer");
    const buyerSync = await context.syncLiveData({ silent: true });
    if (!buyerSync || !state.live.orders.some((order) => order.id === 12345)) throw new Error("buyer orders sync failed");
    if (!storage.get("secmarket-demo-state") || renderCount < 2) throw new Error("live sync did not persist or render");

    console.log("live sync OK");
  } finally {
    server.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})();
