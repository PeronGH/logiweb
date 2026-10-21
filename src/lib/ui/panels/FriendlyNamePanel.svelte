<script lang="ts">
  import { onMount } from "svelte";
  import { DeviceFriendlyNameFeature, type HidppDevice } from "../../hidpp";
  import SettingRow from "../SettingRow.svelte";

  let { device }: { device: HidppDevice } = $props();
  const feature = $derived(device.feature(DeviceFriendlyNameFeature));

  let saved = $state<string | null>(null);
  let draft = $state("");
  let maxLength = $state(0);
  let busy = $state(false);
  let error = $state<string | null>(null);

  const byteLength = $derived(new TextEncoder().encode(draft).length);
  const dirty = $derived(
    saved !== null &&
      draft.trim() !== "" &&
      draft !== saved &&
      byteLength <= maxLength,
  );

  onMount(() => void load());

  async function load(): Promise<void> {
    if (!feature) return;
    try {
      maxLength = (await feature.getLengths()).maxLength;
      saved = draft = await feature.getName();
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    }
  }

  async function run(task: () => Promise<string>): Promise<void> {
    busy = true;
    try {
      saved = draft = await task();
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    } finally {
      busy = false;
    }
  }

  function save(): void {
    if (!feature || !dirty) return;
    const name = draft;
    void run(() => feature.setName(name));
  }

  function reset(): void {
    if (!feature) return;
    void run(async () => {
      await feature.resetName();
      return feature.getName();
    });
  }
</script>

<SettingRow label="Friendly name">
  {#if error}
    <span class="text-red-600">{error}</span>
  {:else if saved === null}
    <span class="text-gray-400">…</span>
  {:else}
    <form
      class="flex items-center gap-2"
      onsubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <input
        class="w-40 rounded border border-gray-300 px-2 py-1 disabled:opacity-50 {byteLength >
        maxLength
          ? 'border-red-400'
          : ''}"
        bind:value={draft}
        disabled={busy}
        spellcheck="false"
        autocomplete="off"
        title="Up to {maxLength} bytes"
      />
      <button
        type="submit"
        class="rounded border border-gray-300 px-3 py-1 font-medium hover:bg-gray-50 disabled:opacity-50"
        disabled={busy || !dirty}
      >
        Save
      </button>
      <button
        type="button"
        class="rounded border border-gray-300 px-3 py-1 font-medium hover:bg-gray-50 disabled:opacity-50"
        disabled={busy}
        title="Restore the factory name"
        onclick={reset}
      >
        Reset
      </button>
    </form>
  {/if}
</SettingRow>
