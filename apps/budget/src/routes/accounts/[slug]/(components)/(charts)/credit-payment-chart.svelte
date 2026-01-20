<script lang="ts">
	import { AxisX, AxisY, HorizontalLine, Bar, GroupedBar, StackedBar, Brush } from '$lib/components/layercake';
	import { ChartSelectionPanel } from '$lib/components/charts';
	import { currencyFormatter } from '$lib/utils/formatters';
	import { formatMonthYear } from '$lib/utils/date-formatters';
	import type { TransactionsFormat } from '$lib/types';
	import type { Account } from '$lib/schema/accounts';
	import { timePeriodFilter } from '$lib/states/ui/time-period-filter.svelte';
	import { analyzePayments, type PaymentAnalysisPoint } from '$lib/utils/credit-card-analytics';
	import { LayerCake, Svg } from 'layercake';
	import { scaleLinear, scaleBand } from 'd3-scale';
	import { AnalyticsChartShell } from '$lib/components/charts';
	import type { ChartType } from '$lib/components/layercake';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { chartInteractions } from '$lib/states/ui/chart-interactions.svelte';
	import { chartSelection, type SelectedDataPoint } from '$lib/states/ui/chart-selection.svelte';

	interface Props {
		transactions: TransactionsFormat[];
		account?: Account;
	}

	let { transactions, account }: Props = $props();

	// View mode for the chart
	type ViewMode = 'payments' | 'stacked' | 'breakdown';
	let viewMode = $state<ViewMode>('payments');

	// Track externally hovered bar index (from Brush component)
	let externalHoveredIndex = $state<number | null>(null);

	// Chart container width for calculating hover positions
	let chartContainerWidth = $state(0);

	// Calculate which bar index is at a given x position
	// Uses the known padding and scaleBand configuration to estimate
	function getHoveredIndexFromX(x: number): number | null {
		const dataLength = monthlyData.length;
		if (dataLength === 0 || chartContainerWidth === 0) return null;

		// Match the LayerCake padding configuration
		const paddingLeft = 70;
		const paddingRight = 20;
		const chartWidth = chartContainerWidth - paddingLeft - paddingRight;

		// x is relative to SVG, so adjust for left padding
		const adjustedX = x - paddingLeft;
		if (adjustedX < 0 || adjustedX > chartWidth) return null;

		// For scaleBand with paddingInner(0.2) and paddingOuter(0.1):
		// step = chartWidth / dataLength (approximately)
		// outerPadding = step * 0.1
		// So first bar starts at outerPadding
		const step = chartWidth / dataLength;
		const outerPadding = step * 0.1;

		// Find which slot the x position falls into
		const slotX = adjustedX - outerPadding;
		if (slotX < 0) return 0; // Hovering before first bar

		const index = Math.floor(slotX / step);
		return Math.max(0, Math.min(index, dataLength - 1));
	}

	// Handle brush hover - calculate which bar is under cursor and update state
	function handleBrushHover(x: number | null) {
		if (x === null) {
			externalHoveredIndex = null;
			hoveredBarInfo = null;
			hoveredStackedInfo = null;
			hoveredBreakdownBar = null;
			return;
		}

		const index = getHoveredIndexFromX(x);
		externalHoveredIndex = index;

		if (index !== null && monthlyData[index]) {
			const point = monthlyData[index];
			// Set tooltip state based on view mode
			if (viewMode === 'payments') {
				hoveredBarInfo = { item: point, keyIndex: 0, key: 'payment' };
			} else if (viewMode === 'stacked') {
				hoveredStackedInfo = { item: point, key: 'payment' };
			} else {
				hoveredBreakdownBar = point;
			}
		}
	}

	// Hovered bar info for grouped bar tooltip (payments view)
	let hoveredBarInfo = $state<{ item: PaymentAnalysisPoint; keyIndex: number; key: string } | null>(null);

	// Hovered bar info for stacked bar tooltip
	let hoveredStackedInfo = $state<{ item: PaymentAnalysisPoint; key: string } | null>(null);

	// Hovered bar for single bar chart (breakdown view)
	let hoveredBreakdownBar = $state<PaymentAnalysisPoint | null>(null);

	// Access effective time period for this chart (per-chart override or global)
	const effectivePeriod = $derived(
		timePeriodFilter.chartOverrides.get('credit-payments') ?? timePeriodFilter.globalPeriod
	);

	// Get minimum payment and interest rate from account
	const minimumPayment = $derived(account?.minimumPayment || 0);
	const interestRate = $derived(account?.interestRate || 0);

	// Calculate payment analysis from ALL transactions
	const allMonthlyData = $derived.by(() => {
		return analyzePayments(transactions, minimumPayment, interestRate);
	});

	// Filter data based on effective time period (chart override or global)
	const monthlyData = $derived.by(() => {
		const period = effectivePeriod;

		if (period.preset !== 'all-time') {
			const range = timePeriodFilter.getDateRange(period);
			if (range) {
				const filtered = allMonthlyData.filter((item) => {
					return item.date >= range.start && item.date <= range.end;
				});
				return filtered.map((item, idx) => ({
					...item,
					index: idx
				}));
			}
		}

		// Default to last 12 months for 'all-time'
		const last12 = allMonthlyData.slice(-12);
		return last12.map((item, idx) => ({
			...item,
			index: idx
		}));
	});

	const hasData = $derived(monthlyData.length > 0);

	// Y domain - needs to handle stacked view where values are summed
	const yDomain = $derived.by((): [number, number] => {
		if (!hasData) return [0, 1000];

		let max = 0;
		for (const d of monthlyData) {
			if (viewMode === 'stacked') {
				// For stacked, we need the sum of payment + charges
				max = Math.max(max, d.payment + d.chargesThisMonth, d.minimumPayment);
			} else {
				max = Math.max(max, d.payment, d.chargesThisMonth, d.minimumPayment);
			}
		}

		// Add padding
		return [0, max * 1.2];
	});

	// Get payment status color
	function getPaymentStatusColor(status: PaymentAnalysisPoint['paymentStatus']): string {
		switch (status) {
			case 'full':
				return 'var(--chart-2)'; // green
			case 'above-minimum':
				return 'var(--chart-3)'; // teal
			case 'minimum':
				return 'var(--chart-5)'; // amber
			case 'below-minimum':
				return 'var(--chart-1)'; // orange
			case 'none':
				return 'var(--destructive)'; // red
			default:
				return 'var(--chart-3)';
		}
	}

	// Get payment status text
	function getPaymentStatusText(status: PaymentAnalysisPoint['paymentStatus']): string {
		switch (status) {
			case 'full':
				return 'Paid in Full';
			case 'above-minimum':
				return 'Above Minimum';
			case 'minimum':
				return 'Minimum Payment';
			case 'below-minimum':
				return 'Below Minimum';
			case 'none':
				return 'No Payment';
			default:
				return 'Unknown';
		}
	}

	// Convert data point to selection format
	function toSelectedPoint(d: PaymentAnalysisPoint): SelectedDataPoint {
		return {
			id: d.month,
			label: d.monthLabel,
			date: d.date,
			value: d.payment,
			rawData: {
				payment: d.payment,
				minimumPayment: d.minimumPayment,
				interestCharged: d.interestCharged,
				principalPaid: d.principalPaid,
				chargesThisMonth: d.chargesThisMonth,
				paymentStatus: d.paymentStatus
			}
		};
	}

	function handlePointClick(d: PaymentAnalysisPoint) {
		chartSelection.toggle(toSelectedPoint(d));
	}

	function handlePointDblClick(point: PaymentAnalysisPoint) {
		chartInteractions.openDrillDown({
			type: 'month',
			value: point.month,
			label: `${point.monthLabel} Transactions`
		});
	}

	function handleBrushSelect(range: { start: Date | number; end: Date | number } | null) {
		if (!range) return;

		// For band scales, we receive pixel coordinates, so convert to indices
		const startX = typeof range.start === 'number' ? range.start : 0;
		const endX = typeof range.end === 'number' ? range.end : 0;

		const startIdx = getHoveredIndexFromX(startX);
		const endIdx = getHoveredIndexFromX(endX);

		if (startIdx === null || endIdx === null) return;

		const minIdx = Math.min(startIdx, endIdx);
		const maxIdx = Math.max(startIdx, endIdx);

		const pointsInRange = monthlyData.filter((d) => {
			return d.index >= minIdx && d.index <= maxIdx;
		});

		if (pointsInRange.length > 0) {
			const selectedPoints = pointsInRange.map(toSelectedPoint);
			chartSelection.selectRange(selectedPoints);
		}
	}

	function handleBrushClick(x: number, _clickValue: Date | number) {
		// Use the calculated index from x position since band scales don't have invert
		const index = getHoveredIndexFromX(x);
		if (index !== null && monthlyData[index]) {
			chartSelection.toggle(toSelectedPoint(monthlyData[index]));
		}
	}

	// Handle double-click for drill-down (only in breakdown view)
	function handleBrushDblClick(x: number, _value: Date | number) {
		if (viewMode !== 'breakdown') return;

		const index = getHoveredIndexFromX(x);
		if (index !== null && monthlyData[index]) {
			handlePointDblClick(monthlyData[index]);
		}
	}

	// Calculate summary statistics
	const summaryStats = $derived.by(() => {
		if (!hasData) return null;

		let totalPayments = 0;
		let totalCharges = 0;
		let totalInterest = 0;
		let fullPayments = 0;
		let missedPayments = 0;

		for (const d of monthlyData) {
			totalPayments += d.payment;
			totalCharges += d.chargesThisMonth;
			totalInterest += d.interestCharged;
			if (d.paymentStatus === 'full') fullPayments++;
			if (d.paymentStatus === 'none') missedPayments++;
		}

		return {
			totalPayments,
			totalCharges,
			totalInterest,
			fullPayments,
			missedPayments,
			months: monthlyData.length,
			avgPayment: totalPayments / monthlyData.length
		};
	});

	// Prepare grouped bar data - add 'charges' property that GroupedBar expects
	const groupedData = $derived(
		monthlyData.map((d) => ({
			...d,
			charges: d.chargesThisMonth, // GroupedBar looks for d[key], so we need 'charges' not 'chargesThisMonth'
			group: d.month,
			values: [
				{ key: 'payment', value: d.payment, label: 'Payment Made' },
				{ key: 'charges', value: d.chargesThisMonth, label: 'Charges' }
			]
		}))
	);
