<script lang="ts">
  import { onMount } from "svelte";
  import { SmartShiftFeature, WheelMode, type HidppDevice } from "../../hidpp";
  import SettingRow from "../SettingRow.svelte";

  let { device }: { device: HidppDevice } = $props();
  const feature = $derived(device.feature(SmartShiftFeature));

  let mode = $state<WheelMode | null>(null);
  let busy = $state(false);
  let error = $state<string | null>(null);

  onMount(() => void load());

  async function load(): Promise<void> {
    if (!feature) return;
    try {
      mode = (await feature.getRatchetControlMode()).wheelMode;
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    }
  }

  async function toggle(): Promise<void> {
    if (!feature || mode === null) return;
    const next =
      mode === WheelMode.Ratchet ? WheelMode.Freespin : WheelMode.Ratchet;
    busy = true;
    try {
      await feature.setRatchetControlMode({ wheelMode: next });
      mode = next;
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
      onclick={() => void toggle()}
    >
      {mode === WheelMode.Ratchet ? "Ratchet" : "Free-spin"}
    </button>
  {/if}
</SettingRow>
