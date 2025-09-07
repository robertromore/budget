<script lang="ts">
  import { ChartPeriodControls, UnifiedChart } from '$lib/components/charts';
  import type { ChartType } from '$lib/components/charts/chart-types';
  import type { TransactionsFormat } from '$lib/types';
  import { transformIncomeVsExpensesData } from '$lib/utils/chart-data';
  import { filterDataByPeriod, generatePeriodOptions } from '$lib/utils/chart-periods';
  import { colorUtils } from '$lib/utils/colors';
  import { dateValueToJSDate } from '$lib/utils/dates';
  import { createIncomeVsExpensesProcessor } from '../(analytics)/data-processors.svelte';

  interface Props {
    transactions: TransactionsFormat[];
  }

  let { transactions }: Props = $props();

  const incomeVsExpensesProcessor = createIncomeVsExpensesProcessor(transactions);

  // Process raw data using standard transformation utilities
  const processedData = $derived(incomeVsExpensesProcessor.data);

  // Transform data for multi-series visualization
  const transformedData = $derived(
    transformIncomeVsExpensesData(processedData, {
      x: (item) => dateValueToJSDate(item.month),
      income: 'income',
      expenses: 'expenses'
    })
  );

  // Base data transformation (before period filtering) for side-by-side view
  const baseIncomeData = $derived(transformedData.income);
  const baseExpensesData = $derived(transformedData.expenses);
  const baseCombinedData = $derived(transformedData.combined);

  // Generate available periods based on the data
  const availablePeriods = $derived(
    baseIncomeData.length === 0 ? [] : generatePeriodOptions(baseIncomeData, 'x')
  );

  // Shared chart configuration
  let currentChartType: ChartType = $state('bar');
  let currentPeriod = $state(0); // Shared period filtering state
  let viewMode = $state<'combined' | 'side-by-side'>('combined'); // Default to combined view

  // Apply period filtering to datasets
  const incomeData = $derived(
    filterDataByPeriod(baseIncomeData, 'x', currentPeriod)
  );

  const expensesData = $derived(
    filterDataByPeriod(baseExpensesData, 'x', currentPeriod)
  );

  const combinedData = $derived(
    filterDataByPeriod(baseCombinedData, 'x', currentPeriod)
  );

  // Available chart types for income vs expenses data
  const availableChartTypes: ChartType[] = ['bar', 'line', 'area'];
</script>

{#if incomeData.length > 0 || expensesData.length > 0 || combinedData.length > 0}
  <div class="h-full flex flex-col gap-4">
    <!-- Shared Chart Controls -->
    <div class="flex items-center justify-between gap-4 p-3 bg-muted/30 rounded-lg">
      <div class="flex items-center gap-6 text-sm">
        <!-- View Mode Toggle -->
        <div class="flex items-center gap-2">
          <label for="view-mode-selector" class="text-sm font-medium">View:</label>
          <select
            id="view-mode-selector"
            bind:value={viewMode}
            class="text-sm border rounded px-2 py-1 bg-background"
          >
            <option value="combined">Combined Chart</option>
            <option value="side-by-side">Side by Side</option>
          </select>
        </div>

        <!-- Chart Type Selector -->
        <div class="flex items-center gap-2">
          <label for="chart-type-selector" class="text-sm font-medium">Chart Type:</label>
          <select
            id="chart-type-selector"
            bind:value={currentChartType}
            class="text-sm border rounded px-2 py-1 bg-background"
          >
            {#each availableChartTypes as type}
              <option value={type}>{type.charAt(0).toUpperCase() + type.slice(1)} Chart</option>
            {/each}
          </select>
        </div>

        <!-- Period Controls -->
        <ChartPeriodControls
          bind:currentPeriod
          data={availablePeriods}
          dateField="x"
          enablePeriodFiltering={availablePeriods.length > 0}
        />
      </div>
      <div class="text-xs text-muted-foreground">
        Income vs Expenses Analysis
      </div>
    </div>

    {#if viewMode === 'combined'}
      <!-- Combined Chart View -->
      <div class="flex-1">
        <UnifiedChart
          data={combinedData}
          type={currentChartType}
          styling={{
            colors: [
              colorUtils.getChartColor(1), // Green for income
              colorUtils.getChartColor(2)  // Red/orange for expenses
            ],
            legend: { show: true, position: 'top' }
          }}
          axes={{
            x: {
              title: 'Month',
              rotateLabels: true
            },
            y: {
              title: 'Amount ($)',
              nice: true
            }
          }}
          yFields={['income', 'expenses']}
          yFieldLabels={['Income', 'Expenses']}
          suppressDuplicateWarnings={true}
          timeFiltering={{
            enabled: false, // Disabled since we handle filtering externally
            field: 'x'
          }}
          controls={{
            show: false, // Hide individual controls since we have shared ones
            availableTypes: availableChartTypes,
            allowTypeChange: false,
            allowPeriodChange: false
          }}
          class="h-full w-full"
        />
      </div>
    {:else}
      <!-- Side-by-side Charts -->
      <div class="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Income Chart -->
      <div class="flex flex-col">
        <h3 class="text-sm font-semibold mb-2 text-green-700 flex items-center gap-2">
          <div class="w-3 h-3 rounded-full bg-green-500"></div>
          Income
        </h3>
        <div class="flex-1 min-h-[300px]">
          <UnifiedChart
            data={incomeData}
            type={currentChartType}
            styling={{
              colors: [colorUtils.getChartColor(1)], // Green for income
              legend: { show: false }
            }}
            axes={{
              x: {
                title: 'Month',
                rotateLabels: true
              },
              y: {
                title: 'Income ($)',
                nice: true
              }
            }}
            timeFiltering={{
              enabled: false, // Disabled since we handle filtering externally
              field: 'x'
            }}
            controls={{
              show: false, // Hide individual controls since we have shared ones
              availableTypes: availableChartTypes,
              allowTypeChange: false,
              allowPeriodChange: false
            }}
            class="h-full w-full"
          />
        </div>
      </div>

      <!-- Expenses Chart -->
      <div class="flex flex-col">
        <h3 class="text-sm font-semibold mb-2 text-red-700 flex items-center gap-2">
          <div class="w-3 h-3 rounded-full bg-red-500"></div>
          Expenses
        </h3>
        <div class="flex-1 min-h-[300px]">
          <UnifiedChart
            data={expensesData}
            type={currentChartType}
            styling={{
              colors: [colorUtils.getChartColor(2)], // Red/orange for expenses
              legend: { show: false }
            }}
            axes={{
              x: {
                title: 'Month',
                rotateLabels: true
              },
              y: {
                title: 'Expenses ($)',
                nice: true
              }
            }}
            timeFiltering={{
              enabled: false, // Disabled since we handle filtering externally
              field: 'x'
            }}
            controls={{
              show: false, // Hide individual controls since we have shared ones
              availableTypes: availableChartTypes,
              allowTypeChange: false,
              allowPeriodChange: false
            }}
            class="h-full w-full"
          />
        </div>
      </div>
      </div>
    {/if}
  </div>
{:else}
  <div class="flex items-center justify-center h-full text-muted-foreground">
    No income/expense data available
  </div>
{/if}
