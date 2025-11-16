<script lang="ts">
interface Props {
  notes: string | null;
}

let {notes}: Props = $props();

const truncated = $derived(() => {
  if (!notes) return null;
  return notes.length > 50 ? notes.substring(0, 50) + '...' : notes;
});
</script>

{#if truncated()}
  <span class="text-muted-foreground max-w-[200px] truncate text-sm">
    {truncated()}
  </span>
{:else}
  <span class="text-muted-foreground">—</span>
{/if}
