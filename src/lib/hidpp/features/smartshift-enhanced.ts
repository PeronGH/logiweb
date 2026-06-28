import type { HidppChannel } from "../channel";
import { Endpoint } from "../endpoint";
import { WheelMode } from "./smartshift";

export interface SmartShiftEnhancedInfo {
  /** The device supports tunable ratchet torque. */
  tunableTorque: boolean;
  autoDisengageDefault: number;
  /** Default torque, as a percentage of {@link maxForce}. */
  defaultTunableTorque: number;
  /** Maximum force, in gram-force units. */
  maxForce: number;
}

export interface SmartShiftEnhancedStatus {
  wheelMode: WheelMode;
  autoDisengage: number;
  /** Current torque, as a percentage of the maximum force. */
  currentTunableTorque: number;
}

/**
 * Fields to update. The wire encodes `0` as "do not change", so a value of `0`
 * (or an omitted field) leaves that setting untouched.
 */
export interface SmartShiftEnhancedChange {
  wheelMode?: WheelMode;
  autoDisengage?: number;
  tunableTorque?: number;
}

/** The `SmartShiftWheelEnhanced` feature (id `0x2111`): adds tunable torque to SmartShift. */
export class SmartShiftEnhancedFeature {
  static readonly ID = 0x2111;
  readonly #endpoint: Endpoint;

  constructor(
    channel: HidppChannel,
    deviceIndex: number,
    featureIndex: number,
  ) {
    this.#endpoint = new Endpoint(channel, deviceIndex, featureIndex);
  }

  async getCapabilities(): Promise<SmartShiftEnhancedInfo> {
    const payload = await this.#endpoint.call(0, [0, 0, 0]);
    return {
      tunableTorque: ((payload[0] ?? 0) & 1) !== 0,
      autoDisengageDefault: payload[1] ?? 0,
      defaultTunableTorque: payload[2] ?? 0,
      maxForce: payload[3] ?? 0,
    };
  }

  async getRatchetControlMode(): Promise<SmartShiftEnhancedStatus> {
    return toStatus(await this.#endpoint.call(1, [0, 0, 0]));
  }

  /** Applies the change and returns the resulting status reported by the device. */
  async setRatchetControlMode(
    change: SmartShiftEnhancedChange,
  ): Promise<SmartShiftEnhancedStatus> {
    const payload = await this.#endpoint.call(2, [
      change.wheelMode ?? 0,
      change.autoDisengage ?? 0,
      change.tunableTorque ?? 0,
    ]);
    return toStatus(payload);
  }
}

function toStatus(payload: Uint8Array): SmartShiftEnhancedStatus {
  return {
    wheelMode:
      payload[0] === WheelMode.Freespin
        ? WheelMode.Freespin
        : WheelMode.Ratchet,
    autoDisengage: payload[1] ?? 0,
    currentTunableTorque: payload[2] ?? 0,
  };
}
