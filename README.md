# LogiWeb

A pure-frontend [Svelte 5](https://svelte.dev) single-page app that configures Logitech HID++ devices directly from the browser over [WebHID](https://wicg.github.io/webhid/) — DPI, SmartShift, report rate, and battery, with no native app or driver. Bundled by [Bun](https://bun.com), styled with [Tailwind CSS v4](https://tailwindcss.com), using the official [`bun-plugin-svelte`](https://github.com/oven-sh/bun/tree/main/packages/bun-plugin-svelte) and [`bun-plugin-tailwind`](https://github.com/oven-sh/bun/tree/main/packages/bun-plugin-tailwind). No Vite.

The HID++ protocol layer lives in `src/lib/hidpp/` as a frontend-agnostic TypeScript core: a `HidppChannel` over WebHID plus a catalog of feature wrappers. The wire format — feature ids, function indices, byte layouts, quirks like the DPI range-marker encoding — follows Logitech's HID++ protocol (largely documented by Logitech, with the receiver/pairing gaps reverse-engineered by the community). The TypeScript here was adapted from the [OpenLogi](https://github.com/AprilNEA/OpenLogi) Rust implementation and cross-checked against the authoritative sources — see [Credits](#credits).

**Requirements:** a Chromium-based browser (Chrome, Edge — WebHID is not in Firefox or Safari), served over HTTPS or `localhost`. Supports directly-connected devices (USB-wired or Bluetooth-direct) and devices paired to a **Logi Bolt or Unifying receiver** (each online pairing becomes its own card).

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

## Credits

LogiWeb does no novel protocol work — it stands on prior implementations and Logitech's own documentation. HID++ is largely **documented by Logitech**; the gaps (notably the HID++ 1.0 receiver and pairing registers) were reverse-engineered by the community over many years, chiefly the Solaar project and the Linux kernel.

- **[OpenLogi](https://github.com/AprilNEA/OpenLogi)** — the direct inspiration for LogiWeb, and the Rust implementation our HID++ core was adapted from. (Its `openlogi-hidpp` crate is itself a fork of the [`hidpp`](https://github.com/lus/logy) crate by Lukas Schulte Pelkum.)
- **[Solaar](https://github.com/pwr-Solaar/Solaar)** — the most complete open Logitech implementation, and our primary source of truth when verifying wire formats (battery, DPI, SmartShift, multi-host, receiver pairing).
- **[libratbag](https://github.com/libratbag/libratbag)** — cross-reference for sensor/DPI behaviour.
- **Linux [`hid-logitech-hidpp`](https://github.com/torvalds/linux/blob/master/drivers/hid/hid-logitech-hidpp.c)** — cross-reference for battery/charging semantics.
- **[Logitech/cpg-docs](https://github.com/Logitech/cpg-docs)** — Logitech's published HID++ 2.0 documentation.

Where OpenLogi and the authoritative sources disagreed, we followed the latter — and contributed fixes back where we could.

Not affiliated with Logitech. "Logitech", "Logi Bolt", and "Unifying" are trademarks of Logitech.
