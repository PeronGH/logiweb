<script lang="ts">
  import type { Snippet } from "svelte";

  let { label, children }: { label: string; children: Snippet } = $props();
</script>

<div class="flex items-center justify-between">
  <dt class="text-gray-500">{label}</dt>
  <dd>{@render children()}</dd>
</div>
