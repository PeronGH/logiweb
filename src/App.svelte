<script lang="ts">
  import {
    AdjustableDpiFeature,
    BatteryStatus,
    DeviceType,
    DeviceTypeAndNameFeature,
    HidppChannel,
    HidppDevice,
    ReportRateFeature,
    SmartShiftFeature,
    UnifiedBatteryFeature,
    WheelMode,
    getGrantedLogitechDevices,
    isWebHidSupported,
    requestLogitechDevices,
  } from "./lib/hidpp";

  interface Card {
    key: string;
    name: string;
    kind: string;
    battery: {
      percentage: number;
      hasPercentage: boolean;
      status: string;
    } | null;
    dpi: number | null;
    dpiList: number[];
    wheelMode: WheelMode | null;
    reportRateMs: number | null;
    features: number;
  }

  const supported = isWebHidSupported();
  let cards = $state<Card[]>([]);
  let status = $state<string | null>(null);
  let busy = $state(false);

  // Non-reactive: the live channel/device per card, keyed by card.key. These
  // are connection handles, not view state, so a plain Map is intentional.
  // eslint-disable-next-line svelte/prefer-svelte-reactivity -- handles, not reactive state
  const connections = new Map<
    string,
    { channel: HidppChannel; device: HidppDevice }
  >();

  const STATUS_NAMES: Record<number, string> = {
    [BatteryStatus.Discharging]: "Discharging",
    [BatteryStatus.Charging]: "Charging",
    [BatteryStatus.ChargingSlow]: "Charging (slow)",
    [BatteryStatus.Full]: "Full",
    [BatteryStatus.Error]: "Error",
  };
  const KIND_NAMES: Record<number, string> = {
    [DeviceType.Mouse]: "Mouse",
    [DeviceType.Keyboard]: "Keyboard",
    [DeviceType.Trackball]: "Trackball",
    [DeviceType.Trackpad]: "Trackpad",
    [DeviceType.Numpad]: "Numpad",
    [DeviceType.Presenter]: "Presenter",
    [DeviceType.Headset]: "Headset",
  };

  async function addDevice(hid: HIDDevice): Promise<void> {
    const key = `${hid.vendorId.toString(16)}:${hid.productId.toString(16)}:${hid.productName}`;
    if (connections.has(key)) return;

    let channel: HidppChannel | undefined;
    try {
      channel = await HidppChannel.open(hid);
      const device = await HidppDevice.open(channel);
      await device.enumerateFeatures();
      connections.set(key, { channel, device });
      cards = [...cards, await readCard(key, hid, device)];
    } catch (cause) {
      if (channel) await channel.close().catch(() => undefined);
      const label = hid.productName || "Device";
      status = `${label}: ${cause instanceof Error ? cause.message : String(cause)}`;
    }
  }

  async function readCard(
    key: string,
    hid: HIDDevice,
    device: HidppDevice,
  ): Promise<Card> {
    const card: Card = {
      key,
      name: hid.productName || "Logitech device",
      kind: "",
      battery: null,
      dpi: null,
      dpiList: [],
      wheelMode: null,
      reportRateMs: null,
      features: device.features.length,
    };

    const naming = device.feature(DeviceTypeAndNameFeature);
    if (naming) {
      card.name = await naming.getName();
      card.kind = KIND_NAMES[await naming.getType()] ?? "";
    }
    const battery = device.feature(UnifiedBatteryFeature);
    if (battery) {
      const caps = await battery.getCapabilities();
      const info = await battery.getInfo();
      card.battery = {
        percentage: info.percentage,
        hasPercentage: caps.hasPercentage,
        status: STATUS_NAMES[info.status] ?? "Unknown",
      };
    }
    const dpi = device.feature(AdjustableDpiFeature);
    if (dpi) {
      card.dpiList = await dpi.getSensorDpiList();
      card.dpi = await dpi.getSensorDpi();
    }
    const smartShift = device.feature(SmartShiftFeature);
    if (smartShift)
      card.wheelMode = (await smartShift.getRatchetControlMode()).wheelMode;
    const reportRate = device.feature(ReportRateFeature);
    if (reportRate) card.reportRateMs = await reportRate.getReportRate();

    return card;
  }

  function patch(key: string, mutate: (card: Card) => void): void {
    const card = cards.find((entry) => entry.key === key);
    if (card) mutate(card);
  }

  async function connect(): Promise<void> {
    if (!supported) return;
    busy = true;
    status = null;
    try {
      for (const hid of await requestLogitechDevices()) await addDevice(hid);
    } catch (cause) {
      status = cause instanceof Error ? cause.message : String(cause);
    } finally {
      busy = false;
    }
  }

  async function setDpi(key: string, dpi: number): Promise<void> {
    const conn = connections.get(key);
    const feature = conn?.device.feature(AdjustableDpiFeature);
    if (!feature) return;
    await feature.setSensorDpi(dpi);
    patch(key, (card) => (card.dpi = dpi));
  }

  async function toggleWheelMode(key: string): Promise<void> {
    const conn = connections.get(key);
    const feature = conn?.device.feature(SmartShiftFeature);
    const card = cards.find((entry) => entry.key === key);
    if (!feature || !card) return;
    if (card.wheelMode === null) return;
    const next =
      card.wheelMode === WheelMode.Ratchet
        ? WheelMode.Freespin
        : WheelMode.Ratchet;
    await feature.setRatchetControlMode({ wheelMode: next });
    patch(key, (entry) => (entry.wheelMode = next));
  }

  $effect(() => {
    if (!supported) return;
    void (async () => {
      for (const hid of await getGrantedLogitechDevices()) await addDevice(hid);
    })();
  });
