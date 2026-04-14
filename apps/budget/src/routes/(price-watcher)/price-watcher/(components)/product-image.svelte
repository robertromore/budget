<script lang="ts">
import { cn } from '$lib/utils';
import Package from '@lucide/svelte/icons/package';

interface Props {
  imageUrl?: string | null;
  alt?: string;
  size?: 'sm' | 'md';
  class?: string;
}

let { imageUrl, alt = 'Product', size = 'md', class: className }: Props = $props();

const sizeClasses = $derived(
  size === 'sm' ? 'h-10 w-10' : 'h-16 w-16'
);
const iconSize = $derived(size === 'sm' ? 'h-5 w-5' : 'h-8 w-8');
</script>

{#if imageUrl}
  <img
    src={imageUrl}
    {alt}
    loading="lazy"
    class={cn('shrink-0 rounded-md border object-cover', sizeClasses, className)} />
{:else}
  <div
    class={cn(
      'bg-muted flex shrink-0 items-center justify-center rounded-md border',
      sizeClasses,
      className
    )}>
    <Package class="text-muted-foreground {iconSize}" />
  </div>
{/if}
