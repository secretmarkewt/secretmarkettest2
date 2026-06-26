const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const dist = path.join(process.cwd(), "dist");
const port = 4176;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  const source404 = fs.readFileSync("404.html", "utf8");
  if (!source404.includes("assets/404-secret-market.jpg")) throw new Error("404 source image is missing");
  if (!source404.includes("location.hostname.endsWith(\"github.io\")")) throw new Error("404 source dynamic Pages retry link is missing");
  if (!source404.includes("Попробовать еще раз")) throw new Error("404 source accessible label is broken");

  if (!fs.existsSync(path.join(dist, "404.html"))) throw new Error("dist 404.html is missing");
  if (!fs.existsSync(path.join(dist, "assets", "404-secret-market.jpg"))) throw new Error("dist 404 image is missing");

  const server = spawn(process.execPath, ["server.js"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port), STATIC_ROOT: dist },
    stdio: "ignore",
  });

  try {
    await wait(500);
    const page = await fetch(`http://127.0.0.1:${port}/404.html`);
    const html = await page.text();
    if (page.status !== 200 || !html.includes("404-secret-market.jpg") || !html.includes("Попробовать еще раз")) {
      throw new Error("dist 404 response failed");
    }

    const image = await fetch(`http://127.0.0.1:${port}/assets/404-secret-market.jpg`);
    if (image.status !== 200 || image.headers.get("content-type") !== "image/jpeg") {
      throw new Error("dist 404 image response failed");
    }

    console.log("404 page OK");
  } finally {
    server.kill();
  }
})();
