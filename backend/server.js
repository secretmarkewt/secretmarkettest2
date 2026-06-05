const http = require("http");
const { handleApi, json } = require("./controllers");
const { createStore } = require("./repository");

function createApiServer(options = {}) {
  const store = options.store || createStore();
  return http.createServer(async (req, res) => {
    try {
      const handled = await handleApi(req, res, store);
      if (!handled) json(res, 404, { error: "api_route_not_found" });
    } catch (error) {
      json(res, 500, { error: "internal_error", message: error.message });
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.API_PORT || 4174);
  createApiServer().listen(port, "127.0.0.1", () => {
    console.log(`SecMarket API prototype: http://127.0.0.1:${port}/api/health`);
  });
}

module.exports = { createApiServer };