</script>

<main class="mx-auto mt-12 max-w-2xl px-4">
  <header class="text-center">
    <h1 class="text-3xl font-bold tracking-tight">Logitech device console</h1>
    <p class="mt-2 text-sm text-gray-600">
      Configure HID++ devices over WebHID — DPI, SmartShift, report rate,
      battery. No app, no driver.
    </p>
  </header>

  {#if !supported}
    <p
      class="mt-8 rounded-lg bg-amber-50 p-4 text-center text-sm text-amber-800"
    >
      WebHID isn't available in this browser. Use a Chromium-based browser
      (Chrome, Edge) over HTTPS or localhost.
    </p>
  {:else}
    <div class="mt-6 flex justify-center">
      <button
        onclick={connect}
        disabled={busy}
        class="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {busy ? "Connecting…" : "Connect a device"}
      </button>
    </div>

    {#if status}
      <p class="mt-4 rounded-lg bg-red-50 p-3 text-center text-sm text-red-700">
        {status}
      </p>
    {/if}

    <div class="mt-8 space-y-4">
      {#each cards as card (card.key)}
        <section class="rounded-xl border border-gray-200 p-5 shadow-sm">
          <div class="flex items-baseline justify-between">
            <h2 class="text-lg font-semibold">{card.name}</h2>
            <span class="text-xs text-gray-400"
              >{card.kind} · {card.features} features</span
            >
          </div>

          <dl class="mt-4 space-y-3 text-sm">
            {#if card.battery}
              <div class="flex items-center justify-between">
                <dt class="text-gray-500">Battery</dt>
                <dd class="font-medium">
                  {card.battery.hasPercentage
                    ? `${card.battery.percentage.toString()}%`
                    : "—"}
                  <span class="text-gray-400">({card.battery.status})</span>
                </dd>
              </div>
            {/if}

            {#if card.dpi !== null}
              <div class="flex items-center justify-between">
                <dt class="text-gray-500">DPI</dt>
                <dd>
                  {#if card.dpiList.length > 0}
                    <select
                      class="rounded border border-gray-300 px-2 py-1"
                      value={card.dpi}
                      onchange={(event) =>
                        setDpi(card.key, Number(event.currentTarget.value))}
                    >
                      {#each card.dpiList as value (value)}
                        <option {value}>{value}</option>
                      {/each}
                    </select>
                  {:else}
                    <span class="font-medium">{card.dpi}</span>
                  {/if}
                </dd>
              </div>
            {/if}

            {#if card.wheelMode !== null}
              <div class="flex items-center justify-between">
                <dt class="text-gray-500">Scroll wheel</dt>
                <dd>
                  <button
                    class="rounded border border-gray-300 px-3 py-1 font-medium hover:bg-gray-50"
                    onclick={() => toggleWheelMode(card.key)}
                  >
                    {card.wheelMode === WheelMode.Ratchet
                      ? "Ratchet"
                      : "Free-spin"}
                  </button>
                </dd>
              </div>
            {/if}

            {#if card.reportRateMs !== null}
              <div class="flex items-center justify-between">
                <dt class="text-gray-500">Report rate</dt>
                <dd class="font-medium">{card.reportRateMs} ms</dd>
              </div>
            {/if}
          </dl>
        </section>
      {/each}
    </div>
  {/if}
</main>
