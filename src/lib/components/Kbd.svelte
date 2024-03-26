<script lang="ts">
  let { keys }: {
    keys: string[]
  } = $props();
</script>

<div class="ml-auto flex items-center gap-px">
{#each keys as key}
  <kbd
    class="inline-flex items-center justify-center rounded-button border border-dark-10 bg-background text-xs text-muted-foreground shadow-kbd sq-5"
  >
    {key}
  </kbd>
{/each}
</div>
