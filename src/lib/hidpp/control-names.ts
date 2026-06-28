/**
 * Display names for common HID++ control ids (the `0x1b04` CONTROL namespace,
 * per Solaar `special_keys.CONTROL`). Cosmetic only — remapping is CID-based, so
 * an unknown id just shows as hex.
 */
const CONTROL_NAMES: Record<number, string> = {
  0x38: "Left Click",
  0x39: "Right Click",
  0x3a: "Middle Button",
  0x3b: "Back",
  0x3c: "Back",
  0x3d: "Forward",
  0x3e: "Forward",
  0x3f: "Scroll Left",
  0x40: "Scroll Right",
  0x9c: "Gesture Button",
  0x9d: "SmartShift",
  0xa8: "App Switch",
  0xa9: "Thumb Button",
  0xae: "Host 1",
  0xaf: "Host 2",
  0xb0: "Host 3",
};

/** A display name for a control id, or its hex form if unknown. */
export function controlName(cid: number): string {
  return CONTROL_NAMES[cid] ?? `Control 0x${cid.toString(16).padStart(2, "0")}`;
}
