<script lang="ts" generics="TData">
import { CHART_TYPES, type ChartType } from '$lib/components/layercake';
import { ChartPeriodBadge, StatisticsList } from '$lib/components/charts';
import type { PeriodPresetGroup } from '$lib/utils/time-period';
import type { ComprehensiveStats } from '$lib/utils/comprehensive-statistics';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import * as Tabs from '$lib/components/ui/tabs';
import { Skeleton } from '$lib/components/ui/skeleton';
import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
import Calculator from '@lucide/svelte/icons/calculator';

type Props<TData> = {
  loading?: boolean;
  error?: string | null;
  data: TData[];
  emptyMessage?: string;
  /** Comprehensive statistics for the Statistics tab */
  comprehensiveStats?: ComprehensiveStats | null;
  supportedChartTypes?: ChartType[];
  defaultChartType?: ChartType;
  /** Optional chart ID for per-chart time period override support */
  chartId?: string;
  /** Limit which time period preset groups are available for this chart */
  allowedPeriodGroups?: PeriodPresetGroup[];
  /** Whether to show custom date range picker (default: true) */
  showCustomRange?: boolean;
  title?: any;
  subtitle?: any;
  headerActions?: any;
  chart: any;
};

let {
  loading = false,
  error = null,
  data,
  emptyMessage = 'No data available for the selected period.',
  comprehensiveStats,
  supportedChartTypes,
  defaultChartType,
  chartId,
  allowedPeriodGroups,
  showCustomRange = true,
  title,
  subtitle,
  headerActions,
  chart,
}: Props<TData> = $props();

// Tab state
let activeTab = $state('overview');

// Chart type state
let selectedChartType = $state<ChartType>(defaultChartType ?? supportedChartTypes?.[0] ?? 'line');

// Show toggle if supportedChartTypes is provided (we'll disable unavailable options)
const showChartTypeToggle = $derived(supportedChartTypes && supportedChartTypes.length > 0);

// Determine which chart types to display as buttons
// Show all supported chart types
const displayChartTypes = $derived.by((): ChartType[] => {
  if (!supportedChartTypes) return [];
  return supportedChartTypes;
});

// Reset chart type when supportedChartTypes changes and current selection is no longer valid
$effect(() => {
  if (supportedChartTypes && !supportedChartTypes.includes(selectedChartType)) {
    selectedChartType = supportedChartTypes[0];
  }
});

const hasData = $derived(data && data.length > 0);
const showChart = $derived(!loading && !error && hasData);
const showEmpty = $derived(!loading && !error && !hasData);

// Track container dimensions to prevent LayerCake warnings
let containerWidth = $state(0);
let containerHeight = $state(0);
const containerReady = $derived(containerWidth > 0 && containerHeight > 0);
</script>

<div class="space-y-4">
  <!-- Chart Container -->
  <Card.Root>
    <Card.Header class="pb-0">
      <div class="space-y-1.5">
        <Card.Title>
          {@render title?.()}
        </Card.Title>
        {#if subtitle}
          <Card.Description>
            {@render subtitle()}
          </Card.Description>
        {/if}
      </div>
    </Card.Header>
    <Card.Content class="p-4">
      <Tabs.Root bind:value={activeTab} class="tabs-connected w-full">
        <Tabs.List class="tabs-connected-list">
          <Tabs.Trigger value="overview" class="tabs-connected-trigger gap-2 px-4">
            <BarChart3 class="h-4 w-4" />
            Overview
          </Tabs.Trigger>
          {#if comprehensiveStats}
            <Tabs.Trigger value="statistics" class="tabs-connected-trigger gap-2 px-4">
              <Calculator class="h-4 w-4" />
              Statistics
            </Tabs.Trigger>
          {/if}
        </Tabs.List>

        <Tabs.Content value="overview" class="tabs-connected-content">
          <!-- Chart controls - only visible in Overview tab -->
          {#if chartId || headerActions || showChartTypeToggle}
            <div class="mb-4 flex flex-wrap items-center justify-end gap-2">
              {#if chartId}
                <ChartPeriodBadge {chartId} allowedGroups={allowedPeriodGroups} {showCustomRange} />
              {/if}
              {#if headerActions}
                {@render headerActions()}
              {/if}
              {#if showChartTypeToggle}
                <div class="flex gap-1">
                  {#each displayChartTypes as type}
                    {@const chartTypeOption = CHART_TYPES[type]}
                    {@const isDisabled = !supportedChartTypes?.includes(type)}
                    <Button
                      variant={selectedChartType === type ? 'default' : 'ghost'}
                      size="icon"
                      class="h-7 w-7"
                      disabled={isDisabled}
                      onclick={() => (selectedChartType = type)}
                      title={isDisabled ? `${chartTypeOption.label} (not available for this view)` : chartTypeOption.label}
                    >
                      <chartTypeOption.icon class="h-4 w-4" />
                    </Button>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}

          {#if loading}
            <div class="flex h-[450px] w-full items-center justify-center">
              <div class="text-center">
                <Skeleton class="mx-auto h-8 w-8 rounded-full" />
                <p class="text-muted-foreground mt-2 text-sm">Loading chart data...</p>
              </div>
            </div>
          {:else if error}
            <div class="flex h-[450px] w-full items-center justify-center">
              <div class="text-center">
                <p class="text-destructive text-sm">Error loading chart data</p>
                <p class="text-muted-foreground mt-1 text-xs">{error}</p>
              </div>
            </div>
          {:else if showEmpty}
            <div class="flex h-[450px] w-full items-center justify-center">
              <div class="text-center">
                <p class="text-muted-foreground text-sm">{emptyMessage}</p>
              </div>
            </div>
          {:else if showChart}
            <div
              class="h-[450px] w-full"
              bind:clientWidth={containerWidth}
              bind:clientHeight={containerHeight}
            >
              {#if containerReady}
                {@render chart?.({ data, chartType: selectedChartType })}
              {/if}
            </div>
          {/if}
        </Tabs.Content>

        {#if comprehensiveStats}
          <Tabs.Content value="statistics" class="tabs-connected-content max-h-[500px] overflow-y-auto">
            <StatisticsList stats={comprehensiveStats} {loading} />
          </Tabs.Content>
        {/if}
      </Tabs.Root>
    </Card.Content>
  </Card.Root>
</div>
