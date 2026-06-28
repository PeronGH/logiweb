import type { HidppChannel } from "../channel";
import { Endpoint } from "../endpoint";

/** Rate index → Hz, per the 0x8061 spec (index 0 = 125 Hz … 6 = 8000 Hz). */
const RATE_HZ = [125, 250, 500, 1000, 2000, 4000, 8000];

/**
 * The `ExtendedAdjustableReportRate` feature (id `0x8061`): polling rate in Hz
 * for high-rate (gaming) devices. Function map and the u16 rate bitmask are
 * verified against Solaar.
 */
export class ExtendedReportRateFeature {
  static readonly ID = 0x8061;
  readonly #endpoint: Endpoint;

  constructor(
    channel: HidppChannel,
    deviceIndex: number,
    featureIndex: number,
  ) {
    this.#endpoint = new Endpoint(channel, deviceIndex, featureIndex);
  }

  /** Supported polling rates (Hz) for the current connection, ascending. */
  async getSupportedRates(): Promise<number[]> {
    const payload = await this.#endpoint.call(1, [0, 0, 0]);
    const mask = ((payload[0] ?? 0) << 8) | (payload[1] ?? 0);
    const rates: number[] = [];
    RATE_HZ.forEach((hz, bit) => {
      if (mask & (1 << bit)) rates.push(hz);
    });
    return rates;
  }

  /** Active polling rate in Hz. */
  async getReportRate(): Promise<number> {
    const index = (await this.#endpoint.call(2, [0, 0, 0]))[0] ?? 0;
    return RATE_HZ[index] ?? 0;
  }

  /** Sets the polling rate (Hz) for the current connection. */
  async setReportRate(hz: number): Promise<void> {
    const index = RATE_HZ.indexOf(hz);
    if (index < 0) return;
    await this.#endpoint.call(3, [index, 0, 0]);
  }
}
