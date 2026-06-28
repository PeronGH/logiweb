<script lang="ts">
  import { onMount } from "svelte";
  import {
    HostsInfoFeature,
    type HidppDevice,
    type HostSlot,
  } from "../../hidpp";

  let { device }: { device: HidppDevice } = $props();
  const feature = $derived(device.feature(HostsInfoFeature));

  let hosts = $state<HostSlot[] | null>(null);
  let error = $state<string | null>(null);

  onMount(() => void load());

  async function load(): Promise<void> {
    if (!feature) return;
    try {
      hosts = await feature.listHosts();
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    }
  }
</script>

<div class="space-y-1.5">
  <span class="text-gray-500">Hosts</span>
  {#if error}
    <span class="text-red-600">{error}</span>
  {:else if hosts === null}
    <span class="text-gray-400">…</span>
  {:else}
    <ul class="space-y-1">
      {#each hosts as host (host.index)}
        <li class="flex items-center justify-between gap-2">
          <span class="flex items-center gap-2">
            <span class="font-medium">Host {host.index + 1}</span>
            {#if host.current}
              <span
                class="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700"
                >current</span
              >
            {/if}
          </span>
          <span class="truncate text-gray-500">
            {host.name || (host.paired ? "Paired" : "Empty")}
          </span>
        </li>
      {/each}
    </ul>
  {/if}
</div>
