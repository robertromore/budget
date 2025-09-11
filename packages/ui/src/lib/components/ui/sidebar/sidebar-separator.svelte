<script lang="ts">
import type { ComponentProps } from 'svelte';
import { cn } from '../../../utils';
import { Separator } from '../separator/index.js';

let {
  ref = $bindable(null),
  class: className,
  ...restProps
}: ComponentProps<typeof Separator> = $props();
</script>

<Separator
  bind:ref
  data-sidebar="separator"
  class={cn('bg-sidebar-border mx-2 w-auto', className)}
  {...restProps} />
