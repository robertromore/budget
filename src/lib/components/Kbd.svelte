<script lang="ts">
  let {
    keys
  }: {
    keys: string[];
  } = $props();
</script>

<div class="ml-auto flex items-center gap-px">
  {#each keys as key}
    <kbd
      class="rounded-button border-dark-10 shadow-kbd sq-5 inline-flex items-center justify-center border bg-background text-xs text-muted-foreground"
    >
      {key}
    </kbd>
  {/each}
</div>
