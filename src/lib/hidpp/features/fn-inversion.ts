import type { HidppChannel } from "../channel";
import { Endpoint } from "../endpoint";

/** Host-slot sentinel meaning "the currently-active host". */
const CURRENT_HOST = 0xff;

/**
 * The `FnInversionForMultiHostDevices` feature (id `0x40a3`): whether the F-row
 * keys send their media/special function by default (Fn inverted) or F1–F12.
 * Operates on the current host. Function map verified against Solaar (`K375sFnSwap`).
 */
export class FnInversionFeature {
  static readonly ID = 0x40a3;
  readonly #endpoint: Endpoint;

  constructor(
    channel: HidppChannel,
    deviceIndex: number,
    featureIndex: number,
  ) {
    this.#endpoint = new Endpoint(channel, deviceIndex, featureIndex);
  }

  /** Whether Fn inversion is enabled for the current host. */
  async getInverted(): Promise<boolean> {
    const payload = await this.#endpoint.call(0, [CURRENT_HOST, 0, 0]);
    return (payload[1] ?? 0) !== 0;
  }

  /** Sets Fn inversion for the current host. */
  async setInverted(inverted: boolean): Promise<void> {
    await this.#endpoint.call(1, [CURRENT_HOST, inverted ? 1 : 0, 0]);
  }
}