</script>

<AnalyticsChartShell
	data={monthlyData}
	supportedChartTypes={['bar']}
	defaultChartType="bar"
	emptyMessage="No payment data available"
	chartId="credit-payments"
	allowedPeriodGroups={['months', 'year', 'other']}
>
	{#snippet title()}
		Payment Analysis
	{/snippet}

	{#snippet subtitle()}
		{viewMode === 'payments' ? 'Monthly payments vs charges' : viewMode === 'stacked' ? 'Stacked payments and charges' : 'Payment breakdown by type'}
	{/snippet}

	{#snippet headerActions()}
		<!-- View Mode Selector -->
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button {...props} variant="outline" size="sm" class="gap-1">
						{viewMode === 'payments' ? 'Side by Side' : viewMode === 'stacked' ? 'Stacked' : 'Breakdown'}
						<ChevronDown class="h-3 w-3" />
					</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end" class="w-48">
				<DropdownMenu.Label>View Mode</DropdownMenu.Label>
				<DropdownMenu.Separator />
				<DropdownMenu.CheckboxItem checked={viewMode === 'payments'} onCheckedChange={() => (viewMode = 'payments')}>
					Side by Side
				</DropdownMenu.CheckboxItem>
				<DropdownMenu.CheckboxItem checked={viewMode === 'stacked'} onCheckedChange={() => (viewMode = 'stacked')}>
					Stacked
				</DropdownMenu.CheckboxItem>
				<DropdownMenu.CheckboxItem checked={viewMode === 'breakdown'} onCheckedChange={() => (viewMode = 'breakdown')}>
					Payment Breakdown
				</DropdownMenu.CheckboxItem>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	{/snippet}

	{#snippet chart({ data, chartType }: { data: typeof monthlyData; chartType: ChartType })}
		<div class="flex h-full w-full flex-col">
			<div class="min-h-0 flex-1" bind:clientWidth={chartContainerWidth}>
				{#if viewMode === 'payments'}
					<!-- Grouped bar chart: Payments vs Charges -->
					<LayerCake
						data={groupedData}
						x="index"
						xScale={scaleBand().paddingInner(0.2).paddingOuter(0.1)}
						yScale={scaleLinear()}
						{yDomain}
						padding={{ top: 20, right: 20, bottom: 40, left: 70 }}
					>
						<Svg>
							<AxisY ticks={5} gridlines={true} format={(d) => currencyFormatter.format(d)} />
							<AxisX
								ticks={data.length}
								format={(d) => {
									const idx = typeof d === 'number' ? Math.round(d) : 0;
									const point = data[idx];
									if (!point) return '';
									return point.date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
								}}
							/>

							<!-- Minimum payment reference line -->
							{#if minimumPayment > 0}
								<HorizontalLine value={minimumPayment} stroke="var(--chart-5)" strokeWidth={1.5} strokeDasharray="6 3" label="Min Payment" />
							{/if}

							<GroupedBar
								keys={['payment', 'charges']}
								colors={['var(--chart-2)', 'var(--chart-1)']}
								onclick={({ item }) => handlePointClick(item as PaymentAnalysisPoint)}
								isSelected={(d) => chartSelection.isSelected(d.month)}
								externalHoveredIndex={externalHoveredIndex}
							/>

							<!-- Brush on top to capture all drag events, with onhover for bar detection -->
							<Brush onbrush={handleBrushSelect} onclick={handleBrushClick} onhover={handleBrushHover} fill="var(--primary)" opacity={0.15} cursor="pointer" />
						</Svg>

						<!-- Bar hover tooltip -->
						{#if hoveredBarInfo}
							{@const point = hoveredBarInfo.item}
							{@const status = getPaymentStatusText(point.paymentStatus)}
							{@const statusColor = getPaymentStatusColor(point.paymentStatus)}
							{@const netFlow = point.payment - point.chargesThisMonth}
							<div class="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2">
								<div class="min-w-52 rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
									<p class="font-medium">
										{formatMonthYear(point.date, { long: true, utc: true })}
									</p>
									<div class="mt-1 space-y-1">
										<p class="text-green-600">
											Payment: {currencyFormatter.format(point.payment)}
										</p>
										<p class="text-orange-600">
											Charges: {currencyFormatter.format(point.chargesThisMonth)}
										</p>
										<p class={netFlow >= 0 ? 'font-semibold text-green-600' : 'font-semibold text-red-600'}>
											Net: {netFlow >= 0 ? '+' : ''}{currencyFormatter.format(netFlow)}
										</p>
									</div>
									<div class="mt-2 border-t pt-2">
										<p class="text-xs" style="color: {statusColor}">
											Status: {status}
										</p>
										{#if point.interestCharged > 0}
											<p class="text-muted-foreground text-xs">
												Interest: {currencyFormatter.format(point.interestCharged)}
											</p>
										{/if}
									</div>
								</div>
							</div>
						{/if}
					</LayerCake>
				{:else if viewMode === 'stacked'}
					<!-- Stacked bar chart: Payments and Charges stacked -->
					<LayerCake
						data={groupedData}
						x="index"
						xScale={scaleBand().paddingInner(0.2).paddingOuter(0.1)}
						yScale={scaleLinear()}
						{yDomain}
						padding={{ top: 20, right: 20, bottom: 40, left: 70 }}
					>
						<Svg>
							<AxisY ticks={5} gridlines={true} format={(d) => currencyFormatter.format(d)} />
							<AxisX
								ticks={data.length}
								format={(d) => {
									const idx = typeof d === 'number' ? Math.round(d) : 0;
									const point = data[idx];
									if (!point) return '';
									return point.date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
								}}
							/>

							<!-- Minimum payment reference line -->
							{#if minimumPayment > 0}
								<HorizontalLine value={minimumPayment} stroke="var(--chart-5)" strokeWidth={1.5} strokeDasharray="6 3" label="Min Payment" />
							{/if}

							<StackedBar
								keys={['payment', 'charges']}
								colors={['var(--chart-2)', 'var(--chart-1)']}
								onclick={({ item }) => handlePointClick(item as PaymentAnalysisPoint)}
								isSelected={(d) => chartSelection.isSelected(d.month)}
								externalHoveredIndex={externalHoveredIndex}
							/>

							<!-- Brush on top to capture all drag events, with onhover for bar detection -->
							<Brush onbrush={handleBrushSelect} onclick={handleBrushClick} onhover={handleBrushHover} fill="var(--primary)" opacity={0.15} cursor="pointer" />
						</Svg>

						<!-- Stacked bar hover tooltip -->
						{#if hoveredStackedInfo}
							{@const point = hoveredStackedInfo.item}
							{@const status = getPaymentStatusText(point.paymentStatus)}
							{@const statusColor = getPaymentStatusColor(point.paymentStatus)}
							{@const netFlow = point.payment - point.chargesThisMonth}
							{@const total = point.payment + point.chargesThisMonth}
							<div class="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2">
								<div class="min-w-52 rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
									<p class="font-medium">
										{formatMonthYear(point.date, { long: true, utc: true })}
									</p>
									<div class="mt-1 space-y-1">
										<p class="text-green-600">
											Payment: {currencyFormatter.format(point.payment)}
										</p>
										<p class="text-orange-600">
											Charges: {currencyFormatter.format(point.chargesThisMonth)}
										</p>
										<p class="text-muted-foreground">
											Total: {currencyFormatter.format(total)}
										</p>
										<p class={netFlow >= 0 ? 'font-semibold text-green-600' : 'font-semibold text-red-600'}>
											Net: {netFlow >= 0 ? '+' : ''}{currencyFormatter.format(netFlow)}
										</p>
									</div>
									<div class="mt-2 border-t pt-2">
										<p class="text-xs" style="color: {statusColor}">
											Status: {status}
										</p>
										{#if point.interestCharged > 0}
											<p class="text-muted-foreground text-xs">
												Interest: {currencyFormatter.format(point.interestCharged)}
											</p>
										{/if}
									</div>
								</div>
							</div>
						{/if}
					</LayerCake>
				{:else}
					<!-- Single bar chart showing just payments, colored by status -->
					<LayerCake
						{data}
						x="index"
						y="payment"
						xScale={scaleBand().paddingInner(0.2).paddingOuter(0.1)}
						yScale={scaleLinear()}
						{yDomain}
						padding={{ top: 20, right: 20, bottom: 40, left: 70 }}
					>
						<Svg>
							<AxisY ticks={5} gridlines={true} format={(d) => currencyFormatter.format(d)} />
							<AxisX
								ticks={data.length}
								format={(d) => {
									const idx = typeof d === 'number' ? Math.round(d) : 0;
									const point = data[idx];
									if (!point) return '';
									return point.date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
								}}
							/>

							<!-- Minimum payment reference line -->
							{#if minimumPayment > 0}
								<HorizontalLine value={minimumPayment} stroke="var(--chart-5)" strokeWidth={1.5} strokeDasharray="6 3" label="Min Payment" />
							{/if}

							<Bar
								fill={(d) => getPaymentStatusColor(d.paymentStatus)}
								isSelected={(d) => chartSelection.isSelected(d.month)}
								externalHoveredIndex={externalHoveredIndex}
							/>

							<!-- Brush on top to capture all drag events, with onhover for bar detection and ondblclick for drill-down -->
							<Brush onbrush={handleBrushSelect} onclick={handleBrushClick} ondblclick={handleBrushDblClick} onhover={handleBrushHover} fill="var(--primary)" opacity={0.15} cursor="pointer" />
						</Svg>

						<!-- Bar hover tooltip -->
						{#if hoveredBreakdownBar}
							{@const point = hoveredBreakdownBar}
							{@const status = getPaymentStatusText(point.paymentStatus)}
							{@const statusColor = getPaymentStatusColor(point.paymentStatus)}
							<div class="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2">
								<div class="min-w-48 rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
									<p class="font-medium">
										{formatMonthYear(point.date, { long: true, utc: true })}
									</p>
									<p class="mt-1 font-semibold" style="color: {statusColor}">
										{currencyFormatter.format(point.payment)}
									</p>
									<p class="text-xs" style="color: {statusColor}">
										{status}
									</p>
									<div class="text-muted-foreground mt-2 border-t pt-2 text-xs">
										{#if minimumPayment > 0}
											<p>Min Required: {currencyFormatter.format(minimumPayment)}</p>
										{/if}
										<p>Principal Paid: {currencyFormatter.format(point.principalPaid)}</p>
										{#if point.interestCharged > 0}
											<p>Interest: {currencyFormatter.format(point.interestCharged)}</p>
										{/if}
									</div>
									<p class="text-muted-foreground mt-2 border-t pt-1 text-xs">Double-click for transaction details</p>
								</div>
							</div>
						{/if}
					</LayerCake>
				{/if}
			</div>

			<!-- Legend -->
			{#if viewMode === 'payments' || viewMode === 'stacked'}
				<div class="text-muted-foreground mt-3 flex shrink-0 justify-center gap-6 text-xs">
					<div class="flex items-center gap-1.5">
						<div class="h-3 w-3 rounded-sm" style="background-color: var(--chart-2);"></div>
						<span>Payments</span>
					</div>
					<div class="flex items-center gap-1.5">
						<div class="h-3 w-3 rounded-sm" style="background-color: var(--chart-1);"></div>
						<span>Charges</span>
					</div>
					{#if minimumPayment > 0}
						<div class="flex items-center gap-1.5">
							<div class="h-0.5 w-4 border-t-2 border-dashed" style="border-color: var(--chart-5);"></div>
							<span>Min Payment</span>
						</div>
					{/if}
				</div>
			{:else}
				<div class="text-muted-foreground mt-3 flex shrink-0 flex-wrap justify-center gap-4 text-xs">
					<div class="flex items-center gap-1.5">
						<div class="h-3 w-3 rounded-sm" style="background-color: var(--chart-2);"></div>
						<span>Full</span>
					</div>
					<div class="flex items-center gap-1.5">
						<div class="h-3 w-3 rounded-sm" style="background-color: var(--chart-3);"></div>
						<span>Above Min</span>
					</div>
					<div class="flex items-center gap-1.5">
						<div class="h-3 w-3 rounded-sm" style="background-color: var(--chart-5);"></div>
						<span>Minimum</span>
					</div>
					<div class="flex items-center gap-1.5">
						<div class="h-3 w-3 rounded-sm" style="background-color: var(--chart-1);"></div>
						<span>Below Min</span>
					</div>
					<div class="flex items-center gap-1.5">
						<div class="h-3 w-3 rounded-sm" style="background-color: var(--destructive);"></div>
						<span>Missed</span>
					</div>
				</div>
			{/if}

			<!-- Summary stats -->
			{#if summaryStats}
				<div class="text-muted-foreground mt-3 shrink-0 border-t pt-3 text-center text-xs">
					<div class="flex justify-center gap-6">
						<span>Total Paid: <strong class="text-foreground">{currencyFormatter.format(summaryStats.totalPayments)}</strong></span>
						<span>Total Charged: <strong class="text-foreground">{currencyFormatter.format(summaryStats.totalCharges)}</strong></span>
						{#if summaryStats.totalInterest > 0}
							<span>Interest Paid: <strong class="text-foreground">{currencyFormatter.format(summaryStats.totalInterest)}</strong></span>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Selection hint -->
			{#if !chartSelection.isActive}
				<p class="text-muted-foreground mt-2 shrink-0 text-center text-xs">
					{viewMode === 'breakdown' ? 'Click or drag to select, double-click for details' : 'Click or drag to select'}
				</p>
			{/if}
		</div>
	{/snippet}
</AnalyticsChartShell>

<!-- Chart selection floating panel -->
<ChartSelectionPanel />
