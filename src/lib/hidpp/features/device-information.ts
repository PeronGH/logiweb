import type { HidppChannel } from "../channel";
import { Endpoint } from "../endpoint";

const ascii = new TextDecoder("ascii");

function hex(bytes: Uint8Array): string {
  return [...bytes]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

/** General device info from `getDeviceInfo`. */
export interface DeviceInfo {
  entityCount: number;
  unitId: string;
  modelId: string;
  /** Whether the serial number can be read (feature v4+). */
  serialSupported: boolean;
}

/** One firmware/hardware entity from `getFwInfo`. */
export interface FirmwareEntity {
  /** Entity type: 0 = main application, 1 = bootloader, 2 = hardware, … */
  type: number;
  /** Logitech version string, e.g. `MPM 27.01.B0009`. */
  version: string;
  /** Whether this is the active (responding) entity. */
  active: boolean;
}

/** The fields the UI shows for a device. */
export interface DeviceInfoSummary {
  firmware: string;
  modelId: string;
  serial: string | null;
}

/**
 * The `DeviceInformation` feature (id `0x0003`): firmware versions, model/unit
 * ids, and (v4+) the serial number. Layout and the hex version format are
 * verified against Solaar.
 */
export class DeviceInformationFeature {
  static readonly ID = 0x0003;
  readonly #endpoint: Endpoint;

  constructor(
    channel: HidppChannel,
    deviceIndex: number,
    featureIndex: number,
  ) {
    this.#endpoint = new Endpoint(channel, deviceIndex, featureIndex);
  }

  async getInfo(): Promise<DeviceInfo> {
    const p = await this.#endpoint.call(0, [0, 0, 0]);
    return {
      entityCount: p[0] ?? 0,
      unitId: hex(p.subarray(1, 5)),
      modelId: hex(p.subarray(7, 13)),
      serialSupported: ((p[14] ?? 0) & 1) !== 0,
    };
  }

  async getFirmware(index: number): Promise<FirmwareEntity> {
    const p = await this.#endpoint.call(1, [index, 0, 0]);
    const prefix = ascii.decode(p.subarray(1, 4)).replace(/\0+$/, "").trim();
    const major = (p[4] ?? 0).toString(16).padStart(2, "0").toUpperCase();
    const minor = (p[5] ?? 0).toString(16).padStart(2, "0").toUpperCase();
    const build = ((p[6] ?? 0) << 8) | (p[7] ?? 0);
    let version = `${prefix} ${major}.${minor}`.trim();
    if (build)
      version += `.B${build.toString(16).padStart(4, "0").toUpperCase()}`;
    return { type: p[0] ?? 0, version, active: ((p[8] ?? 0) & 1) !== 0 };
  }

  async getSerial(): Promise<string> {
    const p = await this.#endpoint.call(2, [0, 0, 0]);
    return ascii.decode(p.subarray(0, 12)).replace(/[\0\s]+$/, "");
  }

  /** Active main-application firmware, model id, and serial (when supported). */
  async summary(): Promise<DeviceInfoSummary> {
    const info = await this.getInfo();

    let activeMain: string | null = null;
    let firstMain: string | null = null;
    for (let index = 0; index < info.entityCount; index++) {
      const fw = await this.getFirmware(index);
      if (fw.type !== 0) continue; // main application only
      if (fw.active) {
        activeMain = fw.version;
        break;
      }
      firstMain ??= fw.version;
    }

    let serial: string | null = null;
    if (info.serialSupported) {
      serial = await this.getSerial().catch(() => null);
    }

    return {
      firmware: activeMain ?? firstMain ?? "",
      modelId: info.modelId,
      serial,
    };
  }
}
