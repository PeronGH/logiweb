import type { HidppChannel } from "../channel";
import { Endpoint } from "../endpoint";

const decoder = new TextDecoder();

/** Capabilities and current state of the multi-host feature. */
export interface HostsInfo {
  /** Whether per-host friendly names can be read. */
  canReadNames: boolean;
  /** Number of host slots (Easy-Switch channels). */
  hostCount: number;
  /** Zero-based index of the currently-active host. */
  currentHost: number;
}

/** One Easy-Switch host slot. */
export interface HostSlot {
  /** Zero-based slot index. */
  index: number;
  /** Whether a host is paired to this slot. */
  paired: boolean;
  /** Whether this is the device's currently-active host. */
  current: boolean;
  /** The host's friendly name (e.g. a computer name), or `""` if unavailable. */
  name: string;
}

/**
 * The `HostsInfo` feature (id `0x1815`): the multi-host / Easy-Switch channels a
 * device pairs to. Function map and byte layout verified against Solaar.
 */
export class HostsInfoFeature {
  static readonly ID = 0x1815;
  readonly #endpoint: Endpoint;

  constructor(
    channel: HidppChannel,
    deviceIndex: number,
    featureIndex: number,
  ) {
    this.#endpoint = new Endpoint(channel, deviceIndex, featureIndex);
  }

  async getInfo(): Promise<HostsInfo> {
    const payload = await this.#endpoint.call(0, [0, 0, 0]);
    return {
      canReadNames: ((payload[0] ?? 0) & 0x01) !== 0,
      hostCount: payload[2] ?? 0,
      currentHost: payload[3] ?? 0,
    };
  }

  /** The host slots, with names when the device exposes them. */
  async listHosts(): Promise<HostSlot[]> {
    const info = await this.getInfo();
    const slots: HostSlot[] = [];
    for (let index = 0; index < info.hostCount; index++) {
      const status = await this.#endpoint.call(1, [index, 0, 0]);
      const paired = (status[1] ?? 0) !== 0;
      const nameLen = status[4] ?? 0;
      const name =
        info.canReadNames && paired ? await this.#getName(index, nameLen) : "";
      slots.push({ index, paired, current: index === info.currentHost, name });
    }
    return slots;
  }

  /** Reads a host's friendly name in 14-byte chunks (name bytes start at payload[2]). */
  async #getName(host: number, nameLen: number): Promise<string> {
    const bytes: number[] = [];
    while (bytes.length < nameLen) {
      const chunk = await this.#endpoint.call(3, [host, bytes.length, 0]);
      const take = Math.min(nameLen - bytes.length, 14);
      if (take === 0) break;
      for (let i = 0; i < take; i++) bytes.push(chunk[2 + i] ?? 0);
    }
    return decoder.decode(Uint8Array.from(bytes)).replace(/\0+$/, "");
  }
}
