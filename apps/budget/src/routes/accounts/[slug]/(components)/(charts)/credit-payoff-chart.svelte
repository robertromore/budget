<script lang="ts">
	import { Line, AxisX, AxisY, Tooltip, CustomLine, ZeroLine, InteractiveLegend, MultiLine, Scatter } from '$lib/components/layercake';
	import { currencyFormatter, formatPercentRaw } from '$lib/utils/formatters';
	import type { TransactionsFormat } from '$lib/types';
	import type { Account } from '$lib/schema/accounts';
	import { calculatePayoffScenarios, getCurrentBalance, type PayoffScenario } from '$lib/utils/credit-card-analytics';
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
		transactions: TransactionsFormat[];
		account?: Account;
	}

	let { transactions, account }: Props = $props();

	// Custom payment amount input
	let customPaymentInput = $state<string>('');
	let customPayment = $derived.by(() => {
		const parsed = parseFloat(customPaymentInput);
		return !isNaN(parsed) && parsed > 0 ? parsed : undefined;
	});

	// Get account data
	const currentBalance = $derived(account ? getCurrentBalance(account, transactions) : 0);
	const minimumPayment = $derived(account?.minimumPayment || 0);
	const interestRate = $derived(account?.interestRate || 0);
	const creditLimit = $derived(account?.debtLimit || 0);

	// Calculate payoff scenarios
	const scenarios = $derived.by(() => {
		if (currentBalance <= 0) return [];
		return calculatePayoffScenarios(currentBalance, interestRate, minimumPayment, customPayment);
	});

	// Hidden series state for interactive legend
	let hiddenSeries = $state<Set<string>>(new Set());

	// Visible scenarios (not hidden)
	const visibleScenarios = $derived(scenarios.filter((s) => !hiddenSeries.has(s.id)));

	// Get the combined data for multi-line chart
	const chartData = $derived.by(() => {
		if (visibleScenarios.length === 0) return [];

		// Find the max months across all visible scenarios
		const maxMonths = Math.max(...visibleScenarios.map((s) => s.months).filter((m) => m > 0 && m < 600));

		// Create data points for each month
		const data: Array<{ month: number; monthLabel: string; [key: string]: number | string }> = [];

		for (let m = 0; m <= maxMonths; m++) {
			const point: { month: number; monthLabel: string; [key: string]: number | string } = {
				month: m,
				monthLabel: m === 0 ? 'Now' : `Month ${m}`
			};

			for (const scenario of visibleScenarios) {
				const dataPoint = scenario.data.find((d) => d.month === m);
				if (dataPoint) {
					point[scenario.id] = dataPoint.balance;
				}
			}

			data.push(point);
		}

		return data;
	});

	const hasData = $derived(scenarios.length > 0 && currentBalance > 0);

	// Y domain
	const yDomain = $derived.by((): [number, number] => {
		if (!hasData) return [0, currentBalance || 1000];
		return [0, currentBalance * 1.1];
	});

	// X domain (months)
	const xDomain = $derived.by((): [number, number] => {
		if (!hasData || chartData.length === 0) return [0, 12];
		const maxMonth = Math.max(...chartData.map((d) => d.month));
		return [0, maxMonth];
	});

	// Toggle series visibility
	function toggleSeries(seriesId: string) {
		const newHidden = new Set(hiddenSeries);
		if (newHidden.has(seriesId)) {
			newHidden.delete(seriesId);
		} else {
			newHidden.add(seriesId);
		}
		hiddenSeries = newHidden;
	}

	// Get series color
	function getSeriesColor(id: string): string {
		switch (id) {
			case 'minimum':
				return 'var(--chart-1)';
			case 'double':
				return 'var(--chart-2)';
			case 'twelve-months':
				return 'var(--chart-3)';
			case 'custom':
				return 'var(--chart-4)';
			default:
				return 'var(--chart-5)';
		}
	}

	// Format months to years/months
	function formatMonths(months: number): string {
		if (months === 0) return 'Never (payment too low)';
		if (months >= 600) return '50+ years';
		if (months < 12) return `${months} month${months === 1 ? '' : 's'}`;
		const years = Math.floor(months / 12);
		const remainingMonths = months % 12;
		if (remainingMonths === 0) return `${years} year${years === 1 ? '' : 's'}`;
		return `${years}y ${remainingMonths}m`;
	}

	// Calculate suggested payment to pay off in 12 months
	const suggestedPayment = $derived.by(() => {
		if (currentBalance <= 0 || interestRate <= 0) return currentBalance / 12;

		const monthlyRate = interestRate / 100 / 12;
		const n = 12;
		// Loan payment formula
		return (monthlyRate * currentBalance) / (1 - Math.pow(1 + monthlyRate, -n));
	});
</script>

<AnalyticsChartShell
	data={chartData}
	supportedChartTypes={['line']}
	defaultChartType="line"
	emptyMessage={currentBalance <= 0 ? 'No balance to pay off - you are debt free!' : 'Unable to calculate payoff scenarios'}
	chartId="credit-payoff"
