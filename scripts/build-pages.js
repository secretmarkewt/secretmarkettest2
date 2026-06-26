const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { writePublicConfig } = require("./public-config");

const root = process.cwd();
const dist = path.join(root, "dist");
const files = [
  ".nojekyll",
  "404.html",
  "api.js",
  "app.js",
  "config.js",
  "data.js",
  "events.js",
  "fees.js",
  "index.html",
  "models.js",
  "robots.txt",
  "router.js",
  "routes.js",
  "selectors.js",
  "session.js",
  "site.webmanifest",
  "state.js",
  "supabase.js",
  "styles.css",
  "ui.js",
  "validation.js",
];
const directories = ["assets", "renderers"];

function copyFile(relativePath) {
  const source = path.join(root, relativePath);
  const target = path.join(dist, relativePath);
  if (!fs.existsSync(source)) throw new Error(`Missing static file: ${relativePath}`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function copyDirectory(relativePath) {
  const source = path.join(root, relativePath);
  const target = path.join(dist, relativePath);
  if (!fs.existsSync(source)) throw new Error(`Missing static directory: ${relativePath}`);
  copyDirectoryContents(source, target);
}

function copyDirectoryContents(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDirectoryContents(sourcePath, targetPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function readSourceConfig() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, "config.js"), "utf8"), context);
  return context.window.SECMARKET_CONFIG || {};
}

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

files.forEach(copyFile);
directories.forEach(copyDirectory);
const publicApiUrl = writePublicConfig(path.join(dist, "config.js"), undefined, readSourceConfig());

const forbidden = ["backend", ".github", "data", "scripts", "verify.js", "package.json", "render.yaml"];
const leaked = forbidden.filter((relativePath) => fs.existsSync(path.join(dist, relativePath)));
if (leaked.length) throw new Error(`Pages build leaked non-static paths: ${leaked.join(", ")}`);

for (const requiredPath of ["robots.txt", "site.webmanifest"]) {
  if (!fs.existsSync(path.join(dist, requiredPath))) throw new Error(`Pages build missed ${requiredPath}`);
}

if (!fs.readFileSync(path.join(dist, "404.html"), "utf8").includes("location.hostname.endsWith(\"github.io\")")) {
  throw new Error("Pages build 404 dynamic GitHub Pages link is missing");
}
if (!fs.existsSync(path.join(dist, "assets", "404-secret-market.jpg"))) throw new Error("Pages build missed 404 image");

console.log(`pages build OK: ${dist}${publicApiUrl ? ` with API ${publicApiUrl}` : ""}`);
