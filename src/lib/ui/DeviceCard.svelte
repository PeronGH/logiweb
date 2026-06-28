<script lang="ts">
  import Unlink from "@lucide/svelte/icons/unlink";
  import Unplug from "@lucide/svelte/icons/unplug";
  import {
    AdjustableDpiFeature,
    HostsInfoFeature,
    ReportRateFeature,
    ReprogControlsFeature,
    SmartShiftFeature,
    UnifiedBatteryFeature,
  } from "../hidpp";
  import { deviceStore, type ManagedDevice } from "./device-store.svelte";
  import DeviceFeatures from "./DeviceFeatures.svelte";
  import BatteryPanel from "./panels/BatteryPanel.svelte";
  import ButtonsPanel from "./panels/ButtonsPanel.svelte";
  import DpiPanel from "./panels/DpiPanel.svelte";
  import HostsPanel from "./panels/HostsPanel.svelte";
  import ReportRatePanel from "./panels/ReportRatePanel.svelte";
  import SmartShiftPanel from "./panels/SmartShiftPanel.svelte";

  let { managed }: { managed: ManagedDevice } = $props();
  const device = $derived(managed.device);

  function unpair(): void {
    if (window.confirm(`Unpair ${managed.name} from the receiver?`)) {
      void deviceStore.unpair(managed.key);
    }
  }
</script>

<section class="rounded-xl border border-gray-200 p-5 shadow-sm">
  <div class="flex items-center justify-between gap-3">
    <div class="min-w-0">
      <h2 class="truncate text-lg font-semibold">{managed.name}</h2>
      <span class="text-xs text-gray-400"
        >{managed.kind} · {managed.featureCount} features</span
      >
    </div>
    {#if managed.receiverKind}
      <button
        class="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
        title="Unpair from receiver"
        onclick={unpair}
      >
        <Unlink size={14} />
        Unpair
      </button>
    {:else}
      <button
        class="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
        title="Disconnect"
        onclick={() => void deviceStore.remove(managed.key)}
      >
        <Unplug size={14} />
        Disconnect
      </button>
    {/if}
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
    {#if device.supports(HostsInfoFeature)}
      <HostsPanel {device} />
    {/if}
    {#if device.supports(ReprogControlsFeature)}
      <ButtonsPanel {device} />
    {/if}
  </dl>

  <DeviceFeatures {device} />
</section>
