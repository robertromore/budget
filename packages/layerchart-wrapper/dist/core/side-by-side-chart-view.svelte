<!--
  Side-by-Side Chart View Component
  Phase 2D Refactoring: Extract side-by-side view logic from chart-core.svelte
  
  This component handles the rendering of side-by-side charts (like income vs expenses)
  to reduce complexity in chart-core.svelte and eliminate code duplication.
-->

<script lang="ts">
  import { Chart } from 'layerchart';
  import type { ResolvedChartConfig } from '../config/chart-config';
  import type { ChartType } from '../config/chart-types';
  import type { ChartDataProcessor, ViewModeData } from '../processors/chart-data-processor.svelte';
  import ChartTooltip from './chart-tooltip.svelte';
  import SingleChartView from './single-chart-view.svelte';

  // Props interface following Svelte 5 patterns
  interface SideBySideChartViewProps {
    // Processed data from chart-data-processor
    processor: ChartDataProcessor;
    
    // Chart configuration
    chartType: ChartType;
    config: ResolvedChartConfig & {
      type: ChartType;
      data: any[];
      resolvedColors: string[];
    };
    
    // View mode data
    viewModeData: ViewModeData;
    yFieldLabels?: string[] | undefined;
    
    // Additional props
    className?: string;
    currentColorScheme: string;
    accessibleCrosshairOpacity: number;
  }

  let { 
    processor,
    chartType, 
    config,
    viewModeData,
    yFieldLabels,
    className = '',
    currentColorScheme,
    accessibleCrosshairOpacity
  }: SideBySideChartViewProps = $props();

  // Extract relevant data from processor
  const {
    effectiveColors,
    incomeBandScale,
    expensesBandScale,
    dataAccessors,
    isChartCircular,
    isChartHierarchical
  } = $derived(processor);
</script>

<div class="grid grid-cols-1 md:grid-cols-2 gap-4 h-full {className}">
  <!-- Income Chart -->
  <div class="h-full">
    <h4 class="text-sm font-medium mb-2 text-center">Income</h4>
    <SingleChartView
      data={viewModeData.income || []}
      {chartType}
      {config}
      bandScale={incomeBandScale}
      {dataAccessors}
      {effectiveColors}
      {isChartCircular}
      {isChartHierarchical}
      {currentColorScheme}
      {accessibleCrosshairOpacity}
      viewModeLabel="Income"
      colors={effectiveColors}
    />
  </div>
  
  <!-- Expenses Chart -->
  <div class="h-full">
    <h4 class="text-sm font-medium mb-2 text-center">Expenses</h4>
    <SingleChartView
      data={viewModeData.expenses || []}
      {chartType}
      {config}
      bandScale={expensesBandScale}
      {dataAccessors}
      {effectiveColors}
      {isChartCircular}
      {isChartHierarchical}
      {currentColorScheme}
      {accessibleCrosshairOpacity}
      viewModeLabel="Expenses"
      colors={effectiveColors}
    />
  </div>
</div>