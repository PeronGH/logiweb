import type { HidppChannel } from "../channel";
import { Endpoint } from "../endpoint";
import { parseFeatureType, type FeatureType } from "../types";

/** Information about a single feature, as returned by the root feature's lookup. */
export interface RootFeatureInfo {
  index: number;
  type: FeatureType;
  version: number;
}

/** The `Root` feature (id `0x0000`), supported by every HID++ 2.0 device at feature index 0. */
export class RootFeature {
  static readonly ID = 0x0000;
  readonly #endpoint: Endpoint;

  constructor(
    channel: HidppChannel,
    deviceIndex: number,
    featureIndex: number,
  ) {
    this.#endpoint = new Endpoint(channel, deviceIndex, featureIndex);
  }

  /** Looks up a feature by id, returning its table index/type/version, or `null` if unsupported. */
  async getFeature(id: number): Promise<RootFeatureInfo | null> {
    const payload = await this.#endpoint.call(0, [
      (id >> 8) & 0xff,
      id & 0xff,
      0x00,
    ]);
    if (payload[0] === 0) return null;
    return {
      index: payload[0] ?? 0,
      type: parseFeatureType(payload[1] ?? 0),
      version: payload[2] ?? 0,
    };
  }

  /** Pings the device; it echoes `data` back on success. */
  async ping(data = 0): Promise<number> {
    const payload = await this.#endpoint.call(1, [0x00, 0x00, data]);
    return payload[2] ?? 0;
  }
}
