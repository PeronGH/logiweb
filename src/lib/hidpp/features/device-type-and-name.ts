import type { HidppChannel } from "../channel";
import { Endpoint } from "../endpoint";

/** Marketing device kind (OpenLogi `device_type_and_name`). */
export const DeviceType = {
  Keyboard: 0,
  RemoteControl: 1,
  Numpad: 2,
  Mouse: 3,
  Trackpad: 4,
  Trackball: 5,
  Presenter: 6,
  Receiver: 7,
  Headset: 8,
  Webcam: 9,
  SteeringWheel: 10,
  Joystick: 11,
  Gamepad: 12,
  Dock: 13,
  Speaker: 14,
  Microphone: 15,
  IlluminationLight: 16,
  ProgrammableController: 17,
  CarSimPedals: 18,
  Adapter: 19,
} as const;
export type DeviceType = (typeof DeviceType)[keyof typeof DeviceType];

const decoder = new TextDecoder();

/** The `DeviceTypeAndName` feature (id `0x0005`): marketing name and device kind. */
export class DeviceTypeAndNameFeature {
  static readonly ID = 0x0005;
  readonly #endpoint: Endpoint;

  constructor(
    channel: HidppChannel,
    deviceIndex: number,
    featureIndex: number,
  ) {
    this.#endpoint = new Endpoint(channel, deviceIndex, featureIndex);
  }

  /** Number of characters in the marketing name. */
  async getNameLength(): Promise<number> {
    return (await this.#endpoint.call(0, [0, 0, 0]))[0] ?? 0;
  }

  /** Marketing kind of the device. */
  async getType(): Promise<DeviceType> {
    return ((await this.#endpoint.call(2, [0, 0, 0]))[0] ?? 0) as DeviceType;
  }

  /**
   * Reads the full marketing name, chunk by chunk. Each response carries 3
   * (short) or 16 (long) name bytes; the next request starts where the last
   * left off, using the response's real width rather than the padded length.
   */
  async getName(): Promise<string> {
    const length = await this.getNameLength();
    const bytes: number[] = [];
    while (bytes.length < length) {
      const report = await this.#endpoint.callRaw(1, [bytes.length, 0, 0]);
      const chunk = report.data.subarray(3);
      if (chunk.length === 0) break;
      for (const byte of chunk) bytes.push(byte);
    }
    return decoder
      .decode(Uint8Array.from(bytes.slice(0, length)))
      .replace(/\0+$/, "");
  }
}
