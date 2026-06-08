const fs = require("fs");
const path = require("path");

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
  "index.html",
  "models.js",
  "robots.txt",
  "router.js",
  "routes.js",
  "selectors.js",
  "session.js",
  "site.webmanifest",
  "state.js",
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

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

files.forEach(copyFile);
directories.forEach(copyDirectory);

const forbidden = ["backend", ".github", "data", "scripts", "verify.js", "package.json", "render.yaml"];
const leaked = forbidden.filter((relativePath) => fs.existsSync(path.join(dist, relativePath)));
if (leaked.length) throw new Error(`Pages build leaked non-static paths: ${leaked.join(", ")}`);

for (const requiredPath of ["robots.txt", "site.webmanifest"]) {
  if (!fs.existsSync(path.join(dist, requiredPath))) throw new Error(`Pages build missed ${requiredPath}`);
}

console.log(`pages build OK: ${dist}`);
