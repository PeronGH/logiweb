<script lang="ts">
  import LoaderCircle from "@lucide/svelte/icons/loader-circle";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import Usb from "@lucide/svelte/icons/usb";
  import { deviceStore } from "./device-store.svelte";

  const store = deviceStore;
</script>

{#if !store.supported}
  <p
    class="flex items-center justify-center gap-2 rounded-lg bg-amber-50 p-4 text-center text-sm text-amber-800"
  >
    <TriangleAlert size={16} />
    WebHID needs a Chromium browser (Chrome, Edge) over HTTPS or localhost.
  </p>
{:else}
  <div class="flex justify-center">
    <button
      onclick={() => void store.connect()}
      disabled={store.busy}
      class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
    >
      {#if store.busy}
        <LoaderCircle size={16} class="animate-spin" />
        Connecting…
      {:else}
        <Usb size={16} />
        Connect
      {/if}
    </button>
  </div>

  {#if store.status}
    <p class="mt-4 rounded-lg bg-red-50 p-3 text-center text-sm text-red-700">
      {store.status}
    </p>
  {/if}
{/if}
