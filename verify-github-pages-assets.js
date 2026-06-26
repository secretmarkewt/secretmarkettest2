const fs = require("fs");
const vm = require("vm");

const app = { innerHTML: "" };
const pagesBasePath = "/secretmarkettest2";
const context = {
  window: {
    clearTimeout() {},
    setTimeout() {
      return 1;
    },
    innerWidth: 1024,
  },
  document: {
    querySelector(selector) {
      return selector === "#app" ? app : null;
    },
    querySelectorAll() {
      return [];
    },
  },
  location: {
    protocol: "https:",
    hostname: "secretmarkewt.github.io",
    pathname: `${pagesBasePath}/seller/products/create`,
    hash: "",
  },
  history: {
    pushState(_state, _title, path) {
      context.location.pathname = path;
    },
  },
  localStorage: {
    getItem() {
      return null;
    },
    setItem() {},
    removeItem() {},
  },
  navigator: {},
  scrollTo() {},
  addEventListener() {},
  fetch() {
    throw new Error("fetch should not run in GitHub Pages asset verification");
  },
};

context.window.window = context.window;
context.window.document = context.document;
context.window.location = context.location;
context.window.history = context.history;
context.window.localStorage = context.localStorage;
context.window.navigator = context.navigator;
context.window.scrollTo = context.scrollTo;
context.window.addEventListener = context.addEventListener;
context.window.fetch = context.fetch;
Object.assign(context, context.window);
vm.createContext(context);

[
  "data.js",
  "routes.js",
  "models.js",
  "api.js",
  "validation.js",
  "session.js",
  "ui.js",
  "fees.js",
  "state.js",
  "selectors.js",
  "renderers/catalog.js",
  "renderers/account.js",
  "renderers/seller.js",
  "renderers/admin.js",
  "renderers/info.js",
  "renderers/support.js",
  "router.js",
  "events.js",
  "app.js",
].forEach((file) => vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file }));

if (!app.innerHTML.includes(`src="${pagesBasePath}/assets/secret-market-logo.png"`)) {
  throw new Error("nested seller route logo asset path failed");
}

context.location.pathname = `${pagesBasePath}/orders/12345`;
context.render();
if (!app.innerHTML.includes(`src="${pagesBasePath}/assets/secret-market-logo.png"`)) {
  throw new Error("nested order route logo asset path failed");
}

context.location.pathname = `${pagesBasePath}/`;
context.render();
if (!app.innerHTML.includes('class="market-intro"')) {
  throw new Error("home marketplace intro failed");
}
if (!app.innerHTML.includes('class="market-mascot"')) {
  throw new Error("compact mascot card failed");
}
if (app.innerHTML.includes("home-hero")) {
  throw new Error("legacy home hero should not render");
}

console.log("github pages assets OK");
