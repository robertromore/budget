<script lang="ts">
import { AxisX, AxisY, Tooltip, StackedArea, CustomLine } from '$lib/components/layercake';
import { currencyFormatter } from '$lib/utils/formatters';
import type { Account } from '$core/schema/accounts';
import { generateAmortizationSchedule, getLoanBalance, formatLoanMonths } from '$lib/utils/loan-analytics';
import { LayerCake, Svg } from 'layercake';
import { scaleLinear } from 'd3-scale';
import { AnalyticsChartShell } from '$lib/components/charts';

interface Props {
  account?: Account;
}

let { account }: Props = $props();

// Loan account fields
const balance = $derived(account ? getLoanBalance(account) : 0);
const interestRate = $derived(account?.interestRate || 0);
const payment = $derived(account?.minimumPayment || 0);

// Full amortization schedule from current balance
const schedule = $derived.by(() => {
  if (balance <= 0 || payment <= 0) return [];
  return generateAmortizationSchedule(balance, interestRate, payment);
});

// Chart data: cumulative principal vs cumulative interest over time
const chartData = $derived.by(() => {
  return schedule.map((p) => ({
    month: p.month,
    monthLabel: p.monthLabel,
    cumulativeInterest: p.cumulativeInterest,
    cumulativePrincipal: p.cumulativePrincipal,
    total: p.cumulativeInterest + p.cumulativePrincipal,
    // Per-payment breakdown
    principalPayment: p.principalPayment,
    interestPayment: p.interestPayment,
    balance: p.balance,
  }));
});

const hasData = $derived(schedule.length > 1);

// Totals for summary display
const totalInterest = $derived(
  schedule.length > 0 ? schedule[schedule.length - 1].cumulativeInterest : 0
);
const totalPrincipal = $derived(
  schedule.length > 0 ? schedule[schedule.length - 1].cumulativePrincipal : 0
);
const payoffMonths = $derived(schedule.length > 0 ? schedule[schedule.length - 1].month : 0);

// Y domain: max is total paid (principal + interest)
const yDomain = $derived.by((): [number, number] => {
  if (!hasData) return [0, balance || 1000];
  const maxTotal = Math.max(...chartData.map((d) => d.total));
  return [0, maxTotal * 1.05];
});

</script>

<AnalyticsChartShell
  data={chartData}
  supportedChartTypes={['area']}
  defaultChartType="area"
  emptyMessage={balance <= 0
    ? 'No balance to amortize'
    : 'Set a monthly payment in account settings to see the schedule'}
  chartId="loan-amortization">
  {#snippet title()}
    Amortization Schedule
  {/snippet}

  {#snippet subtitle()}
    How each payment is split between principal and interest over the loan life
  {/snippet}

  {#snippet chart({ data }: { data: typeof chartData })}
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
            y="total"
            xScale={scaleLinear()}
            yScale={scaleLinear()}
            {yDomain}
            padding={{ top: 20, right: 20, bottom: 40, left: 70 }}>
            <Svg>
              <AxisY ticks={5} gridlines={true} format={(d) => currencyFormatter.format(d)} />
              <AxisX
                ticks={Math.min(data.length, 10)}
                format={(d) => {
                  const m = typeof d === 'number' ? Math.round(d) : 0;
                  if (m === 0) return 'Now';
                  if (m % 12 === 0) return `Yr ${m / 12}`;
                  return `${m}mo`;
                }} />

              <!-- Stacked area: interest (bottom) then principal (top) -->
              <StackedArea
                keys={['cumulativeInterest', 'cumulativePrincipal']}
                colors={['var(--chart-1)', 'var(--chart-2)']}
                opacity={0.8}
                curved={true} />

              <Tooltip>
                {#snippet children({ point })}
                  <div class="bg-popover min-w-48 rounded-md border px-3 py-2 text-sm shadow-md">
                    <p class="font-medium">
                      {point.month === 0 ? 'Start' : `Month ${point.month}`}
                      {#if point.month >= 12}
                        <span class="text-muted-foreground font-normal text-xs">
                          (Yr {(point.month / 12).toFixed(1)})
                        </span>
                      {/if}
                    </p>
                    <div class="mt-1.5 space-y-1 text-xs">
                      <div class="flex items-center justify-between gap-4">
                        <div class="flex items-center gap-1.5">
                          <div class="h-2 w-2 rounded-full" style="background: var(--chart-2);"></div>
                          <span>Principal paid</span>
                        </div>
                        <span class="font-mono">{currencyFormatter.format(point.cumulativePrincipal)}</span>
                      </div>
                      <div class="flex items-center justify-between gap-4">
                        <div class="flex items-center gap-1.5">
                          <div class="h-2 w-2 rounded-full" style="background: var(--chart-1);"></div>
                          <span>Interest paid</span>
                        </div>
                        <span class="font-mono text-amber-600">{currencyFormatter.format(point.cumulativeInterest)}</span>
                      </div>
                      {#if point.month > 0}
                        <div class="text-muted-foreground border-t pt-1">
                          <p>This payment: {currencyFormatter.format(point.principalPayment + point.interestPayment)}</p>
                          <p>→ Principal: {currencyFormatter.format(point.principalPayment)}</p>
                          <p>→ Interest: {currencyFormatter.format(point.interestPayment)}</p>
                          <p class="mt-1">Remaining balance: {currencyFormatter.format(point.balance)}</p>
                        </div>
                      {/if}
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
    <!-- Legend -->
    <div class="mt-3 flex shrink-0 justify-center gap-6">
      <div class="flex items-center gap-2 text-xs">
        <div class="h-3 w-3 rounded-full" style="background: var(--chart-2);"></div>
        <span>Principal</span>
      </div>
      <div class="flex items-center gap-2 text-xs">
        <div class="h-3 w-3 rounded-full" style="background: var(--chart-1);"></div>
        <span class="text-amber-600">Interest</span>
      </div>
    </div>

    <!-- Summary stats -->
    {#if hasData}
      <div class="mt-4 shrink-0 grid grid-cols-3 gap-3 border-t pt-4 text-center">
        <div>
          <p class="text-muted-foreground text-xs">Payoff</p>
          <p class="font-semibold text-sm">{formatLoanMonths(payoffMonths)}</p>
        </div>
        <div>
          <p class="text-muted-foreground text-xs">Total Interest</p>
          <p class="font-semibold text-sm text-amber-600">{currencyFormatter.format(totalInterest)}</p>
        </div>
        <div>
          <p class="text-muted-foreground text-xs">Total Paid</p>
          <p class="font-semibold text-sm">{currencyFormatter.format(totalInterest + totalPrincipal)}</p>
        </div>
      </div>

      <p class="text-muted-foreground mt-2 shrink-0 text-center text-xs">
        Monthly payment: <strong class="text-foreground">{currencyFormatter.format(payment)}</strong>
        {#if interestRate > 0}
          | Rate: <strong class="text-foreground">{interestRate}%</strong>
        {/if}
      </p>
    {/if}
  {/snippet}
</AnalyticsChartShell>
