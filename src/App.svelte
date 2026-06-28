<script lang="ts">
  import { onMount } from "svelte";
  import ConnectBar from "./lib/ui/ConnectBar.svelte";
  import DeviceCard from "./lib/ui/DeviceCard.svelte";
  import { deviceStore } from "./lib/ui/device-store.svelte";

  const store = deviceStore;

  onMount(() => void store.restore());
</script>

<main class="mx-auto mt-12 max-w-2xl px-4">
  <header class="text-center">
    <h1 class="text-3xl font-bold tracking-tight">LogiWeb</h1>
    <p class="mt-2 text-sm text-gray-600">
      Configure Logitech HID++ devices over WebHID — DPI, SmartShift, report
      rate, battery. No app, no driver.
    </p>
  </header>

  <div class="mt-6">
    <ConnectBar />
  </div>

  <div class="mt-8 space-y-4">
    {#each store.devices as managed (managed.key)}
      <DeviceCard {managed} />
    {/each}
  </div>
</main>
