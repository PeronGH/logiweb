import { HidppError } from "./errors";

/**
 * Low-level HID++ transport over a single WebHID device.
 *
 * HID++ rides on two vendor HID reports: a 7-byte "short" report (id `0x10`,
 * 6 payload bytes) and a 20-byte "long" report (id `0x11`, 19 payload bytes).
 * WebHID passes the report id separately from the data, so payload lengths here
 * exclude it. The matching/sw-id design mirrors OpenLogi's `channel.rs`, but the
 * read loop is replaced by WebHID's event-driven `inputreport`.
 */
export const SHORT_REPORT_ID = 0x10;
export const LONG_REPORT_ID = 0x11;
/** Short HID++ report payload length, excluding the report id. */
export const SHORT_PAYLOAD_LEN = 6;
/** Long HID++ report payload length, excluding the report id. */
export const LONG_PAYLOAD_LEN = 19;
/** Default budget for a request: the write plus the wait for a matching response. */
export const SEND_TIMEOUT_MS = 5000;

/** A raw HID++ report: the report id plus its payload (header + data), no id byte inside `data`. */
export interface RawReport {
  reportId: number;
  data: Uint8Array;
}

/** Receives every incoming HID++ report; `matched` is true when it satisfied a pending request. */
export type ReportListener = (report: RawReport, matched: boolean) => void;

interface Pending {
  predicate: (report: RawReport) => boolean;
  resolve: (report: RawReport) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Whether a device exposes a HID++ report (`0x10`/`0x11`). A receiver enumerates
 * several HID interfaces — boot keyboard/mouse, consumer, and the HID++ vendor
 * collection; only the last carries these reports. `collections` is populated at
 * enumeration, so this filters the non-HID++ interfaces before opening them.
 */
export function exposesHidpp(device: HIDDevice): boolean {
  for (const collection of device.collections) {
    const reports = [
      ...(collection.inputReports ?? []),
      ...(collection.outputReports ?? []),
    ];
    if (
      reports.some(
        (r) => r.reportId === SHORT_REPORT_ID || r.reportId === LONG_REPORT_ID,
      )
    ) {
      return true;
    }
  }
  return false;
}

export class HidppChannel {
  readonly device: HIDDevice;
  /** Whether the device exposes the short (`0x10`) HID++ report. */
  supportsShort = false;
  /** Whether the device exposes the long (`0x11`) HID++ report. */
  supportsLong = false;

  #pending: Pending[] = [];
  #listeners = new Set<ReportListener>();
  #swId = 0x01;
  #rotateSwId = true;
  readonly #onInput = (event: HIDInputReportEvent): void => {
    this.#handleInput(event);
  };

  private constructor(device: HIDDevice) {
    this.device = device;
  }

  /** Opens `device` (if needed), verifies it speaks HID++, and starts listening for reports. */
  static async open(device: HIDDevice): Promise<HidppChannel> {
    const channel = new HidppChannel(device);
    if (!device.opened) await device.open();
    channel.#detectReportSupport();
    if (!channel.supportsShort && !channel.supportsLong) {
      throw new HidppError("device does not expose HID++ reports");
    }
    device.addEventListener("inputreport", channel.#onInput);
    return channel;
  }

  /** Stops listening, rejects in-flight requests, and closes the device. */
  async close(): Promise<void> {
    this.device.removeEventListener("inputreport", this.#onInput);
    for (const pending of this.#pending) {
      clearTimeout(pending.timer);
      pending.reject(new HidppError("channel closed"));
    }
    this.#pending = [];
    if (this.device.opened) await this.device.close();
  }

  #detectReportSupport(): void {
    for (const collection of this.device.collections) {
      const reports = [
        ...(collection.inputReports ?? []),
        ...(collection.outputReports ?? []),
      ];
      for (const report of reports) {
        if (report.reportId === SHORT_REPORT_ID) this.supportsShort = true;
        if (report.reportId === LONG_REPORT_ID) this.supportsLong = true;
      }
    }
  }

  /**
   * The software id to stamp on the next request. Rotating it (the default)
   * keeps concurrent requests to the same function distinguishable by response,
   * and skips `0`, which the device reserves for unsolicited notifications.
   */
  nextSwId(): number {
    const id = this.#swId;
    if (this.#rotateSwId)
      this.#swId = this.#swId >= 0x0f ? 0x01 : this.#swId + 1;
    return id;
  }

  setRotatingSwId(enabled: boolean): void {
    this.#rotateSwId = enabled;
  }

  /** Subscribes to every incoming report; returns an unsubscribe function. */
  addListener(listener: ReportListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /**
   * Writes a report and resolves with the first incoming report that satisfies
   * `predicate`, or rejects on timeout / write failure.
   */
  sendRaw(
    reportId: number,
    data: Uint8Array<ArrayBuffer>,
    predicate: (report: RawReport) => boolean,
    timeoutMs = SEND_TIMEOUT_MS,
  ): Promise<RawReport> {
    let entry!: Pending;
    const result = new Promise<RawReport>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#removePending(entry);
        reject(new HidppError("request timed out before the device responded"));
      }, timeoutMs);
      entry = { predicate, resolve, reject, timer };
      this.#pending.push(entry);
    });

    return this.device
      .sendReport(reportId, data)
      .then(() => result)
      .catch((cause: unknown) => {
        clearTimeout(entry.timer);
        this.#removePending(entry);
        if (cause instanceof HidppError) throw cause;
        throw new HidppError(`failed to write HID++ report: ${String(cause)}`);
      });
  }

  #removePending(entry: Pending): void {
    const index = this.#pending.indexOf(entry);
    if (index !== -1) this.#pending.splice(index, 1);
  }

  #handleInput(event: HIDInputReportEvent): void {
    if (event.reportId !== SHORT_REPORT_ID && event.reportId !== LONG_REPORT_ID)
      return;
    const data = new Uint8Array(
      event.data.buffer,
      event.data.byteOffset,
      event.data.byteLength,
    );
    const report: RawReport = { reportId: event.reportId, data };

    const index = this.#pending.findIndex((pending) =>
      pending.predicate(report),
    );
    let matched = false;
    if (index !== -1) {
      const [pending] = this.#pending.splice(index, 1);
      if (pending) {
        clearTimeout(pending.timer);
        pending.resolve(report);
        matched = true;
      }
    }

    for (const listener of [...this.#listeners]) listener(report, matched);
  }
}
