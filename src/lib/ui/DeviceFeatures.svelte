<script lang="ts">
  import { featureName, type HidppDevice } from "../hidpp";

  let { device }: { device: HidppDevice } = $props();
  const features = $derived([...device.features].sort((a, b) => a.id - b.id));

  function hex(id: number): string {
    return `0x${id.toString(16).padStart(4, "0")}`;
  }
</script>

<details class="mt-4 border-t border-gray-100 pt-3 text-sm">
  <summary class="cursor-pointer text-gray-500 select-none">
    {features.length} features
  </summary>
  <ul class="mt-2 space-y-1">
    {#each features as feature (feature.id)}
      <li class="flex items-baseline gap-3 font-mono text-xs">
        <span class="text-gray-400">{hex(feature.id)}</span>
        <span class="flex-1 truncate">{featureName(feature.id)}</span>
        <span class="text-gray-400">v{feature.version}</span>
      </li>
    {/each}
  </ul>
</details>
