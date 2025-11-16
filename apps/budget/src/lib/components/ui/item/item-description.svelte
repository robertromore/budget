<script lang="ts">
import {cn} from '$lib/utils';
import type {HTMLAttributes} from 'svelte/elements';

let {class: className, children, ...restProps}: HTMLAttributes<HTMLParagraphElement> = $props();
</script>

<p
  data-slot="item-description"
  class={cn(
    'text-muted-foreground line-clamp-2 text-sm leading-normal font-normal text-balance',
    '[&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4',
    className
  )}
  {...restProps}>
  {@render children?.()}
</p>
