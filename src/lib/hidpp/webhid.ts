/** Logitech USB vendor id — every HID++ device reports it. */
export const LOGITECH_VENDOR_ID = 0x046d;

/** Whether the current browser exposes the WebHID API (Chromium-based only). */
export function isWebHidSupported(): boolean {
  return typeof navigator !== "undefined" && "hid" in navigator;
}

/**
 * Prompts the user to grant access to a Logitech device. Must be called from a
 * user gesture (e.g. a click) in a secure context (HTTPS or localhost).
 */
export async function requestLogitechDevices(): Promise<HIDDevice[]> {
  return navigator.hid.requestDevice({
    filters: [{ vendorId: LOGITECH_VENDOR_ID }],
  });
}

/** Logitech devices the user has already granted access to (no prompt). */
export async function getGrantedLogitechDevices(): Promise<HIDDevice[]> {
  const devices = await navigator.hid.getDevices();
  return devices.filter((device) => device.vendorId === LOGITECH_VENDOR_ID);
}
