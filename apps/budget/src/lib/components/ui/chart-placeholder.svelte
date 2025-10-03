<script lang="ts">
  import {BarChart3} from "@lucide/svelte/icons";

  interface Props {
    class?: string;
    title?: string;
  }

  let {class: className, title = "Chart Visualization"}: Props = $props();
</script>

<div class="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/30 p-8 text-center {className}">
  <BarChart3 class="h-12 w-12 text-muted-foreground/50" />
  <div class="space-y-1">
    <p class="text-sm font-medium text-muted-foreground">{title}</p>
    <p class="text-xs text-muted-foreground/70">Chart temporarily unavailable</p>
  </div>
</div>
