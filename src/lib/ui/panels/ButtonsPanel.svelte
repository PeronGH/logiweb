<script lang="ts">
  import { onMount } from "svelte";
  import {
    ReprogControlsFeature,
    controlName,
    type Control,
    type HidppDevice,
  } from "../../hidpp";

  let { device }: { device: HidppDevice } = $props();
  const feature = $derived(device.feature(ReprogControlsFeature));

  let controls = $state<Control[] | null>(null);
  let error = $state<string | null>(null);
  let busy = $state(false);

  onMount(() => void load());

  async function load(): Promise<void> {
    if (!feature) return;
    try {
      const all = await feature.listControls();
      controls = all.filter(
        (control) => !control.virtual && control.remapTargets.length > 0,
      );
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    }
  }

  async function remap(cid: number, target: number): Promise<void> {
    if (!feature) return;
    busy = true;
    try {
      await feature.remap(cid, target);
      controls =
        controls?.map((control) =>
          control.cid === cid
            ? { ...control, remappedTo: target === cid ? null : target }
            : control,
        ) ?? null;
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    } finally {
      busy = false;
    }
  }
</script>

{#if error}
  <div class="flex items-center justify-between gap-2">
    <span class="text-gray-500">Buttons</span>
    <span class="text-red-600">{error}</span>
  </div>
{:else if controls && controls.length > 0}
  <div class="space-y-1.5">
    <span class="text-gray-500">Buttons</span>
    <ul class="space-y-1">
      {#each controls as control (control.cid)}
        <li class="flex items-center justify-between gap-2">
          <span class="font-medium">{controlName(control.cid)}</span>
          <select
            class="rounded border border-gray-300 px-2 py-1 disabled:opacity-50"
            value={control.remappedTo ?? control.cid}
            disabled={busy}
            onchange={(event) =>
              void remap(control.cid, Number(event.currentTarget.value))}
          >
            <option value={control.cid}>Default</option>
            {#each control.remapTargets as target (target)}
              <option value={target}>{controlName(target)}</option>
            {/each}
          </select>
        </li>
      {/each}
    </ul>
  </div>
{/if}
