import type { HidppChannel } from "./channel";
import { RECEIVER_INDEX, writeRegister } from "./hidpp10";
import { LOGITECH_VENDOR_ID } from "./webhid";

/**
 * Logi Bolt and Unifying receiver support: discover and track the devices
 * paired to a USB receiver so each can be addressed by its pairing slot over
 * the shared HID++ channel.
 *
 * A paired device announces itself with a HID++ 1.0 `0x41` connection
 * notification (OpenLogi `bolt.rs` / `unifying.rs` / Solaar `DJ_PAIRING`). The
 * same notification reports both wake and sleep via the link-established flag
 * (`data[3] & 0x40`), so one persistent watcher covers live add/remove. Writing
 * the connection register re-announces every currently-online device. The
 * slot/online/wpid fields are identical across Bolt and Unifying.
 */
const RECEIVER_PRODUCT_IDS = new Set<number>([
  0xc548, // Logi Bolt
  0xc52b, // Unifying
  0xc532, // Unifying
]);

const REG_NOTIFICATIONS = 0x00;
const REG_CONNECTIONS = 0x02;
const SUBID_DEVICE_CONNECTION = 0x41;

/** Whether a granted HID device is a (supported) Logitech receiver. */
export function isReceiver(device: HIDDevice): boolean {
  return (
    device.vendorId === LOGITECH_VENDOR_ID &&
    RECEIVER_PRODUCT_IDS.has(device.productId)
  );
}

/** A device paired to a receiver, addressed by its 1-based pairing slot. */
export interface PairedDevice {
  index: number;
  online: boolean;
  /** Wireless product id of the paired device. */
  wpid: number;
}

/** Parses a `0x41` device-connection notification, or `null` if it isn't one. */
function parseConnection(data: Uint8Array): PairedDevice | null {
  if (data[1] !== SUBID_DEVICE_CONNECTION) return null;
  const flags = data[3] ?? 0;
  return {
    index: data[0] ?? 0,
    online: (flags & 0x40) === 0,
    wpid: ((data[5] ?? 0) << 8) | (data[4] ?? 0),
  };
}

/**
 * Subscribes to a receiver's connection notifications — fired when a paired
 * device wakes or sleeps, and (after {@link triggerDeviceArrival}) once for each
 * currently-online device. Returns an unsubscribe function.
 */
export function watchConnections(
  channel: HidppChannel,
  handler: (device: PairedDevice) => void,
): () => void {
  return channel.addListener((report, matched) => {
    if (matched) return;
    const paired = parseConnection(report.data);
    if (paired) handler(paired);
  });
}

/**
 * Enables wireless notifications (so later wake/sleep events keep arriving) and
 * asks the receiver to re-announce every connected device now.
 */
export async function triggerDeviceArrival(
  channel: HidppChannel,
): Promise<void> {
  await writeRegister(
    channel,
    RECEIVER_INDEX,
    REG_NOTIFICATIONS,
    [0x00, 0x01, 0x00],
  );
  await writeRegister(
    channel,
    RECEIVER_INDEX,
    REG_CONNECTIONS,
    [0x02, 0x00, 0x00],
  );
}
