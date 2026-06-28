import type { HidppChannel } from "../channel";
import { Endpoint } from "../endpoint";

/**
 * The legacy `ReportRate` feature (id `0x8060`): report interval in milliseconds.
 *
 * The supported-rates response is a bitmask where bit `n` means `(n + 1) ms` is
 * supported (bit 0 = 1 ms … bit 7 = 8 ms).
 */
export class ReportRateFeature {
  static readonly ID = 0x8060;
  readonly #endpoint: Endpoint;

  constructor(
    channel: HidppChannel,
    deviceIndex: number,
    featureIndex: number,
  ) {
    this.#endpoint = new Endpoint(channel, deviceIndex, featureIndex);
  }

  /** Supported report intervals in milliseconds, ascending. */
  async getSupportedRates(): Promise<number[]> {
    const mask = (await this.#endpoint.call(0, [0, 0, 0]))[0] ?? 0;
    const rates: number[] = [];
    for (let bit = 0; bit < 8; bit++) {
      if (mask & (1 << bit)) rates.push(bit + 1);
    }
    return rates;
  }

  /** Active report interval in milliseconds. */
  async getReportRate(): Promise<number> {
    return (await this.#endpoint.call(1, [0, 0, 0]))[0] ?? 0;
  }

  /** Sets the report interval in milliseconds; the device rejects unsupported values. */
  async setReportRate(intervalMs: number): Promise<void> {
    await this.#endpoint.call(2, [intervalMs, 0, 0]);
  }
}
