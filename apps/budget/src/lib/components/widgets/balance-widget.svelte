<script lang="ts">
import type {WidgetProps} from '$lib/types/widgets';
import {currencyFormatter} from '$lib/utils/formatters';
import {Minus, TrendingDown, TrendingUp} from '$lib/components/icons';
import WidgetCard from './widget-card.svelte';

let {config, data, onUpdate, onRemove, editMode = false}: WidgetProps = $props();

const balance = data?.['balance'] ?? 0;
const previousBalance = data?.['previousBalance'] ?? 0;
const change = balance - previousBalance;
const changePercent = previousBalance !== 0 ? (change / Math.abs(previousBalance)) * 100 : 0;
</script>

<WidgetCard {config} {data} {editMode} {...onUpdate && {onUpdate}} {...onRemove && {onRemove}}>
  <div class="space-y-2">
    <div class="text-muted-foreground text-sm font-medium">{config.title}</div>
    <div class="text-2xl font-bold">{currencyFormatter.format(balance)}</div>

    {#if config.size === 'medium' || config.size === 'large'}
      <div class="flex items-center justify-between text-xs">
        <div class="text-muted-foreground">Current Balance</div>

        {#if Math.abs(change) > 0.01}
          <div class="flex items-center gap-1">
            {#if change > 0}
              <TrendingUp class="h-3 w-3 text-green-600" />
              <span class="text-green-600">+{currencyFormatter.format(change)}</span>
            {:else}
              <TrendingDown class="h-3 w-3 text-red-600" />
              <span class="text-red-600">{currencyFormatter.format(change)}</span>
            {/if}
            {#if Math.abs(changePercent) > 0.1}
              <span class="text-muted-foreground">
                ({changePercent > 0 ? '+' : ''}{changePercent.toFixed(1)}%)
              </span>
            {/if}
          </div>
        {:else}
          <div class="flex items-center gap-1">
            <Minus class="text-muted-foreground h-3 w-3" />
            <span class="text-muted-foreground">No change</span>
          </div>
        {/if}
      </div>
    {/if}

    {#if config.size === 'large' && data?.['accounts']}
      <div class="space-y-1 border-t pt-2">
        <div class="text-muted-foreground text-xs font-medium">Account Breakdown</div>
        {#each Object.entries(data['accounts']).slice(0, 3) as [account, amount]}
          <div class="flex justify-between text-xs">
            <span class="text-muted-foreground truncate">{account}</span>
            <span class="font-medium">{currencyFormatter.format(Number(amount) || 0)}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</WidgetCard>
