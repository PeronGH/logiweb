/**
 * Display names for common HID++ control ids (the `0x1b04` CONTROL namespace,
 * per Solaar `special_keys.CONTROL`). Cosmetic only — remapping is CID-based, so
 * an unknown id just shows as hex.
 */
const CONTROL_NAMES: Record<number, string> = {
  0x50: "Left Click",
  0x51: "Right Click",
  0x52: "Middle Button",
  0x53: "Back",
  0x54: "Back",
  0x55: "Back",
  0x56: "Forward",
  0x57: "Forward",
  0x58: "Forward",
  0x59: "Button 6",
  0x5a: "Scroll Left",
  0x5b: "Tilt Left",
  0x5c: "Scroll Right",
  0x5d: "Tilt Right",
  0x5e: "Button 9",
  0x5f: "Button 10",
  0x60: "Button 11",
  0x61: "Button 12",
};

/** A display name for a control id, or its hex form if unknown. */
export function controlName(cid: number): string {
  return CONTROL_NAMES[cid] ?? `Control 0x${cid.toString(16).padStart(2, "0")}`;
}
