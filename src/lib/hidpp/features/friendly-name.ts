import type { HidppChannel } from "../channel";
import { Endpoint } from "../endpoint";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
/** Name bytes carried per read/write, after the echoed char index. */
const CHUNK_LEN = 15;

export interface FriendlyNameLengths {
  /** Current name length, in bytes. */
  length: number;
  /** Longest name the device stores, in bytes. */
  maxLength: number;
  /** Length of the factory-default name, in bytes. */
  defaultLength: number;
}

/**
 * The `DeviceFriendlyName` feature (id `0x0007`): the user-settable name a
 * device advertises (e.g. over Bluetooth). Names are UTF-8, read and written in
 * 15-byte chunks addressed by byte offset. Function map from OpenLogi
 * (`device_friendly_name.rs`), reads cross-checked against Solaar.
 */
export class DeviceFriendlyNameFeature {
  static readonly ID = 0x0007;
  readonly #endpoint: Endpoint;

  constructor(
    channel: HidppChannel,
    deviceIndex: number,
    featureIndex: number,
  ) {
    this.#endpoint = new Endpoint(channel, deviceIndex, featureIndex);
  }

  async getLengths(): Promise<FriendlyNameLengths> {
    const payload = await this.#endpoint.call(0, [0, 0, 0]);
    return {
      length: payload[0] ?? 0,
      maxLength: payload[1] ?? 0,
      defaultLength: payload[2] ?? 0,
    };
  }

  async getName(): Promise<string> {
    return this.#readName(1, (await this.getLengths()).length);
  }

  async getDefaultName(): Promise<string> {
    return this.#readName(2, (await this.getLengths()).defaultLength);
  }

  /**
   * Writes `name`, truncated to the device's maximum at a UTF-8 character
   * boundary. Zero-filled chunks also cover the old name's tail, so a shorter
   * name leaves no stale bytes behind. Returns the name as stored.
   */
  async setName(name: string): Promise<string> {
    const { length, maxLength } = await this.getLengths();
    const bytes = truncateUtf8(name, maxLength);
    const span = Math.max(bytes.length, Math.min(length, maxLength));
    for (let offset = 0; offset < span; offset += CHUNK_LEN) {
      const args = new Array<number>(1 + CHUNK_LEN).fill(0);
      args[0] = offset;
      bytes
        .subarray(offset, offset + CHUNK_LEN)
        .forEach((byte, i) => (args[1 + i] = byte));
      await this.#endpoint.callLong(3, args);
    }
    return decoder.decode(bytes);
  }

  /** Restores the factory-default name. */
  async resetName(): Promise<void> {
    await this.#endpoint.call(4, [0, 0, 0]);
  }

  async #readName(functionId: number, length: number): Promise<string> {
    const bytes = new Uint8Array(length);
    for (let offset = 0; offset < length; offset += CHUNK_LEN) {
      const payload = await this.#endpoint.call(functionId, [offset, 0, 0]);
      bytes.set(
        payload.subarray(1, 1 + Math.min(CHUNK_LEN, length - offset)),
        offset,
      );
    }
    return decoder.decode(bytes).replace(/\0+$/, "");
  }
}

function truncateUtf8(text: string, maxBytes: number): Uint8Array {
  const bytes = encoder.encode(text);
  if (bytes.length <= maxBytes) return bytes;
  // While the first cut-off byte is a continuation byte (10xxxxxx), the
  // character it belongs to straddles the cut, so cut before it.
  let end = maxBytes;
  while (end > 0 && ((bytes[end] ?? 0) & 0xc0) === 0x80) end--;
  return bytes.subarray(0, end);
}
