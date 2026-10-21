<script lang="ts">
  import { onMount } from "svelte";
  import {
    SmartShiftEnhancedFeature,
    SmartShiftFeature,
    WheelMode,
    type HidppDevice,
  } from "../../hidpp";
  import SettingRow from "../SettingRow.svelte";

  let { device }: { device: HidppDevice } = $props();
  const enhanced = $derived(device.feature(SmartShiftEnhancedFeature));
  const feature = $derived(enhanced ?? device.feature(SmartShiftFeature));

  /** Speeds at or above this map to `0xFF`: never auto-disengage. Matches Solaar's range. */
  const MAX_THRESHOLD = 50;
  const NEVER = 0xff;

  let mode = $state<WheelMode | null>(null);
  let threshold = $state(MAX_THRESHOLD);
  let torque = $state<number | null>(null);
  let busy = $state(false);
  let error = $state<string | null>(null);

  onMount(() => void load());

  async function load(): Promise<void> {
    if (!feature) return;
    try {
      const status = await feature.getRatchetControlMode();
      mode = status.wheelMode;
      threshold = Math.min(status.autoDisengage, MAX_THRESHOLD);
      if (enhanced && (await enhanced.getCapabilities()).tunableTorque) {
        torque = (await enhanced.getRatchetControlMode()).currentTunableTorque;
      }
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    }
  }

  async function apply(change: {
    wheelMode?: WheelMode;
    autoDisengage?: number;
    tunableTorque?: number;
  }): Promise<void> {
    if (!feature) return;
    busy = true;
    try {
      if (enhanced) await enhanced.setRatchetControlMode(change);
      else await feature.setRatchetControlMode(change);
      if (change.wheelMode !== undefined) mode = change.wheelMode;
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    } finally {
      busy = false;
    }
  }
</script>

<SettingRow label="Scroll wheel">
  {#if error}
    <span class="text-red-600">{error}</span>
  {:else if mode === null}
    <span class="text-gray-400">…</span>
  {:else}
    <button
      class="rounded border border-gray-300 px-3 py-1 font-medium hover:bg-gray-50 disabled:opacity-50"
      disabled={busy}
      onclick={() =>
        void apply({
          wheelMode:
            mode === WheelMode.Ratchet ? WheelMode.Freespin : WheelMode.Ratchet,
        })}
    >
      {mode === WheelMode.Ratchet ? "Ratchet" : "Free-spin"}
    </button>
  {/if}
</SettingRow>
{#if mode === WheelMode.Ratchet && !error}
  <SettingRow label="SmartShift">
    <span class="flex items-center gap-2">
      <input
        type="range"
        min="1"
        max={MAX_THRESHOLD}
        bind:value={threshold}
        disabled={busy}
        title="Wheel speed that switches to free-spin"
        onchange={() =>
          void apply({
            autoDisengage: threshold >= MAX_THRESHOLD ? NEVER : threshold,
          })}
      />
      <span class="w-10 text-right font-mono text-xs">
        {threshold >= MAX_THRESHOLD ? "Off" : threshold}
      </span>
    </span>
  </SettingRow>
{/if}
{#if torque !== null && mode === WheelMode.Ratchet && !error}
  <SettingRow label="Ratchet force">
    <span class="flex items-center gap-2">
      <input
        type="range"
        min="1"
        max="100"
        bind:value={torque}
        disabled={busy}
        onchange={() => void apply({ tunableTorque: torque ?? undefined })}
      />
      <span class="w-10 text-right font-mono text-xs">{torque}%</span>
    </span>
  </SettingRow>
{/if}
