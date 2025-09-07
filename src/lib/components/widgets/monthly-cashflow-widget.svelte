<script lang="ts">
  import type { WidgetProps } from '$lib/types/widgets';
  import { currencyFormatter } from '$lib/utils/formatters';
  import WidgetCard from './widget-card.svelte';

  let { config, data, onUpdate, onRemove, editMode = false }: WidgetProps = $props();

  const cashFlow = data?.['monthlyCashFlow'] ?? 0;
  const isPositive = cashFlow >= 0;

  // Get current month income/expenses breakdown
  const incomeExpenses = data?.['incomeExpenses'] ?? [];
  const currentMonth = incomeExpenses[incomeExpenses.length - 1]; // Latest month
  const totalIncome = currentMonth?.income ?? 0;
  const totalExpenses = currentMonth?.expenses ?? 0;
</script>

<WidgetCard 
  {config} 
  {data} 
  {editMode}
  {...(onUpdate && { onUpdate })}
  {...(onRemove && { onRemove })}
>
  <div class="text-sm font-medium text-muted-foreground">{config.title}</div>
  <div class="text-2xl font-bold" class:text-chart-1={isPositive} class:text-chart-2={!isPositive}>
    {currencyFormatter.format(Math.abs(cashFlow))}
  </div>
  {#if config.size === 'medium'}
    <div class="text-xs text-muted-foreground mt-1 flex items-center gap-1">
      <span class="w-2 h-2 rounded-full" style="background-color: hsl(var({isPositive ? '--chart-1' : '--chart-2'}))"></span>
      {isPositive ? 'Net Income' : 'Net Spending'} This Month
    </div>
  {:else if config.size === 'large'}
    <div class="space-y-2 mt-2">
      <div class="text-xs text-muted-foreground flex items-center gap-1">
        <span class="w-2 h-2 rounded-full" style="background-color: hsl(var({isPositive ? '--chart-1' : '--chart-2'}))"></span>
        {isPositive ? 'Net Income' : 'Net Spending'} This Month
      </div>

      <!-- Income/Expenses Breakdown -->
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div class="p-2 rounded" style="background-color: hsl(var(--chart-1) / 0.1)">
          <div class="font-medium text-chart-1">Income</div>
          <div class="font-semibold text-chart-1">
            {currencyFormatter.format(totalIncome)}
          </div>
        </div>
        <div class="p-2 rounded" style="background-color: hsl(var(--chart-2) / 0.1)">
          <div class="font-medium text-chart-2">Expenses</div>
          <div class="font-semibold text-chart-2">
            {currencyFormatter.format(totalExpenses)}
          </div>
        </div>
      </div>
    </div>
  {/if}
</WidgetCard>
