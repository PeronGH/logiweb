<script lang="ts">
  import { onMount } from "svelte";
  import {
    HiResWheelFeature,
    type HiResWheelCapabilities,
    type HiResWheelMode,
    type HidppDevice,
  } from "../../hidpp";
  import SettingRow from "../SettingRow.svelte";

  let { device }: { device: HidppDevice } = $props();
  const feature = $derived(device.feature(HiResWheelFeature));

  let caps = $state<HiResWheelCapabilities | null>(null);
  let mode = $state<HiResWheelMode | null>(null);
  let busy = $state(false);
  let error = $state<string | null>(null);

  onMount(() => void load());

  async function load(): Promise<void> {
    if (!feature) return;
    try {
      caps = await feature.getCapabilities();
      mode = await feature.getMode();
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    }
  }

  async function toggle(key: "highResolution" | "inverted"): Promise<void> {
    if (!feature || !mode) return;
    busy = true;
    try {
      mode = await feature.setMode({ ...mode, [key]: !mode[key] });
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    } finally {
      busy = false;
    }
  }
</script>

<SettingRow label="Hi-res scrolling">
  {#if error}
    <span class="text-red-600">{error}</span>
  {:else if !caps || !mode}
    <span class="text-gray-400">…</span>
  {:else}
    <button
      class="rounded border border-gray-300 px-3 py-1 font-medium hover:bg-gray-50 disabled:opacity-50"
      disabled={busy}
      onclick={() => void toggle("highResolution")}
    >
      {mode.highResolution ? "On" : "Off"}
    </button>
  {/if}
</SettingRow>
{#if caps?.hasInvert && mode && !error}
  <SettingRow label="Invert scrolling">
    <button
      class="rounded border border-gray-300 px-3 py-1 font-medium hover:bg-gray-50 disabled:opacity-50"
      disabled={busy}
      onclick={() => void toggle("inverted")}
    >
      {mode.inverted ? "On" : "Off"}
    </button>
  </SettingRow>
{/if}
