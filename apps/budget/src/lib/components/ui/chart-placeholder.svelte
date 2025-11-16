<script lang="ts">
import {BarChart3} from '@lucide/svelte/icons';

interface Props {
  class?: string;
  title?: string;
}

let {class: className, title = 'Chart Visualization'}: Props = $props();
</script>

<div
  class="bg-muted/30 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center {className}">
  <BarChart3 class="text-muted-foreground/50 h-12 w-12" />
  <div class="space-y-1">
    <p class="text-muted-foreground text-sm font-medium">{title}</p>
    <p class="text-muted-foreground/70 text-xs">Chart temporarily unavailable</p>
  </div>
</div>
