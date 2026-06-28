<script lang="ts">
  let count = $state(0);
</script>

<button
  onclick={() => count++}
  class="cursor-pointer rounded-lg bg-orange-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-orange-700"
>
  count is {count}
</button>
