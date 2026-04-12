<script lang="ts">
import { AxisX, AxisY, Tooltip, CustomLine, ZeroLine } from '$lib/components/layercake';
import { currencyFormatter } from '$lib/utils/formatters';
import type { Account } from '$core/schema/accounts';
import {
  calculateExtraPaymentScenarios,
  getLoanBalance,
  formatLoanMonths,
  type LoanPayoffScenario,
} from '$lib/utils/loan-analytics';
import { LayerCake, Svg } from 'layercake';
import { scaleLinear } from 'd3-scale';
import { AnalyticsChartShell } from '$lib/components/charts';
import type { ChartType } from '$lib/components/layercake';
import { Button } from '$lib/components/ui/button';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import * as Popover from '$lib/components/ui/popover';
import DollarSign from '@lucide/svelte/icons/dollar-sign';

interface Props {
  account?: Account;
}

let { account }: Props = $props();

// Custom extra payment input
let customExtraInput = $state<string>('');
let customExtra = $derived.by(() => {
  const parsed = parseFloat(customExtraInput);
  return !isNaN(parsed) && parsed > 0 ? parsed : undefined;
});

// Loan account fields
const balance = $derived(account ? getLoanBalance(account) : 0);
const interestRate = $derived(account?.interestRate || 0);
const payment = $derived(account?.minimumPayment || 0);

// Calculate payoff scenarios with extra payment options
const scenarios = $derived.by(() => {
  if (balance <= 0 || payment <= 0) return [];
  return calculateExtraPaymentScenarios(balance, interestRate, payment, customExtra);
});

// Hidden series state
let hiddenSeries = $state<Set<string>>(new Set());
const visibleScenarios = $derived(scenarios.filter((s) => !hiddenSeries.has(s.id)));

// Chart data: one x per month, one y per visible scenario
const chartData = $derived.by(() => {
  if (visibleScenarios.length === 0) return [];

  const maxMonths = Math.max(
    ...visibleScenarios.map((s) => s.months).filter((m) => m > 0 && m < 600)
  );

  const data: Array<{ month: number; [key: string]: number }> = [];
  for (let m = 0; m <= maxMonths; m++) {
    const point: { month: number; [key: string]: number } = { month: m };
    for (const s of visibleScenarios) {
      const dp = s.data.find((d) => d.month === m);
      if (dp) point[s.id] = dp.balance;
    }
    data.push(point);
  }
  return data;
});

const hasData = $derived(scenarios.length > 0 && balance > 0);

const yDomain = $derived.by((): [number, number] => {
  if (!hasData) return [0, balance || 1000];
  return [0, balance * 1.05];
});

const xDomain = $derived.by((): [number, number] => {
  if (!hasData || chartData.length === 0) return [0, 12];
  return [0, chartData[chartData.length - 1].month];
});

function toggleSeries(id: string) {
  const next = new Set(hiddenSeries);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  hiddenSeries = next;
}

function getSeriesColor(id: string): string {
  switch (id) {
    case 'standard':
      return 'var(--chart-1)';
    case 'extra-100':
      return 'var(--chart-2)';
    case 'extra-200':
      return 'var(--chart-3)';
    case 'extra-500':
      return 'var(--chart-4)';
    case 'custom':
      return 'var(--chart-5)';
    default:
      return 'var(--chart-5)';
  }
}

</script>

