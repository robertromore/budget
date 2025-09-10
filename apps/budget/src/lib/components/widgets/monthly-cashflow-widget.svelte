<script lang="ts">
import type {WidgetProps} from '$lib/types/widgets';
import {currencyFormatter} from '$lib/utils/formatters';
import WidgetCard from './widget-card.svelte';

let {config, data, onUpdate, onRemove, editMode = false}: WidgetProps = $props();

const cashFlow = data?.['monthlyCashFlow'] ?? 0;
const isPositive = cashFlow >= 0;

// Get current month income/expenses breakdown
const incomeExpenses = data?.['incomeExpenses'] ?? [];
const currentMonth = incomeExpenses[incomeExpenses.length - 1]; // Latest month
const totalIncome = currentMonth?.income ?? 0;
const totalExpenses = currentMonth?.expenses ?? 0;
</script>

<WidgetCard {config} {data} {editMode} {...onUpdate && {onUpdate}} {...onRemove && {onRemove}}>
  <div class="text-muted-foreground text-sm font-medium">{config.title}</div>
  <div class="text-2xl font-bold" class:text-chart-1={isPositive} class:text-chart-2={!isPositive}>
    {currencyFormatter.format(Math.abs(cashFlow))}
  </div>
  {#if config.size === 'medium'}
    <div class="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
      <span
        class="h-2 w-2 rounded-full"
        style="background-color: hsl(var({isPositive ? '--chart-1' : '--chart-2'}))"></span>
      {isPositive ? 'Net Income' : 'Net Spending'} This Month
    </div>
  {:else if config.size === 'large'}
    <div class="mt-2 space-y-2">
      <div class="text-muted-foreground flex items-center gap-1 text-xs">
        <span
          class="h-2 w-2 rounded-full"
          style="background-color: hsl(var({isPositive ? '--chart-1' : '--chart-2'}))"></span>
        {isPositive ? 'Net Income' : 'Net Spending'} This Month
      </div>

      <!-- Income/Expenses Breakdown -->
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div class="rounded p-2" style="background-color: hsl(var(--chart-1) / 0.1)">
          <div class="text-chart-1 font-medium">Income</div>
          <div class="text-chart-1 font-semibold">
            {currencyFormatter.format(totalIncome)}
          </div>
        </div>
        <div class="rounded p-2" style="background-color: hsl(var(--chart-2) / 0.1)">
          <div class="text-chart-2 font-medium">Expenses</div>
          <div class="text-chart-2 font-semibold">
            {currencyFormatter.format(totalExpenses)}
          </div>
        </div>
      </div>
    </div>
  {/if}
</WidgetCard>
