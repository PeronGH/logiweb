<script lang="ts">
  import { onMount } from "svelte";
  import {
    DeviceInformationFeature,
    type DeviceInfoSummary,
    type HidppDevice,
  } from "../../hidpp";
  import SettingRow from "../SettingRow.svelte";

  let { device }: { device: HidppDevice } = $props();
  const feature = $derived(device.feature(DeviceInformationFeature));

  let info = $state<DeviceInfoSummary | null>(null);
  let error = $state<string | null>(null);

  onMount(() => void load());

  async function load(): Promise<void> {
    if (!feature) return;
    try {
      info = await feature.summary();
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    }
  }
</script>

{#if error}
  <SettingRow label="Device">
    <span class="text-red-600">{error}</span>
  </SettingRow>
{:else if info}
  {#if info.firmware}
    <SettingRow label="Firmware">
      <span class="font-medium">{info.firmware}</span>
    </SettingRow>
  {/if}
  {#if info.serial}
    <SettingRow label="Serial">
      <span class="font-mono text-xs">{info.serial}</span>
    </SettingRow>
  {/if}
  {#if info.modelId}
    <SettingRow label="Model">
      <span class="font-mono text-xs">{info.modelId}</span>
    </SettingRow>
  {/if}
{/if}
