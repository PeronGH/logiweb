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
 * HID++ 1.0 Register Access Protocol (RAP).
 *
 * Short message layout (payload, excluding report id):
 *   [0] device index   [1] sub-id   [2] register address   [3..] parameters
 *
 * An error response carries sub-id `0x8F`, echoes the request's sub-id in
 * byte 2 and the register address in byte 3, and the error code in byte 4.
 * Ported from OpenLogi `protocol/v10.rs`. Used for receiver registers, which
 * predate HID++ 2.0.
 */
const SET_REGISTER = 0x80;
const GET_REGISTER = 0x81;
const ERROR = 0x8f;

/** Device index addressing the receiver (or a corded device) itself. */
export const RECEIVER_INDEX = 0xff;

async function rap(
  channel: HidppChannel,
  deviceIndex: number,
  subId: number,
  address: number,
  params: readonly [number, number, number],
): Promise<RawReport> {
  // Receivers expose the short report; up-convert only if a transport somehow
  // offers long alone (mirrors the HID++ 2.0 path).
  const useLong = !channel.supportsShort && channel.supportsLong;
  const reportId = useLong ? LONG_REPORT_ID : SHORT_REPORT_ID;
  const data = new Uint8Array(useLong ? LONG_PAYLOAD_LEN : SHORT_PAYLOAD_LEN);
  data[0] = deviceIndex;
  data[1] = subId;
  data[2] = address;
  data[3] = params[0];
  data[4] = params[1];
  data[5] = params[2];

  const predicate = (report: RawReport): boolean => {
    const d = report.data;
    if (d.length < 4) return false;
    const ok = d[0] === deviceIndex && d[1] === subId && d[2] === address;
    const err =
      d[0] === deviceIndex &&
      d[1] === ERROR &&
      d[2] === subId &&
      d[3] === address;
    return ok || err;
  };

  const response = await channel.sendRaw(reportId, data, predicate);
  if (response.data[1] === ERROR) {
    throw new HidppError(
      "HID++ 1.0 register access failed",
      response.data[4] ?? 0,
    );
  }
  return response;
}

/** Reads a short (3-byte) register; returns the three value bytes. */
export async function readRegister(
  channel: HidppChannel,
  deviceIndex: number,
  address: number,
  params: readonly [number, number, number] = [0, 0, 0],
): Promise<Uint8Array> {
  const response = await rap(
    channel,
    deviceIndex,
    GET_REGISTER,
    address,
    params,
  );
  return response.data.subarray(3, 6);
}

/** Writes a short (3-byte) register. */
export async function writeRegister(
  channel: HidppChannel,
  deviceIndex: number,
  address: number,
  params: readonly [number, number, number],
): Promise<void> {
  await rap(channel, deviceIndex, SET_REGISTER, address, params);
}
