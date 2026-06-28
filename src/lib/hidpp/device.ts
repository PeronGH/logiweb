import type { HidppChannel } from "./channel";
import { HidppError } from "./errors";
import {
  DIRECT_DEVICE_INDEX,
  ProtocolVersion,
  determineVersion,
  type VersionInfo,
} from "./protocol";
import { FeatureSetFeature } from "./features/feature-set";
import { RootFeature } from "./features/root";
import type { FeatureInfo } from "./types";

/** A feature class: constructible from a channel + indices, with a static feature id. */
export interface FeatureCtor<T> {
  readonly ID: number;
  new (channel: HidppChannel, deviceIndex: number, featureIndex: number): T;
}

/**
 * A HID++ 2.0 peripheral reached over a {@link HidppChannel}.
 *
 * For a directly-connected device (USB-wired or BLE-direct) the device index is
 * {@link DIRECT_DEVICE_INDEX} (`0xFF`). Devices behind a Bolt/Unifying receiver
 * use their 1-based pairing slot — receiver enumeration is a separate concern.
 */
export class HidppDevice {
  readonly channel: HidppChannel;
  readonly deviceIndex: number;
  readonly version: VersionInfo;
  readonly root: RootFeature;
  readonly #features = new Map<number, FeatureInfo>();

  private constructor(
    channel: HidppChannel,
    deviceIndex: number,
    version: VersionInfo,
  ) {
    this.channel = channel;
    this.deviceIndex = deviceIndex;
    this.version = version;
    this.root = new RootFeature(channel, deviceIndex, 0);
  }

  /**
   * Initialises the device by detecting its protocol version. Throws if no
   * device answers at `deviceIndex`, or if it only speaks HID++ 1.0.
   */
  static async open(
    channel: HidppChannel,
    deviceIndex = DIRECT_DEVICE_INDEX,
  ): Promise<HidppDevice> {
    const version = await determineVersion(channel, deviceIndex);
    if (!version)
      throw new HidppError(
        `no device responded at index 0x${deviceIndex.toString(16)}`,
      );
    if (version.version === ProtocolVersion.V10) {
      throw new HidppError("device only supports HID++ 1.0");
    }
    return new HidppDevice(channel, deviceIndex, version);
  }

  /**
   * Enumerates the device's feature table so features can be addressed by id.
   * Returns every discovered feature; must be called before {@link feature}.
   */
  async enumerateFeatures(): Promise<FeatureInfo[]> {
    const featureSetInfo = await this.root.getFeature(FeatureSetFeature.ID);
    if (!featureSetInfo) return [];

    this.#features.clear();
    this.#features.set(RootFeature.ID, {
      id: RootFeature.ID,
      index: 0,
      version: 0,
      type: parseEmptyType(),
    });
    const featureSet = new FeatureSetFeature(
      this.channel,
      this.deviceIndex,
      featureSetInfo.index,
    );
    const count = await featureSet.count();
    const discovered: FeatureInfo[] = [];
    for (let index = 1; index <= count; index++) {
      const entry = await featureSet.getFeature(index);
      const info: FeatureInfo = {
        id: entry.id,
        index,
        version: entry.version,
        type: entry.type,
      };
      this.#features.set(entry.id, info);
      discovered.push(info);
    }
    return discovered;
  }

  /** All enumerated features (empty until {@link enumerateFeatures} resolves). */
  get features(): FeatureInfo[] {
    return [...this.#features.values()];
  }

  /** Whether the device's feature table includes a feature. */
  supports<T>(ctor: FeatureCtor<T>): boolean {
    return this.#features.has(ctor.ID);
  }

  /** Constructs a feature wrapper bound to this device, or `undefined` if unsupported. */
  feature<T>(ctor: FeatureCtor<T>): T | undefined {
    const info = this.#features.get(ctor.ID);
    if (!info) return undefined;
    return new ctor(this.channel, this.deviceIndex, info.index);
  }
}

function parseEmptyType(): FeatureInfo["type"] {
  return {
    obsolete: false,
    hidden: false,
    engineering: false,
    manufacturingDeactivatable: false,
    complianceDeactivatable: false,
  };
}
