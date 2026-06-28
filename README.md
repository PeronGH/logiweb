# bun-svelte-spa

A pure-frontend [Svelte 5](https://svelte.dev) single-page app bundled by [Bun](https://bun.com), styled with [Tailwind CSS v4](https://tailwindcss.com). Uses the official [`bun-plugin-svelte`](https://github.com/oven-sh/bun/tree/main/packages/bun-plugin-svelte) and [`bun-plugin-tailwind`](https://github.com/oven-sh/bun/tree/main/packages/bun-plugin-tailwind). No Vite.

## Usage

```sh
bun install      # install dependencies
bun run dev      # start the dev server with HMR (http://localhost:3000)
bun run build    # bundle to ./dist (static files for any host)
bun run typecheck # svelte-check (type-checks .ts + .svelte)
bun run lint     # eslint + prettier --check
bun run format   # prettier --write
```

## Layout

- `index.html` — entry point; loads `src/main.ts` as a module.
- `src/main.ts` — mounts the Svelte app and wires up HMR.
- `src/app.css` — Tailwind entry (`@import "tailwindcss";`).
- `src/App.svelte` — root component.
- `src/lib/` — components.
- `static/` — assets referenced from `index.html` (bundled & content-hashed by Bun).
- `bunfig.toml` — registers the Svelte and Tailwind plugins for the dev server.
- `build.ts` — production build via `Bun.build` with both plugins.
