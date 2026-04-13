<script lang="ts">
import { AxisX, AxisY, Tooltip, CustomLine, HorizontalLine } from '$lib/components/layercake';
import { currencyFormatter, formatPercentRaw } from '$lib/utils/formatters';
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
const originalPrincipal = $derived(account?.debtLimit ?? balance);
const interestRate = $derived(account?.interestRate || 0);
const payment = $derived(account?.minimumPayment || 0);

// Full amortization schedule from current balance
const schedule = $derived.by(() => {
  if (balance <= 0 || payment <= 0) return [];
  return generateAmortizationSchedule(balance, interestRate, payment);
});

// Equity = principal paid off = original principal - remaining balance
// For a loan starting from `balance` (not full original), equity starts at 0 and grows
const equityData = $derived.by(() => {
  return schedule.map((p) => ({
    x: p.month,
    yBalance: p.balance,
    yEquity: p.cumulativePrincipal,
    month: p.month,
    monthLabel: p.monthLabel,
  }));
});

const balanceLine = $derived(equityData.map((d) => ({ x: d.x, y: d.yBalance })));
const equityLine = $derived(equityData.map((d) => ({ x: d.x, y: d.yEquity })));

const hasData = $derived(schedule.length > 1);

// Y domain: max is the starting balance
const yDomain = $derived.by((): [number, number] => {
  if (!hasData) return [0, balance || 1000];
  return [0, balance * 1.05];
});

// X domain
const xDomain = $derived.by((): [number, number] => {
  if (!hasData || equityData.length === 0) return [0, 12];
  return [0, equityData[equityData.length - 1].x];
});

// Find the crossover month (where equity > remaining balance)
const crossoverMonth = $derived.by(() => {
  for (const d of equityData) {
    if (d.yEquity >= d.yBalance) return d.month;
  }
  return null;
});

</script>

<AnalyticsChartShell
  data={equityData}
  supportedChartTypes={['line']}
  defaultChartType="line"
  emptyMessage={balance <= 0
    ? 'No balance to track'
    : 'Set a monthly payment in account settings to see equity growth'}
  chartId="loan-equity">
  {#snippet title()}
    Equity Growth
  {/snippet}

  {#snippet subtitle()}
    How your ownership stake grows as you pay down the loan balance
  {/snippet}

  {#snippet chart()}
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
            data={equityData}
            x="x"
            xScale={scaleLinear()}
            {xDomain}
            yScale={scaleLinear()}
            {yDomain}
            padding={{ top: 20, right: 20, bottom: 40, left: 70 }}>
            <Svg>
              <AxisY ticks={5} gridlines={true} format={(d) => currencyFormatter.format(d)} />
              <AxisX
                ticks={Math.min(equityData.length, 10)}
                format={(d) => {
                  const m = typeof d === 'number' ? Math.round(d) : 0;
                  if (m === 0) return 'Now';
                  if (m % 12 === 0) return `Yr ${m / 12}`;
                  return `${m}mo`;
                }} />

              <!-- Remaining balance line (declining) -->
              <CustomLine
                data={balanceLine}
                stroke="var(--chart-1)"
                strokeWidth={2.5}
                opacity={0.9} />

              <!-- Equity line (growing) -->
              <CustomLine
                data={equityLine}
                stroke="var(--chart-2)"
                strokeWidth={2.5}
                opacity={0.9} />

              <!-- Crossover marker: 50% equity line -->
              {#if balance > 0}
                <HorizontalLine
                  value={balance / 2}
                  stroke="var(--muted-foreground)"
                  strokeWidth={1}
                  strokeDasharray="4 4" />
              {/if}

              <Tooltip>
                {#snippet children({ point })}
                  {@const equityPct = balance > 0 ? (point.yEquity / balance) * 100 : 0}
                  <div class="bg-popover min-w-48 rounded-md border px-3 py-2 text-sm shadow-md">
                    <p class="font-medium">
                      {point.month === 0 ? 'Now' : `Month ${point.month}`}
                      {#if point.month >= 12}
                        <span class="text-muted-foreground font-normal text-xs">
                          (Yr {(point.month / 12).toFixed(1)})
                        </span>
                      {/if}
                    </p>
                    <div class="mt-1.5 space-y-1 text-xs">
                      <div class="flex items-center justify-between gap-4">
                        <div class="flex items-center gap-1.5">
                          <div class="h-2 w-2 rounded-full" style="background: var(--chart-1);"></div>
                          <span>Remaining balance</span>
                        </div>
                        <span class="font-mono">{currencyFormatter.format(point.yBalance)}</span>
                      </div>
                      <div class="flex items-center justify-between gap-4">
                        <div class="flex items-center gap-1.5">
                          <div class="h-2 w-2 rounded-full" style="background: var(--chart-2);"></div>
                          <span>Principal paid</span>
                        </div>
                        <span class="font-mono text-amount-positive">{currencyFormatter.format(point.yEquity)}</span>
                      </div>
                      <div class="text-muted-foreground border-t pt-1">
                        <p>{formatPercentRaw(equityPct, 1)} paid off</p>
                      </div>
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
        <div class="h-0.5 w-6" style="background: var(--chart-1);"></div>
        <span>Remaining Balance</span>
      </div>
      <div class="flex items-center gap-2 text-xs">
        <div class="h-0.5 w-6" style="background: var(--chart-2);"></div>
        <span class="text-amount-positive">Principal Paid</span>
      </div>
    </div>

    {#if hasData}
      <!-- Current equity summary -->
      <div class="mt-4 shrink-0 grid grid-cols-3 gap-3 border-t pt-4 text-center">
        <div>
          <p class="text-muted-foreground text-xs">Current Balance</p>
          <p class="font-semibold text-sm">{currencyFormatter.format(balance)}</p>
        </div>
        <div>
          <p class="text-muted-foreground text-xs">Progress</p>
          {#if originalPrincipal > 0 && originalPrincipal > balance}
            {@const paidOff = originalPrincipal - balance}
            <p class="font-semibold text-sm text-amount-positive">
              {formatPercentRaw((paidOff / originalPrincipal) * 100, 1)} paid
            </p>
          {:else}
            <p class="text-muted-foreground text-sm">—</p>
          {/if}
        </div>
        <div>
          <p class="text-muted-foreground text-xs">50% Mark</p>
          {#if crossoverMonth !== null}
            <p class="font-semibold text-sm">{formatLoanMonths(crossoverMonth)}</p>
          {:else}
            <p class="text-muted-foreground text-sm">—</p>
          {/if}
        </div>
      </div>
    {/if}
  {/snippet}
</AnalyticsChartShell>
