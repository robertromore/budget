<script lang="ts">
  import { Combobox as ComboboxPrimitive } from 'bits-ui';
  import { cn } from '$lib/utils.js';
  import Badge from '../badge/badge.svelte';
  import Button from '../button/button.svelte';

  type Props = ComboboxPrimitive.InputProps & {
    useBadge?: boolean;
    onClear?: () => {};
  };

  let {
    class: className,
    value = $bindable(),
    useBadge = false,
    onClear,
    ...restProps
  }: Props = $props();

  let displayValue = $state();
  let badgeCount = $state(0);

  $effect(() => {
    if (Array.isArray(value)) {
      displayValue = value.map((v) => v.label).join(', ');
      if (useBadge) {
        badgeCount = value.length;
      }
    } else {
      if (value) {
        displayValue = value.label;
      } else {
        displayValue = '';
      }
      if (useBadge) {
        badgeCount = value ? 1 : 0;
      }
    }
  });

  const clear = () => {
    value = undefined;
    if (onClear) {
      onClear();
    }
  };
</script>

<div
  class={cn(
    'flex h-9 items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
    className
  )}
>
  <span class="icon-[lucide--search] size-4 shrink-0 opacity-50"></span>
  <ComboboxPrimitive.Input
    class="flex h-9 w-full rounded-md bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
    {...restProps}
    bind:value={displayValue}
  />
  {#if (!Array.isArray(value) && value) || (Array.isArray(value) && value[0] && value[0].value)}
    <Button
      variant="ghost"
      size="icon"
      class="absolute right-0 hover:bg-transparent"
      onclick={clear}
    >
      <span class="icon-[lucide--x]"></span>
    </Button>
  {/if}
  {#if useBadge}
    <Badge class="rounded-br-none rounded-tr-none">
      {badgeCount}
    </Badge>
    <Badge class="cursor-pointer rounded-bl-none rounded-tl-none" onclick={onClear}>
      <span class="icon-[lucide--x]"></span>
    </Badge>
  {/if}
</div>
