<script lang="ts">
  import Mouse from "@lucide/svelte/icons/mouse";
  import { SiGithub } from "@icons-pack/svelte-simple-icons";
  import { onMount } from "svelte";
  import ConnectBar from "./lib/ui/ConnectBar.svelte";
  import DeviceCard from "./lib/ui/DeviceCard.svelte";
  import { deviceStore } from "./lib/ui/device-store.svelte";

  const store = deviceStore;

  onMount(() => {
    store.start();
  });
</script>

<main class="mx-auto mt-12 max-w-2xl px-4">
  <header class="text-center">
    <h1
      class="flex items-center justify-center gap-2 text-3xl font-bold tracking-tight"
    >
      <Mouse size={28} class="text-blue-600" />
      LogiWeb
    </h1>
    <p class="mt-2 text-sm text-gray-600">
      Tune Logitech HID++ devices over WebHID.
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

<footer class="mt-12 mb-8 text-center text-sm text-gray-400">
  <a
    href="https://github.com/PeronGH/logiweb"
    target="_blank"
    rel="noreferrer"
    class="inline-flex items-center gap-1.5 hover:text-gray-700"
  >
    <SiGithub size={15} />
    PeronGH/logiweb
  </a>
</footer>
