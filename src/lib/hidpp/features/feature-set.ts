import type { HidppChannel } from "../channel";
import { Endpoint } from "../endpoint";
import { parseFeatureType, type FeatureType } from "../types";

/** A feature id/type/version pair returned while enumerating a device's feature table. */
export interface FeatureSetEntry {
  id: number;
  type: FeatureType;
  version: number;
}

/** The `FeatureSet` feature (id `0x0001`): enumerates every feature a device supports. */
export class FeatureSetFeature {
  static readonly ID = 0x0001;
  readonly #endpoint: Endpoint;

  constructor(
    channel: HidppChannel,
    deviceIndex: number,
    featureIndex: number,
  ) {
    this.#endpoint = new Endpoint(channel, deviceIndex, featureIndex);
  }

  /** Number of features, excluding the root feature. */
  async count(): Promise<number> {
    return (await this.#endpoint.call(0, [0, 0, 0]))[0] ?? 0;
  }

  /** Feature at table `index` (1-based; index 0 is the root feature and is not queryable here). */
  async getFeature(index: number): Promise<FeatureSetEntry> {
    const payload = await this.#endpoint.call(1, [index, 0, 0]);
    return {
      id: ((payload[0] ?? 0) << 8) | (payload[1] ?? 0),
      type: parseFeatureType(payload[2] ?? 0),
      version: payload[3] ?? 0,
    };
  }
}
