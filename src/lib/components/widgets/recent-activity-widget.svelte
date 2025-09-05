<script lang="ts">
  import type { WidgetProps } from '$lib/types/widgets';
  import WidgetCard from './widget-card.svelte';
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
  import ArrowDownLeft from '@lucide/svelte/icons/arrow-down-left';
  import { currencyFormatter } from '$lib/utils/formatters';

  let { config, data, onUpdate, onRemove, editMode = false }: WidgetProps = $props();
  
  const days = config.settings?.days ?? 30;
  const transactions = data?.recentTransactions ?? [];
  const totalAmount = data?.recentActivity ?? 0;
</script>

<WidgetCard {config} {data} {onUpdate} {onRemove} {editMode}>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <div class="text-sm font-medium text-muted-foreground">{config.title}</div>
      <div class="text-xs text-muted-foreground">Last {days} days</div>
    </div>
    
    <div class="text-center">
      <div class="text-2xl font-bold">{currencyFormatter.format(Math.abs(totalAmount))}</div>
      <div class="text-xs text-muted-foreground">Total Activity</div>
    </div>

    {#if (config.size === 'medium' || config.size === 'large') && transactions.length > 0}
      <div class="space-y-2 pt-2 border-t">
        <div class="text-xs font-medium text-muted-foreground">Recent Transactions</div>
        {#each transactions.slice(0, config.size === 'large' ? 5 : 3) as transaction}
          <div class="flex items-center gap-2 p-2 rounded bg-muted/50">
            <div class="flex-shrink-0">
              {#if transaction.amount > 0}
                <ArrowUpRight class="w-4 h-4 text-green-600" />
              {:else}
                <ArrowDownLeft class="w-4 h-4 text-red-600" />
              {/if}
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">{transaction.description || 'Transaction'}</div>
              <div class="text-xs text-muted-foreground">
                {new Date(transaction.date).toLocaleDateString()}
              </div>
            </div>
            <div class="text-sm font-semibold {transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}">
              {transaction.amount > 0 ? '+' : ''}{currencyFormatter.format(Math.abs(transaction.amount))}
            </div>
          </div>
        {/each}
        
        {#if transactions.length > (config.size === 'large' ? 5 : 3)}
          <div class="text-xs text-muted-foreground text-center">
            +{transactions.length - (config.size === 'large' ? 5 : 3)} more transactions
          </div>
        {/if}
      </div>
    {/if}
  </div>
</WidgetCard>