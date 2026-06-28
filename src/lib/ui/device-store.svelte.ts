import {
  DIRECT_DEVICE_INDEX,
  DeviceType,
  DeviceTypeAndNameFeature,
  HidppChannel,
  HidppDevice,
  getGrantedLogitechDevices,
  isReceiver,
  isWebHidSupported,
  requestLogitechDevices,
  triggerDeviceArrival,
  watchConnections,
  type PairedDevice,
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
 * Owns the connected devices and their lifecycle. A direct device yields one
 * card. A receiver keeps its one channel open and a card appears or disappears
 * per online paired device as the receiver reports wake/sleep — the card set is
 * driven entirely by connection notifications. Channels (and their receiver
 * watchers) are torn down once their last card is removed or on hotplug-away.
 */
class DeviceStore {
  readonly supported = isWebHidSupported();
  devices = $state<ManagedDevice[]>([]);
  status = $state<string | null>(null);
  busy = $state(false);

  #channels = new Map<string, HidppChannel>();
  #receiverWatchers = new Map<string, () => void>();
  #openingSlots = new Set<string>();
  #started = false;

  /**
   * Attaches already-granted devices and starts watching for hotplug events, so
   * a granted device plugged in appears automatically and an unplugged one
   * disappears. Idempotent.
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

  /** Drops a device's card, tearing down its channel once no card still uses it. */
  async remove(key: string): Promise<void> {
    const managed = this.devices.find((entry) => entry.key === key);
    if (!managed) return;
    this.devices = this.devices.filter((entry) => entry.key !== key);
    if (
      !this.devices.some((entry) => entry.channelKey === managed.channelKey)
    ) {
      await this.#closeChannel(managed.channelKey);
    }
  }

  async #attach(hid: HIDDevice): Promise<void> {
    const channelKey = channelKeyOf(hid);
    if (this.#channels.has(channelKey)) return;

    let channel: HidppChannel | undefined;
    try {
      channel = await HidppChannel.open(hid);
      this.#channels.set(channelKey, channel);

      if (isReceiver(hid)) {
        // Watch first so the re-announced devices (and later wake/sleep) all
        // flow through one handler; the channel stays open with zero cards
        // until a device comes online.
        this.#receiverWatchers.set(
          channelKey,
          watchConnections(
            channel,
            (paired) => void this.#onConnection(channelKey, paired),
          ),
        );
        await triggerDeviceArrival(channel);
      } else {
        const card = await this.#deviceCard(
          channelKey,
          channel,
          DIRECT_DEVICE_INDEX,
          hid.productName || "Logitech device",
        );
        this.devices = [...this.devices, card];
      }
    } catch (cause) {
      await this.#closeChannel(channelKey);
      this.status = `${hid.productName || "Device"}: ${describe(cause)}`;
    }
  }

  /** Drops every card on a hotplugged-away device's channel and tears it down. */
  async #detach(hid: HIDDevice): Promise<void> {
    const channelKey = channelKeyOf(hid);
    if (!this.#channels.has(channelKey)) return;
    this.devices = this.devices.filter(
      (entry) => entry.channelKey !== channelKey,
    );
    await this.#closeChannel(channelKey);
  }

  /** Adds or removes a paired device's card as the receiver reports it online/offline. */
  async #onConnection(channelKey: string, paired: PairedDevice): Promise<void> {
    const channel = this.#channels.get(channelKey);
    if (!channel) return;
    const key = `${channelKey}#${paired.index.toString(16)}`;

    if (!paired.online) {
      this.devices = this.devices.filter((entry) => entry.key !== key);
      return;
    }
    if (
      this.#openingSlots.has(key) ||
      this.devices.some((entry) => entry.key === key)
    )
      return;

    this.#openingSlots.add(key);
    try {
      const card = await this.#deviceCard(
        channelKey,
        channel,
        paired.index,
        `Device ${paired.index.toString()}`,
      );
      // The receiver may have detached, or the card been added, while opening.
      if (
        this.#channels.get(channelKey) === channel &&
        !this.devices.some((e) => e.key === key)
      ) {
        this.devices = [...this.devices, card];
      }
    } catch {
      // Slot stopped answering HID++ 2.0 (e.g. slept mid-open) — leave it out.
    } finally {
      this.#openingSlots.delete(key);
    }
  }

  async #closeChannel(channelKey: string): Promise<void> {
    this.#receiverWatchers.get(channelKey)?.();
    this.#receiverWatchers.delete(channelKey);
    const channel = this.#channels.get(channelKey);
    this.#channels.delete(channelKey);
    await channel?.close().catch(() => undefined);
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
