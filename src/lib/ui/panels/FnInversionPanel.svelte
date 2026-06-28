<script lang="ts">
  import { onMount } from "svelte";
  import { FnInversionFeature, type HidppDevice } from "../../hidpp";
  import SettingRow from "../SettingRow.svelte";

  let { device }: { device: HidppDevice } = $props();
  const feature = $derived(device.feature(FnInversionFeature));

  let inverted = $state<boolean | null>(null);
  let busy = $state(false);
  let error = $state<string | null>(null);

  onMount(() => void load());

  async function load(): Promise<void> {
    if (!feature) return;
    try {
      inverted = await feature.getInverted();
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    }
  }

  async function toggle(): Promise<void> {
    if (!feature || inverted === null) return;
    busy = true;
    try {
      await feature.setInverted(!inverted);
      inverted = !inverted;
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    } finally {
      busy = false;
    }
  }
</script>

<SettingRow label="Fn inversion">
  {#if error}
    <span class="text-red-600">{error}</span>
  {:else if inverted === null}
    <span class="text-gray-400">…</span>
  {:else}
    <button
      class="rounded border border-gray-300 px-3 py-1 font-medium hover:bg-gray-50 disabled:opacity-50"
      disabled={busy}
      onclick={() => void toggle()}
    >
      {inverted ? "On" : "Off"}
    </button>
  {/if}
</SettingRow>
