<script lang="ts">
import type {WidgetProps} from '$lib/types/widgets';
import {currencyFormatter} from '$lib/utils/formatters';
import {ArrowDownLeft, ArrowUpRight} from '$lib/components/icons';
import WidgetCard from './widget-card.svelte';

let {config, data, onUpdate, onRemove, editMode = false}: WidgetProps = $props();

const days = config.settings?.['days'] ?? 30;
const transactions = data?.['recentTransactions'] ?? [];
const totalAmount = data?.['recentActivity'] ?? 0;
</script>

<WidgetCard {config} {data} {editMode} {...onUpdate && {onUpdate}} {...onRemove && {onRemove}}>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <div class="text-muted-foreground text-sm font-medium">{config.title}</div>
      <div class="text-muted-foreground text-xs">Last {days} days</div>
    </div>

    <div class="text-center">
      <div class="text-2xl font-bold">{currencyFormatter.format(Math.abs(totalAmount))}</div>
      <div class="text-muted-foreground text-xs">Total Activity</div>
    </div>

    {#if (config.size === 'medium' || config.size === 'large') && transactions.length > 0}
      <div class="space-y-2 border-t pt-2">
        <div class="text-muted-foreground text-xs font-medium">Recent Transactions</div>
        {#each transactions.slice(0, config.size === 'large' ? 5 : 3) as transaction}
          <div class="bg-muted/50 flex items-center gap-2 rounded p-2">
            <div class="flex-shrink-0">
              {#if transaction.amount > 0}
                <ArrowUpRight class="h-4 w-4 text-green-600" />
              {:else}
                <ArrowDownLeft class="h-4 w-4 text-red-600" />
              {/if}
            </div>
            <div class="min-w-0 flex-1">
              <div class="truncate text-sm font-medium">
                {transaction.description || 'Transaction'}
              </div>
              <div class="text-muted-foreground text-xs">
                {new Date(transaction.date).toLocaleDateString()}
              </div>
            </div>
            <div
              class="text-sm font-semibold {transaction.amount > 0
                ? 'text-green-600'
                : 'text-red-600'}">
              {transaction.amount > 0 ? '+' : ''}{currencyFormatter.format(
                Math.abs(transaction.amount)
              )}
            </div>
          </div>
        {/each}

        {#if transactions.length > (config.size === 'large' ? 5 : 3)}
          <div class="text-muted-foreground text-center text-xs">
            +{transactions.length - (config.size === 'large' ? 5 : 3)} more transactions
          </div>
        {/if}
      </div>
    {/if}
  </div>
</WidgetCard>
