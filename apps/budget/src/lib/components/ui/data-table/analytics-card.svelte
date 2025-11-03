<script lang="ts">
import * as Card from '$lib/components/ui/card';
import {formatCurrency} from '$lib/utils/formatters';
import {cn} from '$lib/utils';
import type {Component} from 'svelte';

interface AnalyticsData {
  id: number;
  name: string;
  amount: number;
  count: number;
  percentage: number;
  icon?: Component;
  color?: string;
}

interface Props {
  data: AnalyticsData;
  /** Optional click handler for card interactions */
  onclick?: (data: AnalyticsData) => void;
  /** Additional CSS classes */
  class?: string;
}

let {data, onclick, class: className}: Props = $props();

// Determine color classes
const colorStyle = $derived(data.color ? `border-l-4` : '');
const borderColor = $derived(data.color ? `border-l-[${data.color}]` : '');
</script>

<Card.Root
  class={cn('transition-all hover:shadow-md cursor-pointer', colorStyle, className)}
  style={data.color ? `border-left-color: ${data.color};` : ''}
  onclick={() => onclick?.(data)}
>
  <Card.Header class="pb-3">
    <div class="flex items-start justify-between">
      <div class="flex items-center gap-2 flex-1 min-w-0">
        {#if data.icon}
          <data.icon
            class="h-5 w-5 flex-shrink-0"
            style={data.color ? `color: ${data.color};` : ''}
          />
        {/if}
        <Card.Title class="text-base font-semibold truncate">
          {data.name}
        </Card.Title>
      </div>
      <div class="text-muted-foreground text-xs">
        {data.percentage.toFixed(1)}%
      </div>
    </div>
  </Card.Header>

  <Card.Content class="pb-3">
    <div class="flex items-end justify-between">
      <div>
        <p class="text-2xl font-bold">{formatCurrency(data.amount)}</p>
        <p class="text-muted-foreground text-xs mt-1">
          {data.count} transaction{data.count !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  </Card.Content>
</Card.Root>
