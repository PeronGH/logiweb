import type { HidppChannel } from "./channel";
import { RECEIVER_INDEX, writeRegister } from "./hidpp10";
import { LOGITECH_VENDOR_ID } from "./webhid";

/**
 * Logi Bolt receiver support: discover the devices paired to a USB receiver so
 * each can be addressed by its pairing slot over the shared HID++ channel.
 *
 * Device-discovery uses the HID++ 1.0 notification trick (OpenLogi `bolt.rs` /
 * Solaar): enabling wireless notifications and writing the connection register
 * makes the receiver re-announce every connected device as a `0x41` connection
 * notification, and the register write is acknowledged only after those land.
 */
const BOLT_PRODUCT_ID = 0xc548;

const REG_NOTIFICATIONS = 0x00;
const REG_CONNECTIONS = 0x02;
const SUBID_DEVICE_CONNECTION = 0x41;

/** Whether a granted HID device is a (supported) Logitech receiver. */
export function isReceiver(device: HIDDevice): boolean {
  return (
    device.vendorId === LOGITECH_VENDOR_ID &&
    device.productId === BOLT_PRODUCT_ID
  );
}

/** A device paired to a receiver, addressed by its 1-based pairing slot. */
export interface PairedDevice {
  index: number;
  online: boolean;
  /** Wireless product id of the paired device. */
  wpid: number;
}

/**
 * Discovers the devices currently paired to the receiver on `channel`.
 *
 * Only currently-connected (online) devices announce themselves, so offline
 * pairings are absent — which is what we want, since only online devices answer
 * HID++ 2.0.
 */
export async function enumeratePairedDevices(
  channel: HidppChannel,
): Promise<PairedDevice[]> {
  const found = new Map<number, PairedDevice>();

  const unsubscribe = channel.addListener((report, matched) => {
    if (matched) return;
    const d = report.data;
    if (d[1] !== SUBID_DEVICE_CONNECTION) return;
    const flags = d[3] ?? 0;
    const index = d[0] ?? 0;
    found.set(index, {
      index,
      online: (flags & 0x40) === 0,
      wpid: ((d[5] ?? 0) << 8) | (d[4] ?? 0),
    });
  });

  try {
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
    // The trigger write resolves after the notifications; a short grace catches
    // any that the OS delivers immediately afterwards.
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
  } finally {
    unsubscribe();
  }

  return [...found.values()].sort((a, b) => a.index - b.index);
}
