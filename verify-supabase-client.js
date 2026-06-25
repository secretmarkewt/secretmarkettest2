const fs = require("fs");
const vm = require("vm");

(async () => {
  const requests = [];
  const storage = new Map();
  const context = {
    console,
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
    window: {
      SECMARKET_CONFIG: {
        supabaseUrl: "https://example.supabase.co",
        supabaseAnonKey: "anon-key",
      },
    },
    async fetch(url, options = {}) {
      requests.push({ url, options });
      if (String(url).includes("/auth/v1/signup")) {
        const payload = JSON.parse(options.body || "{}");
        return {
          ok: true,
          status: 200,
          async text() {
            return JSON.stringify({
              user: {
                id: "auth-user",
                email: payload.email,
                user_metadata: payload.data,
              },
            });
          },
        };
      }
      throw new Error(`unexpected fetch: ${url}`);
    },
  };
  context.window.window = context.window;
  context.window.localStorage = context.localStorage;
  context.window.fetch = context.fetch;
  Object.assign(context, context.window);
  vm.createContext(context);

  vm.runInContext(fs.readFileSync("supabase.js", "utf8"), context, { filename: "supabase.js" });
  const provider = context.window.SECMARKET_SUPABASE;
  const session = await provider.register({
    name: "No Session",
    email: "nosession@example.com",
    password: "password-123",
    telegram: "@nosession",
    role: "seller",
    promoCode: "WELCOME10",
    promoTitle: "Starter",
  });

  if (session.token) throw new Error("supabase signup without access token should not create local token");
  if (!session.requiresEmailConfirmation) throw new Error("supabase email confirmation flag failed");
  if (session.user.role !== "seller" || session.user.telegram !== "@nosession") throw new Error("supabase signup metadata failed");
  if (session.registrationNotice?.error !== "email_confirmation_required") throw new Error("supabase registration notice fallback failed");
  if (requests.some((request) => String(request.url).includes("/functions/v1/secmarket-notify"))) {
    throw new Error("supabase notify should not run without a session token");
  }

  console.log("supabase client OK");
})();
