const animate = require("tailwindcss-animate");

/** @type {import("tailwindcss").Config} */
module.exports = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: [
    "./index.html",
    "./404.html",
    "./*.js",
    "./backend/**/*.js",
    "./renderers/**/*.js",
    "./scripts/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--bg)",
        foreground: "var(--text)",
        panel: "var(--panel)",
        muted: "var(--muted)",
        accent: "var(--accent)",
        line: "var(--line)",
      },
      borderRadius: {
        card: "var(--card-radius)",
      },
      boxShadow: {
        glow: "var(--glow)",
        panel: "var(--shadow)",
      },
    },
  },
  plugins: [animate],
};
