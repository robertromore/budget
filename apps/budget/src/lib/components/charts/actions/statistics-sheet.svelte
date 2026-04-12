<script lang="ts">
import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
import * as Sheet from '$lib/components/ui/sheet';
import * as Card from '$lib/components/ui/card';
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import { Progress } from '$lib/components/ui/progress';
import { chartSelection } from '$lib/states/ui/chart-selection.svelte';
import { currencyFormatter, formatPercentRaw } from '$lib/utils/formatters';
import { quantile } from '$lib/utils/chart-statistics';

// Icons
import Calculator from '@lucide/svelte/icons/calculator';
import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import TrendingDown from '@lucide/svelte/icons/trending-down';
import Minus from '@lucide/svelte/icons/minus';

interface Props {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

let { open = $bindable(false), onOpenChange }: Props = $props();

const sortedPoints = $derived(chartSelection.sortedByDate);
const sortedByValue = $derived(chartSelection.sortedByValue);

// Additional computed statistics
const additionalStats = $derived.by(() => {
  if (sortedPoints.length < 2) return null;

  const values = sortedPoints.map((p) => p.value);
  const n = values.length;
  const mean = chartSelection.averageValue;
  const stdDev = chartSelection.standardDeviation;

  // Coefficient of Variation
  const cv = mean !== 0 ? (stdDev / mean) * 100 : 0;

  // Skewness (Fisher-Pearson)
  let skewness = 0;
  if (stdDev !== 0 && n > 2) {
    const sumCubed = values.reduce((sum, v) => sum + Math.pow((v - mean) / stdDev, 3), 0);
    skewness = (n / ((n - 1) * (n - 2))) * sumCubed;
  }

  // Percentiles (using simple-statistics quantile via chart-statistics utility)
  const sorted = [...values].sort((a, b) => a - b);
  const p10 = quantile(sorted, 0.1);
  const p25 = quantile(sorted, 0.25);
  const p75 = quantile(sorted, 0.75);
  const p90 = quantile(sorted, 0.9);
  const iqr = p75 - p25;

  // Sum
  const sum = chartSelection.totalValue;

  // First and last values for simple change
  const first = sortedPoints[0]?.value ?? 0;
  const last = sortedPoints[n - 1]?.value ?? 0;
  const absoluteChange = last - first;
  const percentChange = first !== 0 ? (absoluteChange / first) * 100 : 0;

  return {
    cv,
    skewness,
    p10,
    p25,
    p75,
    p90,
    iqr,
    sum,
    absoluteChange,
    percentChange,
    first,
    last,
    firstLabel: sortedPoints[0]?.label ?? '',
    lastLabel: sortedPoints[n - 1]?.label ?? '',
  };
});

function getSkewnessLabel(skew: number): string {
  if (Math.abs(skew) < 0.5) return 'Symmetric';
  if (skew > 0) return 'Right-skewed (high outliers)';
  return 'Left-skewed (low outliers)';
}

function handleClose() {
  open = false;
  onOpenChange?.(false);
}
</script>

<ResponsiveSheet bind:open {onOpenChange} defaultWidth={700}>
  {#snippet header()}
    <Sheet.Title class="flex items-center gap-2">
      <Calculator class="h-5 w-5" />
      Summary Statistics
    </Sheet.Title>
    <Sheet.Description>
      Comprehensive statistics for {chartSelection.count} selected periods
    </Sheet.Description>
  {/snippet}

  {#snippet content()}
    <div class="space-y-6">
      <!-- Central Tendency -->
      <Card.Root>
        <Card.Header class="pb-2">
          <Card.Title class="text-base">Central Tendency</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p class="text-muted-foreground text-xs">Mean (Average)</p>
              <p class="text-lg font-semibold tabular-nums">
                {currencyFormatter.format(chartSelection.averageValue)}
              </p>
            </div>
            <div>
              <p class="text-muted-foreground text-xs">Median (Middle)</p>
              <p class="text-lg font-semibold tabular-nums">
                {currencyFormatter.format(chartSelection.medianValue)}
              </p>
            </div>
            <div>
              <p class="text-muted-foreground text-xs">Total Sum</p>
              <p class="text-lg font-semibold tabular-nums">
                {currencyFormatter.format(additionalStats?.sum ?? 0)}
              </p>
            </div>
          </div>
        </Card.Content>
      </Card.Root>

      <!-- Spread / Dispersion -->
      <Card.Root>
        <Card.Header class="pb-2">
          <Card.Title class="flex items-center gap-2 text-base">
            <BarChart3 class="h-4 w-4" />
            Spread & Dispersion
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p class="text-muted-foreground text-xs">Std Deviation (σ)</p>
              <p class="text-lg font-semibold tabular-nums">
                {currencyFormatter.format(chartSelection.standardDeviation)}
              </p>
            </div>
            <div>
              <p class="text-muted-foreground text-xs">Coefficient of Variation</p>
              <p class="text-lg font-semibold tabular-nums">
                {formatPercentRaw(additionalStats?.cv ?? 0, 1)}
              </p>
              <p class="text-muted-foreground text-xs">
                {(additionalStats?.cv ?? 0) < 20
                  ? 'Low variability'
                  : (additionalStats?.cv ?? 0) < 40
                    ? 'Moderate'
                    : 'High variability'}
              </p>
            </div>
            <div>
              <p class="text-muted-foreground text-xs">Range</p>
              <p class="text-lg font-semibold tabular-nums">
                {currencyFormatter.format(chartSelection.maxValue - chartSelection.minValue)}
              </p>
            </div>
            <div>
              <p class="text-muted-foreground text-xs">Minimum</p>
              <p class="text-amount-positive text-lg font-semibold tabular-nums">
                {currencyFormatter.format(chartSelection.minValue)}
              </p>
            </div>
            <div>
              <p class="text-muted-foreground text-xs">Maximum</p>
              <p class="text-destructive text-lg font-semibold tabular-nums">
                {currencyFormatter.format(chartSelection.maxValue)}
              </p>
            </div>
            <div>
              <p class="text-muted-foreground text-xs">IQR (Q3-Q1)</p>
              <p class="text-lg font-semibold tabular-nums">
                {currencyFormatter.format(additionalStats?.iqr ?? 0)}
              </p>
            </div>
          </div>
        </Card.Content>
      </Card.Root>

      <!-- Percentiles -->
      {#if additionalStats}
        <Card.Root>
          <Card.Header class="pb-2">
            <Card.Title class="text-base">Percentiles</Card.Title>
          </Card.Header>
          <Card.Content>
            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <div class="flex-1">
                  <div class="text-muted-foreground mb-1 flex justify-between text-xs">
                    <span>10th</span>
                    <span>25th (Q1)</span>
                    <span>50th (Median)</span>
                    <span>75th (Q3)</span>
                    <span>90th</span>
                  </div>
                  <div class="bg-muted relative h-3 rounded-full">
                    <div
                      class="bg-primary/30 absolute h-full rounded-full"
                      style="left: 10%; right: 10%;">
                    </div>
                    <div
                      class="bg-primary/50 absolute h-full rounded-full"
                      style="left: 25%; right: 25%;">
                    </div>
                    <div class="bg-primary absolute top-0 h-full w-0.5" style="left: 50%;"></div>
                  </div>
                </div>
              </div>
              <div class="grid grid-cols-5 gap-2 text-center text-sm">
                <div>
                  <p class="font-medium tabular-nums">
                    {currencyFormatter.format(additionalStats.p10)}
                  </p>
                </div>
                <div>
                  <p class="font-medium tabular-nums">
                    {currencyFormatter.format(additionalStats.p25)}
                  </p>
                </div>
                <div>
                  <p class="font-medium tabular-nums">
                    {currencyFormatter.format(chartSelection.medianValue)}
                  </p>
                </div>
                <div>
                  <p class="font-medium tabular-nums">
                    {currencyFormatter.format(additionalStats.p75)}
                  </p>
                </div>
                <div>
                  <p class="font-medium tabular-nums">
                    {currencyFormatter.format(additionalStats.p90)}
                  </p>
                </div>
              </div>
            </div>
          </Card.Content>
        </Card.Root>
      {/if}

      <!-- Change Over Time -->
      {#if additionalStats && sortedPoints.length >= 2}
        <Card.Root>
          <Card.Header class="pb-2">
            <Card.Title class="flex items-center gap-2 text-base">
              {#if additionalStats.absoluteChange > 0}
                <TrendingUp class="text-destructive h-4 w-4" />
              {:else if additionalStats.absoluteChange < 0}
                <TrendingDown class="text-amount-positive h-4 w-4" />
              {:else}
                <Minus class="text-muted-foreground h-4 w-4" />
              {/if}
              Change Over Period
            </Card.Title>
          </Card.Header>
          <Card.Content>
            <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p class="text-muted-foreground text-xs">First ({additionalStats.firstLabel})</p>
                <p class="font-semibold tabular-nums">
                  {currencyFormatter.format(additionalStats.first)}
                </p>
              </div>
              <div>
                <p class="text-muted-foreground text-xs">Last ({additionalStats.lastLabel})</p>
                <p class="font-semibold tabular-nums">
                  {currencyFormatter.format(additionalStats.last)}
                </p>
              </div>
              <div>
                <p class="text-muted-foreground text-xs">Absolute Change</p>
                <p
                  class="font-semibold tabular-nums"
                  class:text-destructive={additionalStats.absoluteChange > 0}
                  class:text-amount-positive={additionalStats.absoluteChange < 0}>
                  {additionalStats.absoluteChange > 0 ? '+' : ''}{currencyFormatter.format(
                    additionalStats.absoluteChange
                  )}
                </p>
              </div>
              <div>
                <p class="text-muted-foreground text-xs">Percent Change</p>
                <p
                  class="font-semibold tabular-nums"
                  class:text-destructive={additionalStats.percentChange > 0}
                  class:text-amount-positive={additionalStats.percentChange < 0}>
                  {additionalStats.percentChange > 0 ? '+' : ''}{formatPercentRaw(
                    additionalStats.percentChange,
                    1
                  )}
                </p>
              </div>
            </div>
          </Card.Content>
        </Card.Root>
      {/if}

      <!-- Distribution Shape -->
      {#if additionalStats}
        <Card.Root>
          <Card.Header class="pb-2">
            <Card.Title class="text-base">Distribution Shape</Card.Title>
          </Card.Header>
          <Card.Content>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium">Skewness</p>
                <p class="text-muted-foreground text-xs">
                  {getSkewnessLabel(additionalStats.skewness)}
                </p>
              </div>
              <Badge variant="outline">
                {additionalStats.skewness.toFixed(2)}
              </Badge>
            </div>
          </Card.Content>
        </Card.Root>
      {/if}

      <!-- Top and Bottom Values -->
      <Card.Root>
        <Card.Header class="pb-2">
          <Card.Title class="text-base">Ranked Values</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-destructive mb-2 text-xs font-medium">Highest Values</p>
              <div class="space-y-1">
                {#each sortedByValue.slice(0, 5) as point, i}
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-muted-foreground">{i + 1}. {point.label}</span>
                    <span class="font-medium tabular-nums"
                      >{currencyFormatter.format(point.value)}</span>
                  </div>
                {/each}
              </div>
            </div>
            <div>
              <p class="text-amount-positive mb-2 text-xs font-medium">Lowest Values</p>
              <div class="space-y-1">
                {#each [...sortedByValue].reverse().slice(0, 5) as point, i}
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-muted-foreground">{i + 1}. {point.label}</span>
                    <span class="font-medium tabular-nums"
                      >{currencyFormatter.format(point.value)}</span>
                  </div>
                {/each}
              </div>
            </div>
          </div>
        </Card.Content>
      </Card.Root>
    </div>
  {/snippet}

  {#snippet footer()}
    <Button variant="outline" onclick={handleClose}>Close</Button>
  {/snippet}
</ResponsiveSheet>
