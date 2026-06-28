import type { HidppChannel } from "../channel";
import { Endpoint } from "../endpoint";
import { HidppError } from "../errors";

/**
 * Expands a `getSensorDpiList` value list (the bytes after the echoed sensor
 * index) into explicit, sorted, de-duplicated DPI values.
 *
 * Each entry is a big-endian `u16`. `0x0000` terminates the list (a list that
 * fills the response has no terminator). A value with its top 3 bits set
 * (`0xE000 | step`) is a compact range marker: its start is the previous value,
 * its end is the next value, and it expands to the on-grid values
 * `start + n*step <= end`.
 *
 * The grid is exact: a `step` that does not divide `end - start` stops before
 * `end`, so an off-grid `end` is not emitted. This matches Solaar and libratbag,
 * which only accept on-grid DPI values (an off-grid value is rejected on write)
 * — unlike OpenLogi, which force-appends `end`.
 */
export function parseDpiList(bytes: Uint8Array): number[] {
  const values: number[] = [];
  let offset = 0;

  while (offset + 1 < bytes.length) {
    const value = ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0);
    if (value === 0) break;

    if (value >> 13 === 0b111) {
      const step = value & 0x1fff;
      if (step === 0 || offset + 3 >= bytes.length) {
        throw new HidppError("malformed DPI range marker");
      }
      const start = values.at(-1);
      if (start === undefined) {
        throw new HidppError("DPI range marker without a preceding value");
      }
      const end = ((bytes[offset + 2] ?? 0) << 8) | (bytes[offset + 3] ?? 0);
      if (end < start) throw new HidppError("descending DPI range marker");
      for (let next = start + step; next <= end; next += step)
        values.push(next);
      offset += 4;
    } else {
      values.push(value);
      offset += 2;
    }
  }

  if (values.length === 0) throw new HidppError("empty DPI list");
  return [...new Set(values)].sort((a, b) => a - b);
}

/** The `AdjustableDpi` feature (id `0x2201`): read and set a sensor's DPI. */
export class AdjustableDpiFeature {
  static readonly ID = 0x2201;
  readonly #endpoint: Endpoint;

  constructor(
    channel: HidppChannel,
    deviceIndex: number,
    featureIndex: number,
  ) {
    this.#endpoint = new Endpoint(channel, deviceIndex, featureIndex);
  }

  /** Number of sensors the device exposes. */
  async getSensorCount(): Promise<number> {
    return (await this.#endpoint.call(0, [0, 0, 0]))[0] ?? 0;
  }

  /** Supported DPI values for a sensor, sorted ascending. */
  async getSensorDpiList(sensor = 0): Promise<number[]> {
    const payload = await this.#endpoint.call(1, [sensor, 0, 0]);
    return parseDpiList(payload.subarray(1));
  }

  /** Currently configured DPI for a sensor. */
  async getSensorDpi(sensor = 0): Promise<number> {
    const payload = await this.#endpoint.call(2, [sensor, 0, 0]);
    return ((payload[1] ?? 0) << 8) | (payload[2] ?? 0);
  }

  /** Sets the DPI for a sensor. */
  async setSensorDpi(dpi: number, sensor = 0): Promise<void> {
    await this.#endpoint.call(3, [sensor, (dpi >> 8) & 0xff, dpi & 0xff]);
  }
}