>
	{#snippet title()}
		Payoff Projections
	{/snippet}

	{#snippet subtitle()}
		Compare different payment strategies to see how fast you can pay off your balance
	{/snippet}

	{#snippet headerActions()}
		<!-- Custom Payment Input -->
		<Popover.Root>
			<Popover.Trigger>
				{#snippet child({ props })}
					<Button {...props} variant="outline" size="sm" class="gap-1">
						<DollarSign class="h-4 w-4" />
						{customPayment ? currencyFormatter.format(customPayment) : 'Custom'}
					</Button>
				{/snippet}
			</Popover.Trigger>
			<Popover.Content class="w-64">
				<div class="space-y-3">
					<div class="space-y-1">
						<Label for="custom-payment">Custom Monthly Payment</Label>
						<Input
							id="custom-payment"
							type="number"
							placeholder="Enter amount..."
							bind:value={customPaymentInput}
							min="1"
							step="10"
						/>
					</div>
					{#if suggestedPayment > 0}
						<p class="text-muted-foreground text-xs">
							Suggested: {currencyFormatter.format(suggestedPayment)}/mo to pay off in 12 months
						</p>
					{/if}
					{#if customPaymentInput}
						<Button
							variant="ghost"
							size="sm"
							class="w-full"
							onclick={() => (customPaymentInput = '')}
						>
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
					<div class="text-center">
						<p class="text-2xl">🎉</p>
						<p class="text-muted-foreground mt-2">
							{currentBalance <= 0 ? 'Your balance is $0 - great job!' : 'Set a minimum payment in account settings to see projections'}
						</p>
					</div>
				</div>
			{:else}
				<div class="min-h-0 flex-1">
					<LayerCake
						{data}
						x="month"
						xScale={scaleLinear()}
						xDomain={xDomain}
						yScale={scaleLinear()}
						{yDomain}
						padding={{ top: 20, right: 20, bottom: 40, left: 70 }}
					>
						<Svg>
							<AxisY ticks={5} gridlines={true} format={(d) => currencyFormatter.format(d)} />
							<AxisX
								ticks={Math.min(data.length, 12)}
								format={(d) => {
									if (d === 0) return 'Now';
									return `${d}mo`;
								}}
							/>

							<ZeroLine stroke="var(--chart-2)" strokeWidth={2} />

							<!-- Draw lines for each visible scenario -->
							{#each visibleScenarios as scenario}
								{@const lineData = scenario.data.map((d) => ({ x: d.month, y: d.balance }))}
								<CustomLine
									data={lineData}
									stroke={getSeriesColor(scenario.id)}
									strokeWidth={2}
									opacity={0.9}
								/>
							{/each}

							<Tooltip>
								{#snippet children({ point })}
									{@const monthNum = point.month}
									<div class="min-w-52 rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
										<p class="font-medium">
											{monthNum === 0 ? 'Current Balance' : `Month ${monthNum}`}
										</p>
										<div class="mt-2 space-y-1.5">
											{#each visibleScenarios as scenario}
												{@const dataPoint = scenario.data.find((d) => d.month === monthNum)}
												{#if dataPoint}
													<div class="flex items-center justify-between gap-4">
														<div class="flex items-center gap-2">
															<div
																class="h-2 w-2 rounded-full"
																style="background-color: {getSeriesColor(scenario.id)};"
															></div>
															<span class="text-xs">{scenario.label}</span>
														</div>
														<span class="font-mono text-xs">{currencyFormatter.format(dataPoint.balance)}</span>
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

				<!-- Interactive Legend -->
				<div class="mt-3 flex shrink-0 flex-wrap justify-center gap-4">
					{#each scenarios as scenario}
						<button
							class="flex items-center gap-2 rounded-md px-2 py-1 text-xs transition-opacity hover:bg-muted"
							class:opacity-40={hiddenSeries.has(scenario.id)}
							onclick={() => toggleSeries(scenario.id)}
						>
							<div
								class="h-3 w-3 rounded-full"
								style="background-color: {getSeriesColor(scenario.id)};"
							></div>
							<span>{scenario.label}</span>
						</button>
					{/each}
				</div>

				<!-- Scenario comparison table -->
				<div class="mt-4 shrink-0 overflow-x-auto border-t pt-4">
					<table class="w-full text-xs">
						<thead>
							<tr class="text-muted-foreground border-b">
								<th class="pb-2 text-left font-medium">Scenario</th>
								<th class="pb-2 text-right font-medium">Payment/mo</th>
								<th class="pb-2 text-right font-medium">Time to Payoff</th>
								<th class="pb-2 text-right font-medium">Total Interest</th>
								<th class="pb-2 text-right font-medium">Total Paid</th>
							</tr>
						</thead>
						<tbody>
							{#each scenarios as scenario}
								<tr class="border-b border-border/50" class:opacity-40={hiddenSeries.has(scenario.id)}>
									<td class="py-2">
										<div class="flex items-center gap-2">
											<div
												class="h-2 w-2 rounded-full"
												style="background-color: {getSeriesColor(scenario.id)};"
											></div>
											{scenario.label}
										</div>
									</td>
									<td class="py-2 text-right font-mono">{currencyFormatter.format(scenario.monthlyPayment)}</td>
									<td class="py-2 text-right">{formatMonths(scenario.months)}</td>
									<td class="py-2 text-right font-mono text-amber-600">
										{scenario.totalInterest === Infinity ? '∞' : currencyFormatter.format(scenario.totalInterest)}
									</td>
									<td class="py-2 text-right font-mono">
										{scenario.totalPaid === Infinity ? '∞' : currencyFormatter.format(scenario.totalPaid)}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- Current status summary -->
				<div class="text-muted-foreground mt-3 shrink-0 text-center text-xs">
					Current Balance: <strong class="text-foreground">{currencyFormatter.format(currentBalance)}</strong>
					{#if interestRate > 0}
						| APR: <strong class="text-foreground">{formatPercentRaw(interestRate, 2)}</strong>
					{/if}
					{#if minimumPayment > 0}
						| Minimum: <strong class="text-foreground">{currencyFormatter.format(minimumPayment)}/mo</strong>
					{/if}
				</div>
			{/if}
		</div>
	{/snippet}
</AnalyticsChartShell>
