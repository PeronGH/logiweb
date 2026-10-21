<script lang="ts">
  import RefreshCw from "@lucide/svelte/icons/refresh-cw";
  import Unlink from "@lucide/svelte/icons/unlink";
  import {
    AdjustableDpiFeature,
    DeviceFriendlyNameFeature,
    DeviceInformationFeature,
    ExtendedReportRateFeature,
    FnInversionFeature,
    HiResWheelFeature,
    HostsInfoFeature,
    ReportRateFeature,
    ReprogControlsFeature,
    SmartShiftEnhancedFeature,
    SmartShiftFeature,
    UnifiedBatteryFeature,
  } from "../hidpp";
  import { deviceStore, type ManagedDevice } from "./device-store.svelte";
  import DeviceFeatures from "./DeviceFeatures.svelte";
  import BatteryPanel from "./panels/BatteryPanel.svelte";
  import ButtonsPanel from "./panels/ButtonsPanel.svelte";
  import DeviceInfoPanel from "./panels/DeviceInfoPanel.svelte";
  import DpiPanel from "./panels/DpiPanel.svelte";
  import ExtendedReportRatePanel from "./panels/ExtendedReportRatePanel.svelte";
  import HiResWheelPanel from "./panels/HiResWheelPanel.svelte";
  import FriendlyNamePanel from "./panels/FriendlyNamePanel.svelte";
  import FnInversionPanel from "./panels/FnInversionPanel.svelte";
  import HostsPanel from "./panels/HostsPanel.svelte";
  import ReportRatePanel from "./panels/ReportRatePanel.svelte";
  import SmartShiftPanel from "./panels/SmartShiftPanel.svelte";

  let { managed }: { managed: ManagedDevice } = $props();
  const device = $derived(managed.device);
  /** Bumped to remount the panels, which re-read their settings on mount. */
  let generation = $state(0);

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
    <div class="flex shrink-0 items-center gap-2">
      <button
        class="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
        title="Re-read settings from the device"
        onclick={() => generation++}
      >
        <RefreshCw size={14} />
        Refresh
      </button>
      {#if managed.receiverKind}
        <button
          class="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
          title="Unpair from receiver"
          onclick={unpair}
        >
          <Unlink size={14} />
          Unpair
        </button>
      {/if}
    </div>
  </div>

  {#key generation}
    <dl class="mt-4 space-y-3 text-sm">
      {#if device.supports(UnifiedBatteryFeature)}
        <BatteryPanel {device} />
      {/if}
      {#if device.supports(AdjustableDpiFeature)}
        <DpiPanel {device} />
      {/if}
      {#if device.supports(SmartShiftEnhancedFeature) || device.supports(SmartShiftFeature)}
        <SmartShiftPanel {device} />
      {/if}
      {#if device.supports(HiResWheelFeature)}
        <HiResWheelPanel {device} />
      {/if}
      {#if device.supports(ReportRateFeature)}
        <ReportRatePanel {device} />
      {/if}
      {#if device.supports(ExtendedReportRateFeature)}
        <ExtendedReportRatePanel {device} />
      {/if}
      {#if device.supports(HostsInfoFeature)}
        <HostsPanel {device} />
      {/if}
      {#if device.supports(FnInversionFeature)}
        <FnInversionPanel {device} />
      {/if}
      {#if device.supports(ReprogControlsFeature)}
        <ButtonsPanel {device} />
      {/if}
      {#if device.supports(DeviceFriendlyNameFeature)}
        <FriendlyNamePanel {device} />
      {/if}
      {#if device.supports(DeviceInformationFeature)}
        <DeviceInfoPanel {device} />
      {/if}
    </dl>
  {/key}

  <DeviceFeatures {device} />
</section>
