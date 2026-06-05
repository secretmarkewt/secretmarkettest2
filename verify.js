const { spawn } = require("child_process");
const fs = require("fs");
const vm = require("vm");
const { createApiServer } = require("./backend/server");

const routeContext = { window: {} };
vm.createContext(routeContext);
vm.runInContext(fs.readFileSync("routes.js", "utf8"), routeContext);
const routes = routeContext.window.SECMARKET_ROUTES.map((route) => route.path);
const requiredScripts = ["data.js", "routes.js", "models.js", "api.js", "validation.js", "session.js", "ui.js", "state.js", "selectors.js", "renderers/catalog.js", "renderers/account.js", "renderers/seller.js", "renderers/admin.js", "renderers/info.js", "renderers/support.js", "router.js", "events.js", "app.js"];

(async () => {
  const apiServer = createApiServer();
  await new Promise((resolve) => apiServer.listen(0, "127.0.0.1", resolve));
  const apiPort = apiServer.address().port;
  const health = await fetch(`http://127.0.0.1:${apiPort}/api/health`).then((response) => response.json());
  if (!health.ok) throw new Error("backend health check failed");
  apiServer.close();

  const server = spawn(process.execPath, ["server.js"], { cwd: process.cwd(), stdio: "ignore" });
  await new Promise((resolve) => setTimeout(resolve, 500));
  for (const route of routes) {
    const response = await fetch(`http://127.0.0.1:4173${route}`);
    const text = await response.text();
    if (response.status !== 200 || !text.includes('id="app"') || !requiredScripts.every((script) => text.includes(script))) {
      throw new Error(`${route} failed static response check`);
    }
    console.log(`${route} OK`);
  }
  server.kill();
})();
