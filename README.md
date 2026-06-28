# LogiWeb

A pure-frontend [Svelte 5](https://svelte.dev) single-page app that configures Logitech HID++ devices directly from the browser over [WebHID](https://wicg.github.io/webhid/) — DPI, SmartShift, report rate, and battery, with no native app or driver. Bundled by [Bun](https://bun.com), styled with [Tailwind CSS v4](https://tailwindcss.com), using the official [`bun-plugin-svelte`](https://github.com/oven-sh/bun/tree/main/packages/bun-plugin-svelte) and [`bun-plugin-tailwind`](https://github.com/oven-sh/bun/tree/main/packages/bun-plugin-tailwind). No Vite.

The HID++ protocol layer lives in `src/lib/hidpp/` as a frontend-agnostic TypeScript core: a `HidppChannel` over WebHID plus a catalog of feature wrappers. The wire format (feature ids, function indices, byte layouts, quirks like the DPI range-marker encoding) is reverse-engineered from the [OpenLogi](https://github.com/AprilNEA/OpenLogi) Rust project.

**Requirements:** a Chromium-based browser (Chrome, Edge — WebHID is not in Firefox or Safari), served over HTTPS or `localhost`. Supports directly-connected devices (USB-wired or Bluetooth-direct) and devices paired to a **Logi Bolt receiver** (each online pairing becomes its own card). Unifying receivers aren't handled yet.

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
- `src/App.svelte` — thin shell: a connect bar plus a card per connected device.
- `src/lib/hidpp/` — the frontend-agnostic HID++ core: `channel.ts` (WebHID transport), `protocol.ts` (HID++ 2.0 framing + version detection), `device.ts` (feature enumeration), and `features/` (one wrapper per feature id).
- `src/lib/ui/` — the UI, structured to mirror the lib: `device-store.svelte.ts` (connection/device-list state), `DeviceCard.svelte` (composes panels gated by `device.supports(...)`), and `panels/` — **one self-contained panel per HID++ feature** that reads and writes its own feature. Adding a feature to the lib is matched by adding a panel here.
- `static/` — assets referenced from `index.html` (bundled & content-hashed by Bun).
- `bunfig.toml` — registers the Svelte and Tailwind plugins for the dev server.
- `build.ts` — production build via `Bun.build` with both plugins.
