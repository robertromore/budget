<script lang="ts">
  import type { Snippet } from "svelte";
  
  let { children }: { children: Snippet } = $props();
</script>

<!-- App-specific layout - currently just passes through but could add breadcrumbs, etc. -->
{@render children?.()}