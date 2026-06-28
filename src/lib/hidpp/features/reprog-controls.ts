import type { HidppChannel } from "../channel";
import { Endpoint } from "../endpoint";

/** A reprogrammable control (button/key) from the `0x1b04` control table. */
export interface Control {
  cid: number;
  taskId: number;
  /** A virtual (non-physical) control — usually hidden from remap UIs. */
  virtual: boolean;
  /** Control ids this control may be remapped to (derived from its group mask). */
  remapTargets: number[];
  /** Current remap target cid, or `null` for the control's default behaviour. */
  remappedTo: number | null;
}

/**
 * The `Reprogrammable Controls` feature (id `0x1b04`, "SpecialKeysMseButtons").
 *
 * Supports the browser-viable subset: enumerate controls and apply on-device
 * CID→CID remaps. A control may be remapped to any control whose `group` is set
 * in its `groupMask` (verified against Solaar). Diverting a control to a
 * host-side action is out of scope — that needs a host agent to act on the
 * events, which a web page cannot do.
 */
export class ReprogControlsFeature {
  static readonly ID = 0x1b04;
  readonly #endpoint: Endpoint;

  constructor(
    channel: HidppChannel,
    deviceIndex: number,
    featureIndex: number,
  ) {
    this.#endpoint = new Endpoint(channel, deviceIndex, featureIndex);
  }

  /** Controls that can be remapped on-device, each with its valid targets. */
  async listControls(): Promise<Control[]> {
    const count = (await this.#endpoint.call(0, [0, 0, 0]))[0] ?? 0;

    const rows: {
      cid: number;
      taskId: number;
      flags1: number;
      group: number;
      groupMask: number;
    }[] = [];
    for (let index = 0; index < count; index++) {
      const args = new Array<number>(16).fill(0);
      args[0] = index;
      const p = await this.#endpoint.callLong(1, args);
      rows.push({
        cid: ((p[0] ?? 0) << 8) | (p[1] ?? 0),
        taskId: ((p[2] ?? 0) << 8) | (p[3] ?? 0),
        flags1: p[4] ?? 0,
        group: p[6] ?? 0,
        groupMask: p[7] ?? 0,
      });
    }

    // Map each group number (1..8) to the cids that belong to it.
    const groupCids = new Map<number, number[]>();
    for (const row of rows) {
      if (row.group !== 0)
        groupCids.set(row.group, [
          ...(groupCids.get(row.group) ?? []),
          row.cid,
        ]);
    }

    const controls: Control[] = [];
    for (const row of rows) {
      const targets: number[] = [];
      for (let bit = 0; bit < 8; bit++) {
        if (row.groupMask & (1 << bit)) {
          for (const cid of groupCids.get(bit + 1) ?? []) {
            if (cid !== row.cid) targets.push(cid);
          }
        }
      }
      const remappedTo =
        targets.length > 0 ? (await this.#getRemap(row.cid)) || null : null;
      controls.push({
        cid: row.cid,
        taskId: row.taskId,
        virtual: (row.flags1 & 0x80) !== 0,
        remapTargets: targets,
        remappedTo,
      });
    }
    return controls;
  }

  /** Remaps a control to `targetCid`, or restores default behaviour with `0`. */
  async remap(cid: number, targetCid: number): Promise<void> {
    const args = new Array<number>(16).fill(0);
    args[0] = (cid >> 8) & 0xff;
    args[1] = cid & 0xff;
    args[3] = (targetCid >> 8) & 0xff;
    args[4] = targetCid & 0xff;
    await this.#endpoint.callLong(3, args);
  }

  /** Current remap target cid for a control (`0` = none). */
  async #getRemap(cid: number): Promise<number> {
    const p = await this.#endpoint.call(2, [(cid >> 8) & 0xff, cid & 0xff, 0]);
    return ((p[3] ?? 0) << 8) | (p[4] ?? 0);
  }
}
