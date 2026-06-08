const http = require("http");
const fs = require("fs");
const path = require("path");

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};
const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
};

function safeFilePath(root, urlPath) {
  const cleanPath = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
  const filePath = path.resolve(root, cleanPath);
  const relative = path.relative(root, filePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return path.join(root, "index.html");
  return filePath;
}

function createStaticServer(options = {}) {
  const root = path.resolve(options.root || process.env.STATIC_ROOT || process.cwd());
  return http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    let filePath = safeFilePath(root, urlPath);

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(root, "index.html");
    }

    res.writeHead(200, { "Content-Type": types[path.extname(filePath)] || "application/octet-stream", ...securityHeaders });
    fs.createReadStream(filePath).pipe(res);
  });
}

function startStaticServer(options = {}) {
  const port = Number(options.port || process.env.PORT || 4173);
  const host = options.host || process.env.HOST || "127.0.0.1";
  const root = options.root || process.env.STATIC_ROOT || process.cwd();
  const server = createStaticServer({ root });
  server.listen(port, host, () => {
    console.log(`Secret Market prototype: http://${host}:${port}`);
  });
  return server;
}

if (require.main === module) {
  startStaticServer();
}

module.exports = { createStaticServer, startStaticServer };
