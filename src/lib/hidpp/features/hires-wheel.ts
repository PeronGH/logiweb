import type { HidppChannel } from "../channel";
import { Endpoint } from "../endpoint";

export interface HiResWheelCapabilities {
  /** Hi-res counts produced per normal ratchet step. */
  multiplier: number;
  /** The wheel has a ratchet switch whose state the firmware can read. */
  hasSwitch: boolean;
  /** The wheel can invert its natively (HID) reported motion. */
  hasInvert: boolean;
}

export interface HiResWheelMode {
  /** Wheel motion goes to HID++ notifications instead of native HID. */
  diverted: boolean;
  /** Reports `multiplier` counts per ratchet step instead of one. */
  highResolution: boolean;
  /** Natively reported motion is negated (natural scrolling). */
  inverted: boolean;
}

const TARGET_BIT = 0x01;
const RESOLUTION_BIT = 0x02;
const INVERT_BIT = 0x04;
const HAS_SWITCH_BIT = 0x04;
const HAS_INVERT_BIT = 0x08;

/**
 * The `HiResWheel` feature (id `0x2121`): hi-res and inverted wheel reporting.
 * Layout from Logitech's x2121 spec, cross-checked against Solaar.
 */
export class HiResWheelFeature {
  static readonly ID = 0x2121;
  readonly #endpoint: Endpoint;

  constructor(
    channel: HidppChannel,
    deviceIndex: number,
    featureIndex: number,
  ) {
    this.#endpoint = new Endpoint(channel, deviceIndex, featureIndex);
  }

  async getCapabilities(): Promise<HiResWheelCapabilities> {
    const payload = await this.#endpoint.call(0, [0, 0, 0]);
    const flags = payload[1] ?? 0;
    return {
      multiplier: payload[0] ?? 0,
      hasSwitch: (flags & HAS_SWITCH_BIT) !== 0,
      hasInvert: (flags & HAS_INVERT_BIT) !== 0,
    };
  }

  async getMode(): Promise<HiResWheelMode> {
    return toMode(await this.#endpoint.call(1, [0, 0, 0]));
  }

  /** Sets the full mode; returns the mode echoed by the device. */
  async setMode(mode: HiResWheelMode): Promise<HiResWheelMode> {
    const byte =
      (mode.diverted ? TARGET_BIT : 0) |
      (mode.highResolution ? RESOLUTION_BIT : 0) |
      (mode.inverted ? INVERT_BIT : 0);
    return toMode(await this.#endpoint.call(2, [byte, 0, 0]));
  }

  /** Whether the ratchet is engaged; only meaningful when `hasSwitch`. */
  async getRatchetEngaged(): Promise<boolean> {
    const payload = await this.#endpoint.call(3, [0, 0, 0]);
    return ((payload[0] ?? 0) & 0x01) !== 0;
  }
}

function toMode(payload: Uint8Array): HiResWheelMode {
  const byte = payload[0] ?? 0;
  return {
    diverted: (byte & TARGET_BIT) !== 0,
    highResolution: (byte & RESOLUTION_BIT) !== 0,
    inverted: (byte & INVERT_BIT) !== 0,
  };
}
