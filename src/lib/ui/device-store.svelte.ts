import {
  DeviceType,
  DeviceTypeAndNameFeature,
  HidppChannel,
  HidppDevice,
  getGrantedLogitechDevices,
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
  key: string;
  name: string;
  kind: string;
  featureCount: number;
  channel: HidppChannel;
  device: HidppDevice;
}

function describe(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/**
 * Owns the set of connected devices and the connect/restore lifecycle. Feature
 * state (DPI, battery, …) is not held here — each panel reads and writes its own
 * feature directly off {@link ManagedDevice.device}, so the store stays thin as
 * the feature catalog grows.
 */
class DeviceStore {
  readonly supported = isWebHidSupported();
  devices = $state<ManagedDevice[]>([]);
  status = $state<string | null>(null);
  busy = $state(false);

  /** Prompts the user to grant a device, then adds whatever they pick. */
  async connect(): Promise<void> {
    if (!this.supported) return;
    this.busy = true;
    this.status = null;
    try {
      for (const hid of await requestLogitechDevices()) await this.#add(hid);
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
      for (const hid of await getGrantedLogitechDevices()) await this.#add(hid);
    } catch (cause) {
      this.status = describe(cause);
    }
  }

  /** Closes a device's channel and drops it from the list. */
  async remove(key: string): Promise<void> {
    const managed = this.devices.find((entry) => entry.key === key);
    if (!managed) return;
    this.devices = this.devices.filter((entry) => entry.key !== key);
    await managed.channel.close().catch(() => undefined);
  }

  async #add(hid: HIDDevice): Promise<void> {
    const key = `${hid.vendorId.toString(16)}:${hid.productId.toString(16)}:${hid.productName}`;
    if (this.devices.some((entry) => entry.key === key)) return;

    let channel: HidppChannel | undefined;
    try {
      channel = await HidppChannel.open(hid);
      const device = await HidppDevice.open(channel);
      await device.enumerateFeatures();

      const naming = device.feature(DeviceTypeAndNameFeature);
      const name = naming
        ? await naming.getName()
        : hid.productName || "Logitech device";
      const kind = naming ? (KIND_LABELS[await naming.getType()] ?? "") : "";

      this.devices = [
        ...this.devices,
        {
          key,
          name,
          kind,
          featureCount: device.features.length,
          channel,
          device,
        },
      ];
    } catch (cause) {
      if (channel) await channel.close().catch(() => undefined);
      this.status = `${hid.productName || "Device"}: ${describe(cause)}`;
    }
  }
}

export const deviceStore = new DeviceStore();
