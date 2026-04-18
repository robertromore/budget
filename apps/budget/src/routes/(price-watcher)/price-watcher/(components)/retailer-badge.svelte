<script lang="ts">
  import { cn } from '$lib/utils';

  interface Props {
    name: string;
    logoUrl?: string | null;
    color?: string | null;
    class?: string;
    onclick?: () => void;
  }

  let { name, logoUrl, color, class: className, onclick }: Props = $props();
</script>

{#if onclick}
  <button
    type="button"
    class={cn(
      'text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs transition-colors',
      className
    )}
    {onclick}>
    {#if logoUrl}
      <img src={logoUrl} alt="" class="h-4 w-4 rounded" />
    {/if}
    <span>{name}</span>
  </button>
{:else}
  <span
    class={cn(
      'text-muted-foreground inline-flex items-center gap-1.5 text-xs',
      className
    )}>
    {#if logoUrl}
      <img src={logoUrl} alt="" class="h-4 w-4 rounded" />
    {/if}
    <span>{name}</span>
  </span>
{/if}
