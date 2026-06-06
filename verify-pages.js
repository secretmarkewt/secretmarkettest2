const fs = require("fs");
const vm = require("vm");

const pushes = [];
const context = {
  window: {
    clearTimeout() {},
    setTimeout() {
      return 1;
    },
    innerWidth: 1024,
  },
  location: {
    protocol: "https:",
    hostname: "t1lt54.github.io",
    pathname: "/secretmarket1/catalog/minecraft",
    hash: "",
  },
  history: {
    pushState(_state, _title, path) {
      pushes.push(path);
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
  render() {},
  scrollTo() {},
};

context.window.window = context.window;
context.window.location = context.location;
context.window.history = context.history;
context.window.localStorage = context.localStorage;
context.window.scrollTo = context.scrollTo;
Object.assign(context, context.window);
vm.createContext(context);

vm.runInContext(fs.readFileSync("state.js", "utf8"), context, { filename: "state.js" });

if (context.currentPath() !== "/catalog/minecraft") {
  throw new Error(`GitHub Pages path strip failed: ${context.currentPath()}`);
}

context.go("/catalog/roblox");

if (pushes[0] !== "/secretmarket1/catalog/roblox") {
  throw new Error(`GitHub Pages base path push failed: ${pushes[0]}`);
}

console.log("pages path OK");
