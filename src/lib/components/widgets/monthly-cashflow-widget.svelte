<script lang="ts">
  import type { WidgetProps } from '$lib/types/widgets';
  import WidgetCard from './widget-card.svelte';
  import { currencyFormatter } from '$lib/utils/formatters';

  let { config, data, onUpdate, onRemove, editMode = false }: WidgetProps = $props();

  const cashFlow = data?.monthlyCashFlow ?? 0;
  const isPositive = cashFlow >= 0;
  
  // Get current month income/expenses breakdown
  const incomeExpenses = data?.incomeExpenses ?? [];
  const currentMonth = incomeExpenses[incomeExpenses.length - 1]; // Latest month
  const totalIncome = currentMonth?.income ?? 0;
  const totalExpenses = currentMonth?.expenses ?? 0;
</script>

<WidgetCard {config} {data} {onUpdate} {onRemove} {editMode}>
  <div class="text-sm font-medium text-muted-foreground">{config.title}</div>
  <div class="text-2xl font-bold {isPositive ? 'text-green-600' : 'text-red-600'}">
    {currencyFormatter.format(Math.abs(cashFlow))}
  </div>
  {#if config.size === 'medium'}
    <div class="text-xs text-muted-foreground mt-1 flex items-center gap-1">
      <span class="w-2 h-2 rounded-full {isPositive ? 'bg-green-500' : 'bg-red-500'}"></span>
      {isPositive ? 'Net Income' : 'Net Spending'} This Month
    </div>
  {:else if config.size === 'large'}
    <div class="space-y-2 mt-2">
      <div class="text-xs text-muted-foreground flex items-center gap-1">
        <span class="w-2 h-2 rounded-full {isPositive ? 'bg-green-500' : 'bg-red-500'}"></span>
        {isPositive ? 'Net Income' : 'Net Spending'} This Month
      </div>
      
      <!-- Income/Expenses Breakdown -->
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div class="bg-green-50 dark:bg-green-950/20 p-2 rounded">
          <div class="text-green-600 font-medium">Income</div>
          <div class="font-semibold text-green-700 dark:text-green-400">
            {currencyFormatter.format(totalIncome)}
          </div>
        </div>
        <div class="bg-red-50 dark:bg-red-950/20 p-2 rounded">
          <div class="text-red-600 font-medium">Expenses</div>
          <div class="font-semibold text-red-700 dark:text-red-400">
            {currencyFormatter.format(totalExpenses)}
          </div>
        </div>
      </div>
    </div>
  {/if}
</WidgetCard>