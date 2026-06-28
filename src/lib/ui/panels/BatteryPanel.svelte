<script lang="ts">
  import { onMount } from "svelte";
  import {
    BatteryStatus,
    UnifiedBatteryFeature,
    type BatteryInfo,
    type HidppDevice,
  } from "../../hidpp";
  import SettingRow from "../SettingRow.svelte";

  let { device }: { device: HidppDevice } = $props();
  const feature = $derived(device.feature(UnifiedBatteryFeature));

  let info = $state<BatteryInfo | null>(null);
  let hasPercentage = $state(false);
  let error = $state<string | null>(null);

  const STATUS_LABELS: Record<number, string> = {
    [BatteryStatus.Discharging]: "Discharging",
    [BatteryStatus.Charging]: "Charging",
    [BatteryStatus.ChargingSlow]: "Charging (slow)",
    [BatteryStatus.Full]: "Full",
    [BatteryStatus.Error]: "Error",
  };

  onMount(() => void load());

  async function load(): Promise<void> {
    if (!feature) return;
    try {
      hasPercentage = (await feature.getCapabilities()).hasPercentage;
      info = await feature.getInfo();
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    }
  }
</script>

<SettingRow label="Battery">
  {#if error}
    <span class="text-red-600">{error}</span>
  {:else if info}
    <span class="font-medium"
      >{hasPercentage ? `${info.percentage.toString()}%` : "—"}</span
    >
    <span class="text-gray-400"
      >({STATUS_LABELS[info.status] ?? "Unknown"})</span
    >
  {:else}
    <span class="text-gray-400">…</span>
  {/if}
</SettingRow>
