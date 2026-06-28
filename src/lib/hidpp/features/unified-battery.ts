import type { HidppChannel } from "../channel";
import { Endpoint } from "../endpoint";

/** Approximate battery level (bitflag values, OpenLogi `unified_battery`). */
export const BatteryLevel = {
  Critical: 1,
  Low: 2,
  Good: 4,
  Full: 8,
} as const;
export type BatteryLevel = (typeof BatteryLevel)[keyof typeof BatteryLevel];

/** Battery charging status. */
export const BatteryStatus = {
  Discharging: 0,
  Charging: 1,
  ChargingSlow: 2,
  Full: 3,
  Error: 4,
} as const;
export type BatteryStatus = (typeof BatteryStatus)[keyof typeof BatteryStatus];

export interface BatteryCapabilities {
  /** Levels the device can report. */
  reportedLevels: BatteryLevel[];
  rechargeable: boolean;
  /** Whether {@link BatteryInfo.percentage} is meaningful (otherwise always 0). */
  hasPercentage: boolean;
}

export interface BatteryInfo {
  /** Charge percentage, or `0` when the device does not report a percentage. */
  percentage: number;
  level: BatteryLevel;
  status: BatteryStatus;
}

/** The `UnifiedBattery` feature (id `0x1004`): battery level, percentage, and charge state. */
export class UnifiedBatteryFeature {
  static readonly ID = 0x1004;
  readonly #endpoint: Endpoint;

  constructor(
    channel: HidppChannel,
    deviceIndex: number,
    featureIndex: number,
  ) {
    this.#endpoint = new Endpoint(channel, deviceIndex, featureIndex);
  }

  async getCapabilities(): Promise<BatteryCapabilities> {
    const payload = await this.#endpoint.call(0, [0, 0, 0]);
    const levelMask = payload[0] ?? 0;
    const flags = payload[1] ?? 0;
    const reportedLevels: BatteryLevel[] = [];
    if (levelMask & BatteryLevel.Critical)
      reportedLevels.push(BatteryLevel.Critical);
    if (levelMask & BatteryLevel.Low) reportedLevels.push(BatteryLevel.Low);
    if (levelMask & BatteryLevel.Good) reportedLevels.push(BatteryLevel.Good);
    if (levelMask & BatteryLevel.Full) reportedLevels.push(BatteryLevel.Full);
    return {
      reportedLevels,
      rechargeable: (flags & 1) !== 0,
      hasPercentage: (flags & (1 << 1)) !== 0,
    };
  }

  async getInfo(): Promise<BatteryInfo> {
    const payload = await this.#endpoint.call(1, [0, 0, 0]);
    return {
      percentage: payload[0] ?? 0,
      level: (payload[1] ?? 0) as BatteryLevel,
      status: (payload[2] ?? 0) as BatteryStatus,
    };
  }
}
