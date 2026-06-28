<script lang="ts">
  import { deviceStore } from "./device-store.svelte";

  const store = deviceStore;
</script>

{#if !store.supported}
  <p class="rounded-lg bg-amber-50 p-4 text-center text-sm text-amber-800">
    WebHID isn't available in this browser. Use a Chromium-based browser
    (Chrome, Edge) over HTTPS or localhost.
  </p>
{:else}
  <div class="flex justify-center">
    <button
      onclick={() => void store.connect()}
      disabled={store.busy}
      class="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
    >
      {store.busy ? "Connecting…" : "Connect a device"}
    </button>
  </div>

  {#if store.status}
    <p class="mt-4 rounded-lg bg-red-50 p-3 text-center text-sm text-red-700">
      {store.status}
    </p>
  {/if}
{/if}
