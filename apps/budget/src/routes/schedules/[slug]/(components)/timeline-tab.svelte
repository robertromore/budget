<script lang="ts">
import * as Card from '$lib/components/ui/card';
import { Badge } from '$lib/components/ui/badge';
import * as Chart from '$lib/components/ui/chart';
import { AreaChart, Axis } from 'layerchart';
import { currencyFormatter } from '$lib/utils/formatters';
import type { PageData } from '../$types';
import { formatAmount } from '../(data)';

// Icons
import BarChart3 from '@lucide/svelte/icons/bar-chart-3';

let { schedule, cumulativeBalanceData, futureProjections }: {
  schedule: PageData['schedule'];
  cumulativeBalanceData: any[];
  futureProjections: any[];
} = $props();

// Chart configuration
const timelineChartConfig = {
  historical: {
    label: 'Historical',
    color: 'hsl(var(--chart-1))'
  },
  projected: {
    label: 'Projected',
    color: 'hsl(var(--chart-2))'
  }
} satisfies Chart.ChartConfig;
</script>

<div class="space-y-4">
  {#if cumulativeBalanceData.length > 0}
    <Card.Root>
      <Card.Header class="pb-2">
        <Card.Title class="text-sm">Cumulative Balance Impact</Card.Title>
        <Card.Description class="text-xs">
          Running total showing cumulative effect of scheduled transactions over time
        </Card.Description>
      </Card.Header>
      <Card.Content class="pt-2">
        <Chart.Container config={timelineChartConfig} class="h-[300px] w-full">
          <AreaChart
            data={cumulativeBalanceData}
            x="dateLabel"
            y="amount"
            yNice
            padding={{ left: 80, right: 20, top: 20, bottom: 60 }}
          >
            {#snippet axis()}
              <Axis placement="left" format="currency" grid rule />
              <Axis
                placement="bottom"
                grid
                rule
                tickLabelProps={{
                  rotate: 315,
                  textAnchor: "end",
                }}
              />
            {/snippet}

            {#snippet tooltip()}
              <Chart.Tooltip>
                {#snippet formatter({ value, payload })}
                  <div class="flex flex-col space-y-1">
                    <div class="flex items-center justify-between">
                      <span class="text-muted-foreground">Cumulative Balance</span>
                      <span class="font-mono font-medium">
                        {currencyFormatter.format(Number(value))}
                      </span>
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="text-muted-foreground">Type</span>
                      <Badge variant="outline">
                        {Array.isArray(payload) && payload[0]?.payload?.type === 'historical' ? 'Historical' : 'Projected'}
                      </Badge>
                    </div>
                  </div>
                {/snippet}
              </Chart.Tooltip>
            {/snippet}
          </AreaChart>
        </Chart.Container>

        <!-- Cumulative balance legend -->
        <div class="flex items-center gap-6 mt-4 text-sm">
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full bg-primary"></div>
            <span>Historical Cumulative</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full bg-muted-foreground opacity-50"></div>
            <span>Projected Cumulative</span>
          </div>
        </div>
      </Card.Content>
    </Card.Root>

    <!-- Future Projections Grid -->
    {#if futureProjections.length > 0}
      <Card.Root>
        <Card.Header class="pb-2">
          <Card.Title class="text-sm">Future Projections</Card.Title>
          <Card.Description class="text-xs">
            Detailed view of upcoming scheduled transactions
          </Card.Description>
        </Card.Header>
        <Card.Content class="pt-2">
          <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {#each futureProjections.slice(0, 12) as projection, index}
              <div class="p-3 border rounded space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-medium">
                    {projection.date.toLocaleDateString()}
                  </span>
                  {#if index === 0}
                    <Badge variant="default" class="text-xs">Next</Badge>
                  {:else if projection.monthsFromNow === 0}
                    <Badge variant="secondary" class="text-xs">This month</Badge>
                  {:else}
                    <Badge variant="outline" class="text-xs">
                      {projection.monthsFromNow} months
                    </Badge>
                  {/if}
                </div>
                <div class="text-sm font-semibold">
                  {formatAmount(schedule)}
                </div>
                <div class="text-xs text-muted-foreground">
                  {Math.ceil((projection.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days from now
                </div>
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    {/if}
  {:else}
    <Card.Root class="p-8 text-center">
      <BarChart3 class="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <h3 class="text-lg font-semibold mb-2">No Timeline Data</h3>
      <p class="text-muted-foreground mb-4">
        {#if schedule.status !== 'active'}
          Schedule is inactive - activate to see projections
        {:else if !schedule.scheduleDate}
          This is a one-time schedule with no recurring pattern
        {:else}
          No transactions have been created yet
        {/if}
      </p>
    </Card.Root>
  {/if}
</div>
