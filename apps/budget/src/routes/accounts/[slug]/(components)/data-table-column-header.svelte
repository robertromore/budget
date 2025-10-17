<script lang="ts" generics="TData, TValue">
import EyeNone from '@lucide/svelte/icons/eye-off';
import ArrowDown from '@lucide/svelte/icons/arrow-down';
import ArrowUp from '@lucide/svelte/icons/arrow-up';
import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
import type {HTMLAttributes} from 'svelte/elements';
import type {Column} from '@tanstack/table-core';
import type {WithoutChildren} from 'bits-ui';
import {cn} from '$lib/utils';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import Button, {buttonVariants} from '$lib/components/ui/button/button.svelte';

interface Props extends HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}

let {column, class: className, title, ...restProps}: WithoutChildren<Props> = $props();

const sortState = $derived(column.getIsSorted());
</script>

{#if !column?.getCanSort() && !column?.getCanHide()}
  <div class={cn(buttonVariants({variant: 'ghost', size: 'sm'}), className)} {...restProps}>
    {title}
  </div>
{:else}
  <div class={cn('flex items-center', className)} {...restProps}>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({props})}
          <Button
            {...props}
            variant="ghost"
            size="sm"
            class="data-[state=open]:bg-accent -ml-3 h-8">
            <span>
              {title}
            </span>
            {#if column.getCanSort()}
              {#if sortState === 'desc'}
                <ArrowDown class="ml-2 size-4" />
              {:else if sortState === 'asc'}
                <ArrowUp class="ml-2 size-4" />
              {:else}
                <ArrowUpDown class="ml-2 size-4" />
              {/if}
            {/if}
          </Button>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="start">
        {#if column.getCanSort()}
          <DropdownMenu.Item onclick={() => column.toggleSorting(false)}>
            <ArrowUp class="text-muted-foreground/70 mr-2 size-3.5" />
            Asc
          </DropdownMenu.Item>
          <DropdownMenu.Item onclick={() => column.toggleSorting(true)}>
            <ArrowDown class="text-muted-foreground/70 mr-2 size-3.5" />
            Desc
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
        {/if}
        {#if column.getCanHide()}
          <DropdownMenu.Item onclick={() => column.toggleVisibility(false)}>
            <EyeNone class="text-muted-foreground/70 mr-2 size-3.5" />
            Hide
          </DropdownMenu.Item>
        {/if}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </div>
{/if}
