<script lang="ts">
  import {
    AdjustableDpiFeature,
    ReportRateFeature,
    SmartShiftFeature,
    UnifiedBatteryFeature,
  } from "../hidpp";
  import { deviceStore, type ManagedDevice } from "./device-store.svelte";
  import BatteryPanel from "./panels/BatteryPanel.svelte";
  import DpiPanel from "./panels/DpiPanel.svelte";
  import ReportRatePanel from "./panels/ReportRatePanel.svelte";
  import SmartShiftPanel from "./panels/SmartShiftPanel.svelte";

  let { managed }: { managed: ManagedDevice } = $props();
  const device = $derived(managed.device);
</script>

<section class="rounded-xl border border-gray-200 p-5 shadow-sm">
  <div class="flex items-baseline justify-between">
    <h2 class="text-lg font-semibold">{managed.name}</h2>
    <div class="flex items-baseline gap-3 text-xs text-gray-400">
      <span>{managed.kind} · {managed.featureCount} features</span>
      <button
        class="text-gray-400 hover:text-red-600"
        onclick={() => void deviceStore.remove(managed.key)}
      >
        Disconnect
      </button>
    </div>
  </div>

  <dl class="mt-4 space-y-3 text-sm">
    {#if device.supports(UnifiedBatteryFeature)}
      <BatteryPanel {device} />
    {/if}
    {#if device.supports(AdjustableDpiFeature)}
      <DpiPanel {device} />
    {/if}
    {#if device.supports(SmartShiftFeature)}
      <SmartShiftPanel {device} />
    {/if}
    {#if device.supports(ReportRateFeature)}
      <ReportRatePanel {device} />
    {/if}
  </dl>
</section>
