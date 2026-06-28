import {
  LONG_PAYLOAD_LEN,
  LONG_REPORT_ID,
  SHORT_PAYLOAD_LEN,
  SHORT_REPORT_ID,
  type HidppChannel,
  type RawReport,
} from "./channel";
import { HidppError } from "./errors";

/**
 * HID++ 2.0 message framing and version detection.
 *
 * Wire format (payload bytes, excluding the report id):
 *   [0] device index   [1] feature index   [2] (function << 4) | software id
 *   [3..] arguments (3 bytes for short, 16 for long)
 *
 * An error response sets the feature index (byte 1) to `0xFF`, echoes the
 * request's byte-2 header into byte 3, and carries the error code in byte 4.
 * Reverse-engineered from OpenLogi `protocol/v20.rs` and `protocol/v10.rs`.
 */

export const ProtocolVersion = {
  V10: "v1.0",
  V20: "v2.0",
} as const;
export type ProtocolVersion =
  (typeof ProtocolVersion)[keyof typeof ProtocolVersion];

export interface VersionInfo {
  version: ProtocolVersion;
  /** Target-software hint (`protocol_num`); only meaningful for v2.0. */
  protocolNum: number;
  /** Secondary target-software hint; only meaningful for v2.0. */
  targetSw: number;
}

/** The device index used for a directly-connected device (USB-wired or BLE-direct). */
export const DIRECT_DEVICE_INDEX = 0xff;

const ERROR_FEATURE_INDEX = 0xff;

/** Pads a response's payload (everything after the 3-byte header) to a 16-byte array. */
export function extendPayload(report: RawReport): Uint8Array {
  const extended = new Uint8Array(16);
  extended.set(report.data.subarray(3, 3 + 16));
  return extended;
}

/**
 * Sends a HID++ 2.0 request and resolves with the raw matching response.
 *
 * Throws {@link HidppError} if the device returns an error response. When the
 * device exposes only the long report (e.g. a BLE-direct mouse), an outgoing
 * short request is re-framed as long — the header sits at the same offsets.
 */
export async function callV20(
  channel: HidppChannel,
  deviceIndex: number,
  featureIndex: number,
  functionId: number,
  args: Uint8Array,
  long: boolean,
): Promise<RawReport> {
  const softwareId = channel.nextSwId();
  const header2 = ((functionId & 0x0f) << 4) | (softwareId & 0x0f);
  const useLong = long || (!channel.supportsShort && channel.supportsLong);

  if (useLong && !channel.supportsLong) {
    throw new HidppError("device does not support long HID++ reports");
  }
  if (!useLong && !channel.supportsShort) {
    throw new HidppError("device does not support short HID++ reports");
  }

  const reportId = useLong ? LONG_REPORT_ID : SHORT_REPORT_ID;
  const data = new Uint8Array(useLong ? LONG_PAYLOAD_LEN : SHORT_PAYLOAD_LEN);
  data[0] = deviceIndex;
  data[1] = featureIndex;
  data[2] = header2;
  data.set(args.subarray(0, useLong ? 16 : 3), 3);

  const predicate = (report: RawReport): boolean => {
    const payload = report.data;
    if (payload.length < 3) return false;
    const normal =
      payload[0] === deviceIndex &&
      payload[1] === featureIndex &&
      payload[2] === header2;
    const error =
      payload.length >= 5 &&
      payload[0] === deviceIndex &&
      payload[1] === ERROR_FEATURE_INDEX &&
      payload[2] === featureIndex &&
      payload[3] === header2;
    return normal || error;
  };

  const response = await channel.sendRaw(reportId, data, predicate);
  if (response.data[1] === ERROR_FEATURE_INDEX) {
    throw new HidppError(
      "HID++ feature returned an error",
      response.data[4] ?? 0,
    );
  }
  return response;
}

/**
 * Determines a device's protocol version by sending the v2.0 ping (feature 0,
 * function 1). A v2.0 device echoes a defined response; a v1.0-only device
 * replies with an "invalid sub id" error, which pins it to v1.0.
 *
 * Returns `null` when no device answers at `deviceIndex`.
 */
export async function determineVersion(
  channel: HidppChannel,
  deviceIndex: number,
): Promise<VersionInfo | null> {
  const softwareId = channel.nextSwId();
  const header2 = (0x1 << 4) | (softwareId & 0x0f);
  const data = new Uint8Array(SHORT_PAYLOAD_LEN);
  data[0] = deviceIndex;
  data[1] = 0x00;
  data[2] = header2;

  const isV20 = (p: Uint8Array): boolean =>
    p[0] === deviceIndex && p[1] === 0x00 && p[2] === header2;
  // HID++ 1.0 error: byte 1 is the error sub-id (0x8F), byte 2 echoes the sent
  // sub-id (our feature index 0x00), byte 3 echoes the register (our byte 2).
  const isV10Error = (p: Uint8Array): boolean =>
    p.length >= 5 &&
    p[0] === deviceIndex &&
    p[1] === 0x8f &&
    p[2] === 0x00 &&
    p[3] === header2;

  let response: RawReport;
  try {
    response = await channel.sendRaw(
      SHORT_REPORT_ID,
      data,
      (r) => isV20(r.data) || isV10Error(r.data),
    );
  } catch {
    return null;
  }

  const payload = response.data;
  if (isV20(payload)) {
    return {
      version: ProtocolVersion.V20,
      protocolNum: payload[3] ?? 0,
      targetSw: payload[4] ?? 0,
    };
  }
  // 0x01 == InvalidSubId: the device rejected the v2.0 ping, so it is v1.0-only.
  if (isV10Error(payload) && payload[4] === 0x01) {
    return { version: ProtocolVersion.V10, protocolNum: 0, targetSw: 0 };
  }
  return null;
}
