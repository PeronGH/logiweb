import type { HidppChannel } from "../channel";
import { Endpoint } from "../endpoint";

export interface ChangeHostInfo {
  /** Number of host slots (Easy-Switch channels). */
  hostCount: number;
  /** Zero-based index of the currently-active host. */
  currentHost: number;
}

/**
 * The `ChangeHost` feature (id `0x1814`): switches the device to another
 * Easy-Switch host. Function map from OpenLogi (`change_host.rs`) and Solaar.
 */
export class ChangeHostFeature {
  static readonly ID = 0x1814;
  readonly #endpoint: Endpoint;

  constructor(
    channel: HidppChannel,
    deviceIndex: number,
    featureIndex: number,
  ) {
    this.#endpoint = new Endpoint(channel, deviceIndex, featureIndex);
  }

  async getHostInfo(): Promise<ChangeHostInfo> {
    const payload = await this.#endpoint.call(0, [0, 0, 0]);
    return { hostCount: payload[0] ?? 0, currentHost: payload[1] ?? 0 };
  }

  /**
   * Switches to the zero-based `host`. The device drops this connection at once
   * and never replies, so this resolves as soon as the request is written. An
   * unpaired slot puts the device into pairing mode on that channel.
   */
  setCurrentHost(host: number): Promise<void> {
    return this.#endpoint.notify(1, [host, 0, 0]);
  }
}