<AnalyticsChartShell
  data={chartData}
  supportedChartTypes={['line']}
  defaultChartType="line"
  emptyMessage={balance <= 0
    ? 'No balance to pay off'
    : 'Set a monthly payment in account settings to see scenarios'}
  chartId="loan-payoff">
  {#snippet title()}
    Payoff Scenarios
  {/snippet}

  {#snippet subtitle()}
    See how extra payments accelerate payoff and reduce interest costs
  {/snippet}

  {#snippet headerActions()}
    <Popover.Root>
      <Popover.Trigger>
        {#snippet child({ props })}
          <Button {...props} variant="outline" size="sm" class="gap-1">
            <DollarSign class="h-4 w-4" />
            {customExtra ? `+${currencyFormatter.format(customExtra)}/mo` : 'Custom Extra'}
          </Button>
        {/snippet}
      </Popover.Trigger>
      <Popover.Content class="w-64">
        <div class="space-y-3">
          <div class="space-y-1">
            <Label for="extra-payment">Extra Monthly Payment</Label>
            <Input
              id="extra-payment"
              type="number"
              placeholder="Amount above standard payment..."
              bind:value={customExtraInput}
              min="1"
              step="50" />
          </div>
          <p class="text-muted-foreground text-xs">
            Added on top of your standard {currencyFormatter.format(payment)}/mo payment
          </p>
          {#if customExtraInput}
            <Button
              variant="ghost"
              size="sm"
              class="w-full"
              onclick={() => (customExtraInput = '')}>
              Clear
            </Button>
          {/if}
        </div>
      </Popover.Content>
    </Popover.Root>
  {/snippet}

  {#snippet chart({ data, chartType }: { data: typeof chartData; chartType: ChartType })}
    <div class="flex h-full w-full flex-col">
      {#if !hasData}
        <div class="flex flex-1 items-center justify-center">
          <p class="text-muted-foreground text-center">
            {balance <= 0
              ? 'No outstanding balance'
              : 'Set a monthly payment in account settings'}
          </p>
        </div>
      {:else}
        <div class="min-h-0 flex-1">
          <LayerCake
            {data}
            x="month"
            xScale={scaleLinear()}
            {xDomain}
            yScale={scaleLinear()}
            {yDomain}
            padding={{ top: 20, right: 20, bottom: 40, left: 70 }}>
            <Svg>
              <AxisY ticks={5} gridlines={true} format={(d) => currencyFormatter.format(d)} />
              <AxisX
                ticks={Math.min(data.length, 12)}
                format={(d) => {
                  const m = typeof d === 'number' ? Math.round(d) : 0;
                  if (m === 0) return 'Now';
                  if (m % 12 === 0) return `Yr ${m / 12}`;
                  return `${m}mo`;
                }} />

              <ZeroLine stroke="var(--border)" strokeWidth={1} />

              {#each visibleScenarios as scenario}
                {@const lineData = scenario.data.map((d) => ({ x: d.month, y: d.balance }))}
                <CustomLine
                  data={lineData}
                  stroke={getSeriesColor(scenario.id)}
                  strokeWidth={2}
                  opacity={0.9} />
              {/each}

              <Tooltip>
                {#snippet children({ point })}
                  <div class="bg-popover min-w-52 rounded-md border px-3 py-2 text-sm shadow-md">
                    <p class="font-medium">
                      {point.month === 0 ? 'Current Balance' : `Month ${point.month}`}
                    </p>
                    <div class="mt-2 space-y-1.5">
                      {#each visibleScenarios as scenario}
                        {@const dp = scenario.data.find((d) => d.month === point.month)}
                        {#if dp}
                          <div class="flex items-center justify-between gap-4">
                            <div class="flex items-center gap-2">
                              <div
                                class="h-2 w-2 rounded-full"
                                style="background: {getSeriesColor(scenario.id)};"></div>
                              <span class="text-xs">{scenario.label}</span>
                            </div>
                            <span class="font-mono text-xs">
                              {currencyFormatter.format(dp.balance)}
                            </span>
                          </div>
                        {/if}
                      {/each}
                    </div>
                  </div>
                {/snippet}
              </Tooltip>
            </Svg>
          </LayerCake>
        </div>
      {/if}
    </div>
  {/snippet}

  {#snippet belowChart()}
    <!-- Interactive legend -->
    <div class="mt-3 flex shrink-0 flex-wrap justify-center gap-4">
      {#each scenarios as scenario}
        <button
          class="hover:bg-muted flex items-center gap-2 rounded-md px-2 py-1 text-xs transition-opacity"
          class:opacity-40={hiddenSeries.has(scenario.id)}
          onclick={() => toggleSeries(scenario.id)}>
          <div class="h-3 w-3 rounded-full" style="background: {getSeriesColor(scenario.id)};"></div>
          <span>{scenario.label}</span>
        </button>
      {/each}
    </div>

    <!-- Comparison table -->
    <div class="mt-4 shrink-0 overflow-x-auto border-t pt-4">
      <table class="w-full text-xs">
        <thead>
          <tr class="text-muted-foreground border-b">
            <th class="pb-2 text-left font-medium">Scenario</th>
            <th class="pb-2 text-right font-medium">Payment/mo</th>
            <th class="pb-2 text-right font-medium">Payoff Time</th>
            <th class="pb-2 text-right font-medium">Total Interest</th>
            <th class="pb-2 text-right font-medium">Interest Saved</th>
          </tr>
        </thead>
        <tbody>
          {#each scenarios as scenario}
            <tr
              class="border-border/50 border-b"
              class:opacity-40={hiddenSeries.has(scenario.id)}>
              <td class="py-2">
                <div class="flex items-center gap-2">
                  <div
                    class="h-2 w-2 rounded-full"
                    style="background: {getSeriesColor(scenario.id)};"></div>
                  {scenario.label}
                </div>
              </td>
              <td class="py-2 text-right font-mono">{currencyFormatter.format(scenario.monthlyPayment)}</td>
              <td class="py-2 text-right">{formatLoanMonths(scenario.months)}</td>
              <td class="py-2 text-right font-mono text-amber-600">
                {scenario.totalInterest === Infinity
                  ? '∞'
                  : currencyFormatter.format(scenario.totalInterest)}
              </td>
              <td class="py-2 text-right font-mono text-green-600">
                {scenario.interestSaved > 0 ? currencyFormatter.format(scenario.interestSaved) : '—'}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Summary -->
    <div class="text-muted-foreground mt-3 shrink-0 text-center text-xs">
      Balance: <strong class="text-foreground">{currencyFormatter.format(balance)}</strong>
      {#if interestRate > 0}
        | Rate: <strong class="text-foreground">{interestRate}%</strong>
      {/if}
      {#if payment > 0}
        | Payment: <strong class="text-foreground">{currencyFormatter.format(payment)}/mo</strong>
      {/if}
    </div>
  {/snippet}
</AnalyticsChartShell>
