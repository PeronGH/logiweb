import type { HidppChannel } from "../channel";
import { Endpoint } from "../endpoint";

/** Scroll-wheel ratchet mode. */
export const WheelMode = {
  Freespin: 1,
  Ratchet: 2,
} as const;
export type WheelMode = (typeof WheelMode)[keyof typeof WheelMode];

export interface RatchetControlMode {
  /** The mode the wheel is set to (does not reflect auto-disengage state). */
  wheelMode: WheelMode;
  /** Quarter-turns/second before the wheel auto-disengages; `0xFF` disables auto-disengage. */
  autoDisengage: number;
  autoDisengageDefault: number;
}

/** Fields to update; omitted fields (or `0`) are left unchanged on the device. */
export interface RatchetControlModeChange {
  wheelMode?: WheelMode;
  autoDisengage?: number;
  autoDisengageDefault?: number;
}

/** The `SmartShift` feature (id `0x2110`): ratchet/free-spin wheel control. */
export class SmartShiftFeature {
  static readonly ID = 0x2110;
  readonly #endpoint: Endpoint;

  constructor(
    channel: HidppChannel,
    deviceIndex: number,
    featureIndex: number,
  ) {
    this.#endpoint = new Endpoint(channel, deviceIndex, featureIndex);
  }

  async getRatchetControlMode(): Promise<RatchetControlMode> {
    const payload = await this.#endpoint.call(0, [0, 0, 0]);
    return {
      wheelMode: (payload[0] ?? 0) as WheelMode,
      autoDisengage: payload[1] ?? 0,
      autoDisengageDefault: payload[2] ?? 0,
    };
  }

  async setRatchetControlMode(change: RatchetControlModeChange): Promise<void> {
    await this.#endpoint.call(1, [
      change.wheelMode ?? 0,
      change.autoDisengage ?? 0,
      change.autoDisengageDefault ?? 0,
    ]);
  }
}
