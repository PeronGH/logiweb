---
description: Svelte 5 pure-frontend SPA bundled by Bun. No Vite, no server.
globs: "*.ts, *.svelte, *.html, *.css, *.js, package.json"
alwaysApply: false
---

This is a **pure-frontend Svelte 5 single-page app** bundled by Bun, styled with **Tailwind CSS v4**.
It uses the official Bun plugins
[`bun-plugin-svelte`](https://github.com/oven-sh/bun/tree/main/packages/bun-plugin-svelte) and
[`bun-plugin-tailwind`](https://github.com/oven-sh/bun/tree/main/packages/bun-plugin-tailwind).
There is no backend — `bun run build` emits static files to `dist/` that any static host can serve.

## Toolchain

Default to Bun, never Node/npm/pnpm/Vite:

- `bun install` to install, `bun add` / `bun add -d` to change deps (never hand-edit `package.json` versions).
- `bun run <script>` for scripts, `bunx <pkg>` instead of `npx`.
- Bun loads `.env` automatically — don't add `dotenv`.

## Scripts

- `bun run dev` — fullstack dev server with HMR at http://localhost:3000 (runs `bun index.html`).
- `bun run build` — production bundle to `dist/` via `build.ts` (`Bun.build` + `SveltePlugin`).
- `bun run typecheck` — `svelte-check` (strict; type-checks `.ts` and `.svelte`).
- `bun run lint` — `eslint . && prettier --check .`
- `bun run format` — `prettier --write .`

## Layout

- `index.html` — entry; loads `src/main.ts` as a module.
- `src/main.ts` — mounts the app with Svelte's `mount()` and wires `import.meta.hot` for HMR.
- `src/app.css` — Tailwind entry (`@import "tailwindcss";`), linked from `index.html`.
- `src/App.svelte` — root component. `src/lib/` — other components.
- `static/` — static assets (e.g. `favicon.svg`) referenced from `index.html`.
- `bunfig.toml` — registers both Bun plugins under `[serve.static]` for the dev server.
- `build.ts` — production build (HTML entrypoint → `dist/`); registers both plugins.

## Conventions

- **Svelte 5 runes**: use `$state`, `$derived`, `$effect`, `$props`. Not the legacy `export let` / `$:` syntax.
- Components are `.svelte` with `<script lang="ts">`. TS in `<script>` works; the plugin is still
  pre-1.0, so **no Svelte preprocessors and no `<style lang="...">`** — plain `<style>` only.
- **Tailwind**: style with utility classes in markup. Tailwind v4 auto-detects sources, so `.svelte`
  classes are picked up with no content config. Do **not** put Tailwind directives (`@apply`, `@tailwind`)
  inside Svelte `<style>` blocks — `bun-plugin-svelte` can't process them. Use `src/app.css` for global CSS.
- **Code splitting**: the production build sets `splitting: true`, so `await import("./X.svelte")` becomes a
  lazily-loaded chunk. Without it Bun inlines dynamic imports into one bundle. Use dynamic imports for
  heavy or route-level components to keep the initial bundle small.
- **Static assets**: reference them from `index.html` (`<link rel="icon" href="./static/favicon.svg">`) or
  `import url from "./asset.svg"` in TS. Bun bundles, content-hashes, and rewrites the reference — in both
  the dev server and `Bun.build`. There is no copy-as-is `public/` dir; every asset goes through the bundler.
- Browser-only code: tsconfig ships DOM libs. `@types/bun` covers `build.ts` and `import.meta.hot`.
- Run `bun run lint` before committing; both ESLint and Prettier must pass.
