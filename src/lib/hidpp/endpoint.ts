import type { HidppChannel, RawReport } from "./channel";
import { callV20, extendPayload } from "./protocol";

/**
 * A feature's addressable `(device, feature)` endpoint on a channel.
 *
 * Mirrors OpenLogi's `FeatureEndpoint`: it centralises request framing so each
 * feature is just a set of `call(function, args)` wrappers over byte payloads.
 */
export class Endpoint {
  readonly #channel: HidppChannel;
  readonly #deviceIndex: number;
  readonly #featureIndex: number;

  constructor(
    channel: HidppChannel,
    deviceIndex: number,
    featureIndex: number,
  ) {
    this.#channel = channel;
    this.#deviceIndex = deviceIndex;
    this.#featureIndex = featureIndex;
  }

  /** Calls `functionId` with a 3-byte short payload; returns the response raw report. */
  callRaw(functionId: number, args: readonly number[]): Promise<RawReport> {
    return callV20(
      this.#channel,
      this.#deviceIndex,
      this.#featureIndex,
      functionId,
      Uint8Array.from(args),
      false,
    );
  }

  /** Calls `functionId` with a 3-byte short payload; returns the response payload padded to 16 bytes. */
  async call(functionId: number, args: readonly number[]): Promise<Uint8Array> {
    return extendPayload(await this.callRaw(functionId, args));
  }

  /** Calls `functionId` with a 16-byte long payload; returns the response payload padded to 16 bytes. */
  async callLong(
    functionId: number,
    args: readonly number[],
  ): Promise<Uint8Array> {
    const report = await callV20(
      this.#channel,
      this.#deviceIndex,
      this.#featureIndex,
      functionId,
      Uint8Array.from(args),
      true,
    );
    return extendPayload(report);
  }
}
