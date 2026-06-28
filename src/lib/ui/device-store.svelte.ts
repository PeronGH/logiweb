import {
  DIRECT_DEVICE_INDEX,
  DeviceType,
  DeviceTypeAndNameFeature,
  HidppChannel,
  HidppDevice,
  enumeratePairedDevices,
  getGrantedLogitechDevices,
  isReceiver,
  isWebHidSupported,
  requestLogitechDevices,
} from "../hidpp";

const KIND_LABELS: Record<number, string> = {
  [DeviceType.Mouse]: "Mouse",
  [DeviceType.Keyboard]: "Keyboard",
  [DeviceType.Trackball]: "Trackball",
  [DeviceType.Trackpad]: "Trackpad",
  [DeviceType.Numpad]: "Numpad",
  [DeviceType.Presenter]: "Presenter",
  [DeviceType.Headset]: "Headset",
};

/** A connected device plus the metadata the UI shows in a card header. */
export interface ManagedDevice {
  /** Unique per device: `<channel>#<deviceIndex>`. */
  key: string;
  /** Identifies the shared HID channel a device rides on (the receiver, or itself). */
  channelKey: string;
  name: string;
  kind: string;
  featureCount: number;
  device: HidppDevice;
}

function describe(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

function channelKeyOf(device: HIDDevice): string {
  return `${device.vendorId.toString(16)}:${device.productId.toString(16)}:${device.productName}`;
}

/**
 * Owns the connected devices and the connect/restore lifecycle. A direct device
 * yields one card; a receiver fans its one channel out into a card per online
 * paired device. Channels are reference-counted by {@link ManagedDevice.channelKey}
 * and closed once their last card is removed.
 */
class DeviceStore {
  readonly supported = isWebHidSupported();
  devices = $state<ManagedDevice[]>([]);
  status = $state<string | null>(null);
  busy = $state(false);

  #channels = new Map<string, HidppChannel>();
  #started = false;

  /**
   * Attaches already-granted devices and starts watching for hotplug events, so
   * a granted device plugged in (or a paired device's receiver reconnecting)
   * appears automatically and an unplugged one disappears. Idempotent.
   */
  start(): void {
    if (!this.supported || this.#started) return;
    this.#started = true;
    navigator.hid.addEventListener(
      "connect",
      (event) => void this.#attach(event.device),
    );
    navigator.hid.addEventListener(
      "disconnect",
      (event) => void this.#detach(event.device),
    );
    void this.restore();
  }

  /** Prompts the user to grant a device, then attaches whatever they pick. */
  async connect(): Promise<void> {
    if (!this.supported) return;
    this.busy = true;
    this.status = null;
    try {
      for (const hid of await requestLogitechDevices()) await this.#attach(hid);
    } catch (cause) {
      this.status = describe(cause);
    } finally {
      this.busy = false;
    }
  }

  /** Re-attaches to already-granted devices, e.g. on page load. */
  async restore(): Promise<void> {
    if (!this.supported) return;
    try {
      for (const hid of await getGrantedLogitechDevices())
        await this.#attach(hid);
    } catch (cause) {
      this.status = describe(cause);
    }
  }

  /** Drops a device's card, closing its channel once no card still uses it. */
  async remove(key: string): Promise<void> {
    const managed = this.devices.find((entry) => entry.key === key);
    if (!managed) return;
    this.devices = this.devices.filter((entry) => entry.key !== key);
    if (
      !this.devices.some((entry) => entry.channelKey === managed.channelKey)
    ) {
      const channel = this.#channels.get(managed.channelKey);
      this.#channels.delete(managed.channelKey);
      await channel?.close().catch(() => undefined);
    }
  }

  /** Drops every card on a hotplugged-away device's channel and closes it. */
  async #detach(hid: HIDDevice): Promise<void> {
    const channelKey = channelKeyOf(hid);
    const channel = this.#channels.get(channelKey);
    if (!channel) return;
    this.#channels.delete(channelKey);
    this.devices = this.devices.filter(
      (entry) => entry.channelKey !== channelKey,
    );
    await channel.close().catch(() => undefined);
  }

  async #attach(hid: HIDDevice): Promise<void> {
    const channelKey = channelKeyOf(hid);
    if (this.#channels.has(channelKey)) return;

    let channel: HidppChannel | undefined;
    try {
      channel = await HidppChannel.open(hid);
      this.#channels.set(channelKey, channel);

      const cards = isReceiver(hid)
        ? await this.#receiverCards(channelKey, channel)
        : [
            await this.#deviceCard(
              channelKey,
              channel,
              DIRECT_DEVICE_INDEX,
              hid.productName || "Logitech device",
            ),
          ];

      if (cards.length === 0) {
        this.#channels.delete(channelKey);
        await channel.close().catch(() => undefined);
        this.status = `${hid.productName || "Receiver"}: no online devices found`;
        return;
      }
      this.devices = [...this.devices, ...cards];
    } catch (cause) {
      this.#channels.delete(channelKey);
      if (channel) await channel.close().catch(() => undefined);
      this.status = `${hid.productName || "Device"}: ${describe(cause)}`;
    }
  }

  async #receiverCards(
    channelKey: string,
    channel: HidppChannel,
  ): Promise<ManagedDevice[]> {
    const cards: ManagedDevice[] = [];
    for (const paired of await enumeratePairedDevices(channel)) {
      if (!paired.online) continue;
      try {
        cards.push(
          await this.#deviceCard(
            channelKey,
            channel,
            paired.index,
            `Device ${paired.index.toString()}`,
          ),
        );
      } catch {
        // A slot that doesn't answer HID++ 2.0 — skip it rather than fail the lot.
      }
    }
    return cards;
  }

  async #deviceCard(
    channelKey: string,
    channel: HidppChannel,
    deviceIndex: number,
    fallbackName: string,
  ): Promise<ManagedDevice> {
    const device = await HidppDevice.open(channel, deviceIndex);
    await device.enumerateFeatures();

    const naming = device.feature(DeviceTypeAndNameFeature);
    const name = naming ? await naming.getName() : fallbackName;
    const kind = naming ? (KIND_LABELS[await naming.getType()] ?? "") : "";

    return {
      key: `${channelKey}#${deviceIndex.toString(16)}`,
      channelKey,
      name,
      kind,
      featureCount: device.features.length,
      device,
    };
  }
}

export const deviceStore = new DeviceStore();
