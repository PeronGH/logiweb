/**
 * HID++ 2.0 feature error codes, as returned in an error response's payload.
 *
 * Reverse-engineered values from OpenLogi (`protocol/v20.rs` `ErrorType`).
 */
export const HidppErrorCode = {
  NoError: 0,
  Unknown: 1,
  InvalidArgument: 2,
  OutOfRange: 3,
  HwError: 4,
  LogitechInternal: 5,
  InvalidFeatureIndex: 6,
  InvalidFunctionId: 7,
  Busy: 8,
  Unsupported: 9,
} as const;
export type HidppErrorCode =
  (typeof HidppErrorCode)[keyof typeof HidppErrorCode];

/**
 * HID++ 1.0 error codes, carried by a `0x8F` error response — from register
 * access, or from a receiver rejecting a request on behalf of a paired device.
 *
 * Values from Solaar (`hidpp10_constants.py` `ErrorCode`).
 */
export const Hidpp10ErrorCode = {
  InvalidSubId: 0x01,
  InvalidAddress: 0x02,
  InvalidValue: 0x03,
  ConnectionRequestFailed: 0x04,
  TooManyDevices: 0x05,
  AlreadyExists: 0x06,
  Busy: 0x07,
  UnknownDevice: 0x08,
  ResourceError: 0x09,
  RequestUnavailable: 0x0a,
  UnsupportedParameterValue: 0x0b,
  WrongPinCode: 0x0c,
} as const;
export type Hidpp10ErrorCode =
  (typeof Hidpp10ErrorCode)[keyof typeof Hidpp10ErrorCode];

/** Which HID++ error-code table a code belongs to; the two overlap numerically. */
export type ErrorProtocol = "v1.0" | "v2.0";

function namesOf(codes: Record<string, number>): Record<number, string> {
  return Object.fromEntries(
    Object.entries(codes).map(([name, code]) => [code, name]),
  );
}

const ERROR_NAMES: Record<ErrorProtocol, Record<number, string>> = {
  "v1.0": namesOf(Hidpp10ErrorCode),
  "v2.0": namesOf(HidppErrorCode),
};

/** Human-readable name for a HID++ error code of `protocol`, or its hex value if unknown. */
export function errorCodeName(code: number, protocol: ErrorProtocol): string {
  return (
    ERROR_NAMES[protocol][code] ?? `0x${code.toString(16).padStart(2, "0")}`
  );
}

/** Any failure originating from the HID++ stack: transport, timeout, or a device error response. */
export class HidppError extends Error {
  /** The error code, present only when the device or receiver returned an error response. */
  readonly code: number | undefined;
  /** The table `code` belongs to: {@link Hidpp10ErrorCode} or {@link HidppErrorCode}. */
  readonly protocol: ErrorProtocol | undefined;

  constructor(
    message: string,
    error?: { code: number; protocol: ErrorProtocol },
  ) {
    super(
      error === undefined
        ? message
        : `${message} (${errorCodeName(error.code, error.protocol)})`,
    );
    this.name = "HidppError";
    this.code = error?.code;
    this.protocol = error?.protocol;
  }
}
