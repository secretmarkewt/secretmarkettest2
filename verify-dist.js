const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const dist = path.join(process.cwd(), "dist");
const port = 4175;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  if (!fs.existsSync(path.join(dist, "index.html"))) throw new Error("dist index.html is missing");
  if (fs.existsSync(path.join(dist, "backend")) || fs.existsSync(path.join(dist, ".github"))) {
    throw new Error("dist contains non-static directories");
  }

  const server = spawn(process.execPath, ["server.js"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port), STATIC_ROOT: dist },
    stdio: "ignore",
  });

  try {
    await wait(500);
    const home = await fetch(`http://127.0.0.1:${port}/`);
    const html = await home.text();
    if (home.status !== 200 || !html.includes('id="app"') || !html.includes('href="site.webmanifest"')) {
      throw new Error("dist home response failed");
    }

    const catalog = await fetch(`http://127.0.0.1:${port}/catalog/roblox`);
    const catalogHtml = await catalog.text();
    if (catalog.status !== 200 || !catalogHtml.includes("renderers/catalog.js")) {
      throw new Error("dist SPA fallback failed");
    }

    const manifest = await fetch(`http://127.0.0.1:${port}/site.webmanifest`).then((response) => response.json());
    if (manifest.name !== "Secret Market") throw new Error("dist manifest failed");

    console.log("dist preview OK");
  } finally {
    server.kill();
  }
})();
