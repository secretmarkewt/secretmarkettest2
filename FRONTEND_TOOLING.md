# Frontend Tooling

This project is currently a vanilla JavaScript SPA with a lightweight Node API. The tooling below improves redesign speed and code quality without forcing a React migration.

## Installed

- Tailwind CSS CLI with `tailwindcss-animate`
- `clsx`, `class-variance-authority`, `tailwind-merge`
- `zod`
- ESLint flat config
- Prettier
- VS Code extension recommendations
- VS Code MCP server template

## Not Installed Yet

The project does not currently use React, so React-only UI packages were intentionally not added to runtime dependencies:

- shadcn/ui
- Radix React components
- Lucide React
- Framer Motion
- React Hook Form

Install these when the frontend is migrated to React/Vite or Next.js. Until then, they would add package weight without being usable by the current browser-loaded scripts.

## Scripts

```bash
npm run lint
npm run format:check
npm run build:css
npm run verify
```

`npm run build:css` generates `assets/tailwind.css` from `tailwind.css`. The existing site still uses `styles.css`; link the generated Tailwind file only when new Tailwind-based screens are introduced.

## MCP

The workspace includes `.vscode/mcp.json` with templates for:

- Playwright MCP
- Context7 MCP
- BrowserTools MCP
- Filesystem MCP
- GitHub MCP

GitHub MCP requires a personal access token when VS Code starts that server.

## VS Code

Recommended extensions are stored in `.vscode/extensions.json`:

- Tailwind CSS IntelliSense
- ESLint
- Prettier
- Error Lens
- Path Intellisense
- Auto Rename Tag
- GitLens
- Color Highlight
- Iconify IntelliSense
