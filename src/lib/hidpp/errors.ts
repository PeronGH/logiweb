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

const ERROR_NAMES: Record<number, string> = Object.fromEntries(
  Object.entries(HidppErrorCode).map(([name, code]) => [code, name]),
);

/** Human-readable name for a HID++ 2.0 error code, or its hex value if unknown. */
export function errorCodeName(code: number): string {
  return ERROR_NAMES[code] ?? `0x${code.toString(16).padStart(2, "0")}`;
}

/** Any failure originating from the HID++ stack: transport, timeout, or a device error response. */
export class HidppError extends Error {
  /** The HID++ 2.0 error code, present only when the device returned an error response. */
  readonly code: number | undefined;

  constructor(message: string, code?: number) {
    super(code === undefined ? message : `${message} (${errorCodeName(code)})`);
    this.name = "HidppError";
    this.code = code;
  }
}
