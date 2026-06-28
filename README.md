# LogiWeb

Configure Logitech HID++ devices — DPI, SmartShift, report rate, battery, and multi-host channels — straight from the browser over [WebHID](https://wicg.github.io/webhid/). No app, no driver. A pure-frontend [Svelte 5](https://svelte.dev) SPA bundled by [Bun](https://bun.com) and styled with [Tailwind CSS v4](https://tailwindcss.com).

**Requirements:** a Chromium-based browser (Chrome or Edge — not Firefox or Safari), over HTTPS or `localhost`. Works with USB-wired and Bluetooth-direct devices, and devices paired to a Logi Bolt or Unifying receiver.

## Usage

```sh
bun install       # install dependencies
bun run dev       # dev server with HMR (http://localhost:3000)
bun run build     # static bundle → ./dist
bun run typecheck # svelte-check
bun run lint      # eslint + prettier --check
bun run format    # prettier --write
```

## Layout

- `src/lib/hidpp/` — frontend-agnostic HID++ core: `channel.ts` (WebHID transport), `protocol.ts` (HID++ 2.0 framing), `hidpp10.ts` (receiver registers), `device.ts` (feature enumeration), `receiver.ts`, and `features/` (one wrapper per feature id).
- `src/lib/ui/` — `device-store.svelte.ts` (connection state) and `DeviceCard.svelte` with one `panels/` component per HID++ feature.
- `src/App.svelte` — app shell; `index.html` / `src/main.ts` — entry; `build.ts` / `bunfig.toml` — Bun build and dev plugins.

## Credits

Inspired by and adapted from [OpenLogi](https://github.com/AprilNEA/OpenLogi). HID++ wire formats reference [Solaar](https://github.com/pwr-Solaar/Solaar), [libratbag](https://github.com/libratbag/libratbag), the Linux [`hid-logitech-hidpp`](https://github.com/torvalds/linux/blob/master/drivers/hid/hid-logitech-hidpp.c) driver, and [Logitech's HID++ docs](https://github.com/Logitech/cpg-docs).

Not affiliated with Logitech. "Logitech", "Logi Bolt", and "Unifying" are trademarks of Logitech.

## License

[MIT](LICENSE)
