<script lang="ts">
  import { onMount } from "svelte";
  import { ReportRateFeature, type HidppDevice } from "../../hidpp";
  import SettingRow from "../SettingRow.svelte";

  let { device }: { device: HidppDevice } = $props();
  const feature = $derived(device.feature(ReportRateFeature));

  let options = $state<number[]>([]);
  let current = $state<number | null>(null);
  let busy = $state(false);
  let error = $state<string | null>(null);

  onMount(() => void load());

  async function load(): Promise<void> {
    if (!feature) return;
    try {
      options = await feature.getSupportedRates();
      current = await feature.getReportRate();
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    }
  }

  async function apply(intervalMs: number): Promise<void> {
    if (!feature) return;
    busy = true;
    try {
      await feature.setReportRate(intervalMs);
      current = intervalMs;
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    } finally {
      busy = false;
    }
  }
</script>

<SettingRow label="Report rate">
  {#if error}
    <span class="text-red-600">{error}</span>
  {:else if current === null}
    <span class="text-gray-400">…</span>
  {:else if options.length > 1}
    <select
      class="rounded border border-gray-300 px-2 py-1 disabled:opacity-50"
      value={current}
      disabled={busy}
      onchange={(event) => void apply(Number(event.currentTarget.value))}
    >
      {#each options as value (value)}
        <option {value}>{value} ms</option>
      {/each}
    </select>
  {:else}
    <span class="font-medium">{current} ms</span>
  {/if}
</SettingRow>
