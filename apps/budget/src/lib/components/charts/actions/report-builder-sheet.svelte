<script lang="ts">
	import { browser } from '$app/environment';
	import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Switch } from '$lib/components/ui/switch';
	import { Badge } from '$lib/components/ui/badge';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Separator } from '$lib/components/ui/separator';
	import { chartSelection } from '$lib/states/ui/chart-selection.svelte';
	import { listReportTemplates, createReportTemplate, recordTemplateUsage } from '$lib/query/reports';
	import { getAllAccountTransactions } from '$lib/query/transactions';
	import {
		DEFAULT_REPORT_CONFIG,
		PREDEFINED_TEMPLATES,
		type ReportConfig,
		type ReportTemplateType,
	} from '$lib/schema/report-templates';
	import { currencyFormatter } from '$lib/utils/formatters';
	import { generatePdf, downloadHtml, downloadMarkdown } from '$lib/utils/pdf-client';
	import { toast } from 'svelte-sonner';

	// LayerCake for charts
	import { LayerCake, Svg } from 'layercake';
	import { Bar, Line, Area, AxisX, AxisY, HorizontalBar } from '$lib/components/layercake';

	// Icons
	import FileText from '@lucide/svelte/icons/file-text';
	import Save from '@lucide/svelte/icons/save';
	import Eye from '@lucide/svelte/icons/eye';
	import Settings from '@lucide/svelte/icons/settings';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import FileDown from '@lucide/svelte/icons/file-down';
	import FileCode from '@lucide/svelte/icons/file-code';
	import FileType from '@lucide/svelte/icons/file-type';
	import PieChart from '@lucide/svelte/icons/pie-chart';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import LineChart from '@lucide/svelte/icons/line-chart';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';

	// Static hex colors for PDF export (html2canvas doesn't support oklch/CSS variables)
	const CHART_COLORS = ['#e67e22', '#1abc9c', '#34495e', '#f1c40f', '#f39c12'];
	const PRIMARY_CHART_COLOR = '#e67e22';

	interface Props {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}

	let { open = $bindable(false), onOpenChange }: Props = $props();

	// Config state - starts with defaults
	let config = $state<ReportConfig>({ ...DEFAULT_REPORT_CONFIG });
	let selectedTemplateId = $state<number | null>(null);
	let selectedTemplateType = $state<ReportTemplateType>('spending_summary');
	let isGenerating = $state(false);
	let isSaving = $state(false);
	let saveTemplateName = $state('');
	let saveTemplateDescription = $state('');

	// Collapsible section states
	let sectionsOpen = $state(true);
	let chartsOpen = $state(false);
	let displayOpen = $state(false);
	let brandingOpen = $state(false);

	// Get account ID from selected points
	const accountId = $derived(chartSelection.selectedPoints[0]?.accountId);

	// Query saved templates (only in browser)
	const templatesQuery = $derived(browser ? listReportTemplates().options() : null);

	// Query transactions for report data (only in browser)
	const transactionsQuery = $derived.by(() => {
		if (!browser) return null;
		if (!accountId) return null;
		return getAllAccountTransactions(accountId).options();
	});

	// Create mutation (lazy)
	const createMutation = $derived(browser ? createReportTemplate.options() : null);
	const usageMutation = $derived(browser ? recordTemplateUsage.options() : null);

	// Get selected months
	const selectedMonths = $derived(chartSelection.selectedPoints.map((p) => p.id));
	const selectedMonthsSet = $derived(new Set(selectedMonths));

	// Transaction type for filtering
	interface TransactionData {
		date: string;
		amount: number;
		category?: { name: string } | null;
	}

	// Filter transactions to selected months
	const filteredTransactions = $derived.by((): TransactionData[] => {
		const data = transactionsQuery?.data;
		if (!data || selectedMonthsSet.size === 0) return [];
		return (data as TransactionData[]).filter((tx) => {
			const txMonth = tx.date.slice(0, 7);
			return selectedMonthsSet.has(txMonth);
		});
	});

	// Calculate statistics for preview
	const stats = $derived.by(() => {
		const txs = filteredTransactions;
		if (txs.length === 0) {
			return { count: 0, total: 0, income: 0, expenses: 0, avgTransaction: 0 };
		}

		let income = 0;
		let expenses = 0;

		for (const tx of txs) {
			if (tx.amount > 0) income += tx.amount;
			else expenses += Math.abs(tx.amount);
		}

		return {
			count: txs.length,
			total: income - expenses,
			income,
			expenses,
			avgTransaction: (income + expenses) / txs.length,
		};
	});

	// Category breakdown for preview
	const categoryBreakdown = $derived.by(() => {
		const txs = filteredTransactions;
		const breakdown = new Map<string, { name: string; amount: number; count: number }>();

		for (const tx of txs) {
			const catName = tx.category?.name ?? 'Uncategorized';
			const existing = breakdown.get(catName) ?? { name: catName, amount: 0, count: 0 };
			existing.amount += Math.abs(tx.amount);
			existing.count += 1;
			breakdown.set(catName, existing);
		}

		return Array.from(breakdown.values())
			.sort((a, b) => b.amount - a.amount)
			.slice(0, 10); // Top 10
	});

	// Monthly trend data for chart
	const monthlyTrendData = $derived.by(() => {
		// Group transactions by month
		const monthlyTotals = new Map<string, number>();

		for (const tx of filteredTransactions) {
			const month = tx.date.slice(0, 7); // YYYY-MM
			const current = monthlyTotals.get(month) ?? 0;
			monthlyTotals.set(month, current + Math.abs(tx.amount));
		}

		// Convert to array and sort by date
		return Array.from(monthlyTotals.entries())
			.sort((a, b) => a[0].localeCompare(b[0]))
			.map(([month, amount]) => {
				const [year, monthNum] = month.split('-');
				const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
				const monthLabel = date.toLocaleString('default', { month: 'short', year: '2-digit' });
				return {
					month,
					monthLabel,
					amount,
					x: date,
					y: amount,
				};
			});
	});

	// Category chart data (for horizontal bar chart)
	const categoryChartData = $derived.by(() => {
		const maxAmount = Math.max(...categoryBreakdown.map((c) => c.amount), 1);
		return categoryBreakdown.map((cat, index) => ({
			name: cat.name,
			amount: cat.amount,
			percentage: stats.expenses > 0 ? (cat.amount / stats.expenses) * 100 : 0,
			x: cat.amount,
			y: index,
			// Normalize for chart
			normalizedAmount: cat.amount / maxAmount,
		}));
	});

	// Reset form when opened
	$effect(() => {
		if (open) {
			config = { ...DEFAULT_REPORT_CONFIG };
			selectedTemplateId = null;
			selectedTemplateType = 'spending_summary';
			saveTemplateName = '';
			saveTemplateDescription = '';
		}
	});

	// Get template name safely
	function getTemplateName(type: ReportTemplateType): string {
		if (type === 'custom') return 'Custom';
		return PREDEFINED_TEMPLATES[type]?.name ?? 'Custom';
	}

	// Apply predefined template config
	function applyTemplateType(type: ReportTemplateType) {
		selectedTemplateType = type;
		if (type !== 'custom') {
			const template = PREDEFINED_TEMPLATES[type];
			if (template) {
				config = {
					...DEFAULT_REPORT_CONFIG,
					...template.config,
					sections: { ...DEFAULT_REPORT_CONFIG.sections, ...template.config.sections },
					charts: { ...DEFAULT_REPORT_CONFIG.charts, ...template.config.charts },
					display: { ...DEFAULT_REPORT_CONFIG.display, ...template.config.display },
				} as ReportConfig;
			}
		}
	}

	// Load saved template
	function loadSavedTemplate(templateId: number) {
		const template = templatesQuery?.data?.find((t) => t.id === templateId);
		if (template) {
			selectedTemplateId = templateId;
			config = template.config;
			// Record usage
			usageMutation?.mutateAsync({ id: templateId }).catch(() => {});
		}
	}

	// Generate report date range string
	function getDateRangeString(): string {
		const points = chartSelection.selectedPoints;
		if (points.length === 0) return '';
		if (points.length === 1) return points[0].label;
		const sorted = [...points].sort((a, b) => a.id.localeCompare(b.id));
		return `${sorted[0].label} - ${sorted[sorted.length - 1].label}`;
	}

	// Get report title
	function getReportTitle(): string {
		return config.branding?.title || `${getTemplateName(selectedTemplateType)} Report`;
	}

	// Get report filename
	function getFilename(): string {
		const title = getReportTitle().toLowerCase().replace(/\s+/g, '-');
		const dateRange = getDateRangeString().replace(/\s+/g, '-');
		return `${title}-${dateRange}`;
	}

	// Export handlers
	async function handleExportPdf() {
		const previewEl = document.getElementById('report-preview-content');
		if (!previewEl) {
			toast.error('Preview not available');
			return;
		}

		isGenerating = true;
		try {
			await generatePdf(previewEl, {
				filename: getFilename(),
				format: 'a4',
				orientation: 'portrait',
			});
			toast.success('PDF downloaded');
		} catch (error) {
			toast.error('Failed to generate PDF', {
				description: error instanceof Error ? error.message : 'Unknown error',
			});
		} finally {
			isGenerating = false;
		}
	}

	function handleExportHtml() {
		const previewEl = document.getElementById('report-preview-content');
		if (!previewEl) {
			toast.error('Preview not available');
			return;
		}

		try {
			downloadHtml(previewEl, getFilename(), getReportTitle());
			toast.success('HTML downloaded');
		} catch {
			toast.error('Failed to export HTML');
		}
	}

	function handleExportMarkdown() {
		// Generate markdown content from data
		const md = generateMarkdownReport();
		downloadMarkdown(md, getFilename());
		toast.success('Markdown downloaded');
	}

	function generateMarkdownReport(): string {
		let md = `# ${getReportTitle()}\n\n`;
		md += `**Date Range:** ${getDateRangeString()}\n\n`;

		if (config.sections.summaryStats) {
			md += `## Summary\n\n`;
			md += `| Metric | Value |\n|--------|-------|\n`;
			md += `| Total Transactions | ${stats.count} |\n`;
			md += `| Total Income | ${currencyFormatter.format(stats.income)} |\n`;
			md += `| Total Expenses | ${currencyFormatter.format(stats.expenses)} |\n`;
			md += `| Net Change | ${currencyFormatter.format(stats.total)} |\n\n`;
		}

		if (config.sections.categoryBreakdown && categoryBreakdown.length > 0) {
			md += `## Category Breakdown\n\n`;
			md += `| Category | Amount | Transactions |\n|----------|--------|-------------|\n`;
			for (const cat of categoryBreakdown) {
				md += `| ${cat.name} | ${currencyFormatter.format(cat.amount)} | ${cat.count} |\n`;
			}
			md += '\n';
		}

		if (config.branding?.notes) {
			md += `## Notes\n\n${config.branding.notes}\n`;
		}

		return md;
	}

	// Save template
	async function handleSaveTemplate() {
		if (!createMutation) return;
		if (!saveTemplateName.trim()) {
			toast.error('Please enter a template name');
			return;
		}

		isSaving = true;
		try {
			await createMutation.mutateAsync({
				name: saveTemplateName.trim(),
				description: saveTemplateDescription.trim() || undefined,
				templateType: selectedTemplateType,
				config,
			});
			toast.success('Template saved');
			saveTemplateName = '';
			saveTemplateDescription = '';
		} catch {
			toast.error('Failed to save template');
		} finally {
			isSaving = false;
		}
	}

	function handleClose() {
		open = false;
		onOpenChange?.(false);
	}
</script>

<ResponsiveSheet bind:open {onOpenChange} side="right" defaultWidth={900} minWidth={600} maxWidth={1200}>
	{#snippet header()}
		<Sheet.Title class="flex items-center gap-2">
			<FileText class="h-5 w-5" />
			Build Report
		</Sheet.Title>
		<Sheet.Description>
			Create a custom report from {chartSelection.count} selected month{chartSelection.count !== 1 ? 's' : ''}
		</Sheet.Description>
	{/snippet}

	{#snippet content()}
		<div class="flex h-full gap-4">
			<!-- Left: Configuration -->
			<div class="w-1/3 min-w-[280px] space-y-4 overflow-auto pr-2">
				<!-- Template selector -->
				<div class="space-y-2">
					<Label>Template</Label>
					<Select.Root
						type="single"
						value={selectedTemplateType}
						onValueChange={(v) => {
							if (v) applyTemplateType(v as ReportTemplateType);
						}}
					>
						<Select.Trigger class="w-full">
							{getTemplateName(selectedTemplateType)}
						</Select.Trigger>
						<Select.Content>
							<Select.Group>
								<Select.GroupHeading>Predefined Templates</Select.GroupHeading>
								{#each Object.entries(PREDEFINED_TEMPLATES) as [key, template]}
									<Select.Item value={key}>
										<div class="flex flex-col">
											<span>{template.name}</span>
											<span class="text-xs text-muted-foreground">{template.description}</span>
										</div>
									</Select.Item>
								{/each}
								<Select.Item value="custom">Custom</Select.Item>
							</Select.Group>
						</Select.Content>
					</Select.Root>
				</div>

				<!-- Saved templates -->
				{#if templatesQuery?.data && templatesQuery.data.length > 0}
					<div class="space-y-2">
						<Label>Saved Templates</Label>
						<Select.Root
							type="single"
							value={selectedTemplateId ? String(selectedTemplateId) : undefined}
							onValueChange={(v) => {
								if (v) loadSavedTemplate(Number(v));
							}}
						>
							<Select.Trigger class="w-full">
								{templatesQuery.data.find((t) => t.id === selectedTemplateId)?.name ?? 'Select saved template...'}
							</Select.Trigger>
							<Select.Content>
								{#each templatesQuery.data as template}
									<Select.Item value={String(template.id)}>
										{template.name}
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				{/if}

				<Separator />

				<!-- Configuration sections -->
				<div class="space-y-2">
					<!-- Sections -->
					<Collapsible.Root bind:open={sectionsOpen}>
						<Collapsible.Trigger class="flex w-full items-center justify-between border p-3 hover:bg-muted/50 {sectionsOpen ? 'rounded-t-lg border-b-0' : 'rounded-lg'}">
							<div class="flex items-center gap-2">
								<Settings class="h-4 w-4" />
								<span class="font-medium">Sections</span>
							</div>
							<span class="transition-transform" class:rotate-180={sectionsOpen}>
								<ChevronDown class="h-4 w-4" />
							</span>
						</Collapsible.Trigger>
						<Collapsible.Content>
							<div class="space-y-3 border-x border-b rounded-b-lg p-3">
								<div class="flex items-center justify-between">
									<Label for="summaryStats" class="cursor-pointer">Summary Stats</Label>
									<Switch id="summaryStats" bind:checked={config.sections.summaryStats} />
								</div>
								<div class="flex items-center justify-between">
									<Label for="categoryBreakdown" class="cursor-pointer">Category Breakdown</Label>
									<Switch id="categoryBreakdown" bind:checked={config.sections.categoryBreakdown} />
								</div>
								<div class="flex items-center justify-between">
									<Label for="monthlyTrend" class="cursor-pointer">Monthly Trend</Label>
									<Switch id="monthlyTrend" bind:checked={config.sections.monthlyTrend} />
								</div>
								<div class="flex items-center justify-between">
									<Label for="transactionDetails" class="cursor-pointer">Transaction Details</Label>
									<Switch id="transactionDetails" bind:checked={config.sections.transactionDetails} />
								</div>
								<div class="flex items-center justify-between">
									<Label for="budgetComparison" class="cursor-pointer">Budget Comparison</Label>
									<Switch id="budgetComparison" bind:checked={config.sections.budgetComparison} />
								</div>
								<div class="flex items-center justify-between">
									<Label for="annotations" class="cursor-pointer">Annotations</Label>
									<Switch id="annotations" bind:checked={config.sections.annotations} />
								</div>
							</div>
						</Collapsible.Content>
					</Collapsible.Root>

					<!-- Charts -->
					<Collapsible.Root bind:open={chartsOpen}>
						<Collapsible.Trigger class="flex w-full items-center justify-between border p-3 hover:bg-muted/50 {chartsOpen ? 'rounded-t-lg border-b-0' : 'rounded-lg'}">
							<div class="flex items-center gap-2">
								<PieChart class="h-4 w-4" />
								<span class="font-medium">Charts</span>
							</div>
							<span class="transition-transform" class:rotate-180={chartsOpen}>
								<ChevronDown class="h-4 w-4" />
							</span>
						</Collapsible.Trigger>
						<Collapsible.Content>
							<div class="space-y-3 border-x border-b rounded-b-lg p-3">
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-2">
										<PieChart class="h-4 w-4 text-muted-foreground" />
										<Label for="pieChart" class="cursor-pointer">Pie Chart</Label>
									</div>
									<Switch id="pieChart" bind:checked={config.charts.pieChart} />
								</div>
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-2">
										<BarChart3 class="h-4 w-4 text-muted-foreground" />
										<Label for="barChart" class="cursor-pointer">Bar Chart</Label>
									</div>
									<Switch id="barChart" bind:checked={config.charts.barChart} />
								</div>
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-2">
										<LineChart class="h-4 w-4 text-muted-foreground" />
										<Label for="lineChart" class="cursor-pointer">Line Chart</Label>
									</div>
									<Switch id="lineChart" bind:checked={config.charts.lineChart} />
								</div>
							</div>
						</Collapsible.Content>
					</Collapsible.Root>

					<!-- Display Options -->
					<Collapsible.Root bind:open={displayOpen}>
						<Collapsible.Trigger class="flex w-full items-center justify-between border p-3 hover:bg-muted/50 {displayOpen ? 'rounded-t-lg border-b-0' : 'rounded-lg'}">
							<div class="flex items-center gap-2">
								<Eye class="h-4 w-4" />
								<span class="font-medium">Display</span>
							</div>
							<span class="transition-transform" class:rotate-180={displayOpen}>
								<ChevronDown class="h-4 w-4" />
							</span>
						</Collapsible.Trigger>
						<Collapsible.Content>
							<div class="space-y-3 border-x border-b rounded-b-lg p-3">
								<div class="flex items-center justify-between">
									<Label for="showCurrency" class="cursor-pointer">Show Currency</Label>
									<Switch id="showCurrency" bind:checked={config.display.showCurrency} />
								</div>
								<div class="flex items-center justify-between">
									<Label for="showPercentages" class="cursor-pointer">Show Percentages</Label>
									<Switch id="showPercentages" bind:checked={config.display.showPercentages} />
								</div>
								<div class="flex items-center justify-between">
									<Label for="groupByCategory" class="cursor-pointer">Group by Category</Label>
									<Switch id="groupByCategory" bind:checked={config.display.groupByCategory} />
								</div>
								<div class="space-y-1.5">
									<Label for="sortBy">Sort By</Label>
									<Select.Root
										type="single"
										value={config.display.sortBy}
										onValueChange={(v) => {
											if (v) config.display.sortBy = v as 'amount' | 'date' | 'category';
										}}
									>
										<Select.Trigger class="w-full">
											{config.display.sortBy === 'amount'
												? 'Amount'
												: config.display.sortBy === 'date'
													? 'Date'
													: 'Category'}
										</Select.Trigger>
										<Select.Content>
											<Select.Item value="amount">Amount</Select.Item>
											<Select.Item value="date">Date</Select.Item>
											<Select.Item value="category">Category</Select.Item>
										</Select.Content>
									</Select.Root>
								</div>
							</div>
						</Collapsible.Content>
					</Collapsible.Root>

					<!-- Branding -->
					<Collapsible.Root bind:open={brandingOpen}>
						<Collapsible.Trigger class="flex w-full items-center justify-between border p-3 hover:bg-muted/50 {brandingOpen ? 'rounded-t-lg border-b-0' : 'rounded-lg'}">
							<div class="flex items-center gap-2">
								<FileText class="h-4 w-4" />
								<span class="font-medium">Branding</span>
							</div>
							<span class="transition-transform" class:rotate-180={brandingOpen}>
								<ChevronDown class="h-4 w-4" />
							</span>
						</Collapsible.Trigger>
						<Collapsible.Content>
							<div class="space-y-3 border-x border-b rounded-b-lg p-3">
								<div class="space-y-1.5">
									<Label for="reportTitle">Title</Label>
									<Input
										id="reportTitle"
										placeholder="Report title..."
										value={config.branding?.title ?? ''}
										oninput={(e) => {
											config.branding = { ...config.branding, title: e.currentTarget.value };
										}}
									/>
								</div>
								<div class="space-y-1.5">
									<Label for="reportSubtitle">Subtitle</Label>
									<Input
										id="reportSubtitle"
										placeholder="Subtitle..."
										value={config.branding?.subtitle ?? ''}
										oninput={(e) => {
											config.branding = { ...config.branding, subtitle: e.currentTarget.value };
										}}
									/>
								</div>
								<div class="space-y-1.5">
									<Label for="reportNotes">Notes</Label>
									<Textarea
										id="reportNotes"
										placeholder="Additional notes..."
										rows={3}
										value={config.branding?.notes ?? ''}
										oninput={(e) => {
											config.branding = { ...config.branding, notes: e.currentTarget.value };
										}}
									/>
								</div>
							</div>
						</Collapsible.Content>
					</Collapsible.Root>
				</div>

				<Separator />

				<!-- Save Template -->
				<div class="space-y-3">
					<Label class="text-muted-foreground">Save as Template</Label>
					<Input placeholder="Template name..." bind:value={saveTemplateName} />
					<Input placeholder="Description (optional)" bind:value={saveTemplateDescription} />
					<Button
						variant="outline"
						class="w-full gap-2"
						onclick={handleSaveTemplate}
						disabled={isSaving || !saveTemplateName.trim()}
					>
						{#if isSaving}
							<Loader2 class="h-4 w-4 animate-spin" />
						{:else}
							<Save class="h-4 w-4" />
						{/if}
						Save Template
					</Button>
				</div>
			</div>

			<!-- Right: Preview -->
			<div class="flex-1 overflow-hidden rounded-lg border bg-white">
				<div class="border-b bg-muted/50 px-4 py-2">
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium">Preview</span>
						<Badge variant="secondary">{getDateRangeString()}</Badge>
					</div>
				</div>
				<ScrollArea class="h-[calc(100%-40px)]">
					<div id="report-preview-content" class="p-6 text-sm" style="background: white; color: #1a1a1a;">
						<!-- Report Header -->
						<div class="mb-6">
							<h1 class="text-2xl font-bold">{getReportTitle()}</h1>
							{#if config.branding?.subtitle}
								<p style="color: #666;">{config.branding.subtitle}</p>
							{/if}
							<p class="mt-1 text-sm" style="color: #666;">{getDateRangeString()}</p>
						</div>

						<!-- Summary Stats -->
						{#if config.sections.summaryStats}
							<div class="mb-6">
								<h2 class="mb-3 text-lg font-semibold">Summary</h2>
								<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
									<div class="rounded-lg p-3" style="background-color: #f5f5f5;">
										<p class="text-xs" style="color: #666;">Transactions</p>
										<p class="text-xl font-bold">{stats.count}</p>
									</div>
									<div class="rounded-lg p-3" style="background-color: #f5f5f5;">
										<p class="text-xs" style="color: #666;">Income</p>
										<p class="text-xl font-bold" style="color: #16a34a;">
											{currencyFormatter.format(stats.income)}
										</p>
									</div>
									<div class="rounded-lg p-3" style="background-color: #f5f5f5;">
										<p class="text-xs" style="color: #666;">Expenses</p>
										<p class="text-xl font-bold" style="color: #dc2626;">
											{currencyFormatter.format(stats.expenses)}
										</p>
									</div>
									<div class="rounded-lg p-3" style="background-color: #f5f5f5;">
										<p class="text-xs" style="color: #666;">Net Change</p>
										<p class="text-xl font-bold" style="color: {stats.total >= 0 ? '#16a34a' : '#dc2626'};">
											{currencyFormatter.format(stats.total)}
										</p>
									</div>
								</div>
							</div>
						{/if}

						<!-- Category Breakdown -->
						{#if config.sections.categoryBreakdown && categoryBreakdown.length > 0}
							<div class="mb-6">
								<h2 class="mb-3 text-lg font-semibold">Category Breakdown</h2>

								<!-- Visual bar chart for categories -->
								{#if config.charts.pieChart || config.charts.barChart}
									<div class="mb-4 space-y-2">
										{#each categoryChartData as cat, index}
											{@const color = CHART_COLORS[index % CHART_COLORS.length]}
											<div class="flex items-center gap-3">
												<div class="w-24 truncate text-sm">{cat.name}</div>
												<div class="flex-1 h-5 rounded overflow-hidden" style="background-color: #f0f0f0;">
													<div
														class="h-full rounded"
														style="width: {cat.normalizedAmount * 100}%; background-color: {color};"
													></div>
												</div>
												<div class="w-20 text-right text-sm font-medium">
													{currencyFormatter.format(cat.amount)}
												</div>
												{#if config.display.showPercentages}
													<div class="w-12 text-right text-xs" style="color: #666;">
														{cat.percentage.toFixed(0)}%
													</div>
												{/if}
											</div>
										{/each}
									</div>
								{/if}

								<!-- Table view -->
								<table class="w-full">
									<thead>
										<tr style="border-bottom: 1px solid #e5e5e5;">
											<th class="pb-2 text-left font-medium">Category</th>
											<th class="pb-2 text-right font-medium">Amount</th>
											{#if config.display.showPercentages}
												<th class="pb-2 text-right font-medium">%</th>
											{/if}
											<th class="pb-2 text-right font-medium">Count</th>
										</tr>
									</thead>
									<tbody>
										{#each categoryBreakdown as cat}
											{@const percentage = stats.expenses > 0 ? (cat.amount / stats.expenses) * 100 : 0}
											<tr style="border-bottom: 1px solid #f0f0f0;">
												<td class="py-2">{cat.name}</td>
												<td class="py-2 text-right font-medium">
													{currencyFormatter.format(cat.amount)}
												</td>
												{#if config.display.showPercentages}
													<td class="py-2 text-right" style="color: #666;">
														{percentage.toFixed(1)}%
													</td>
												{/if}
												<td class="py-2 text-right" style="color: #666;">{cat.count}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{/if}

						<!-- Monthly Trend Chart -->
						{#if config.sections.monthlyTrend && monthlyTrendData.length > 0}
							<div class="mb-6">
								<h2 class="mb-3 text-lg font-semibold">Monthly Trend</h2>
								<div class="h-50 w-full">
									<LayerCake
										data={monthlyTrendData}
										x="x"
										y="y"
										yDomain={[0, null]}
										padding={{ top: 10, right: 15, bottom: 30, left: 60 }}
									>
										<Svg>
											<AxisY ticks={4} gridlines={true} format={(d) => currencyFormatter.format(d)} />
											<AxisX
												ticks={Math.min(monthlyTrendData.length, 6)}
												format={(d) => {
													const date = d instanceof Date ? d : new Date(d);
													return date.toLocaleString('default', { month: 'short', year: '2-digit' });
												}}
											/>
											{#if config.charts.barChart}
												<Bar fill={PRIMARY_CHART_COLOR} opacity={0.85} />
											{/if}
											{#if config.charts.lineChart}
												{#if !config.charts.barChart}
													<Area fill={PRIMARY_CHART_COLOR} opacity={0.1} />
												{/if}
												<Line stroke={PRIMARY_CHART_COLOR} strokeWidth={2} />
											{/if}
										</Svg>
									</LayerCake>
								</div>
							</div>
						{:else if config.sections.monthlyTrend}
							<div class="mb-6">
								<h2 class="mb-3 text-lg font-semibold">Monthly Trend</h2>
								<div class="flex items-center justify-center rounded-lg p-8" style="border: 1px dashed #ccc; color: #666;">
									<p class="text-sm">No data available for selected months</p>
								</div>
							</div>
						{/if}

						<!-- Notes -->
						{#if config.branding?.notes}
							<div class="mb-6">
								<h2 class="mb-3 text-lg font-semibold">Notes</h2>
								<p class="whitespace-pre-wrap" style="color: #666;">{config.branding.notes}</p>
							</div>
						{/if}

						<!-- Footer -->
						<div class="mt-8 pt-4 text-center text-xs" style="border-top: 1px solid #e5e5e5; color: #666;">
							<p>Generated on {new Date().toLocaleDateString()}</p>
						</div>
					</div>
				</ScrollArea>
			</div>
		</div>
	{/snippet}

	{#snippet footer()}
		<div class="flex items-center justify-between gap-2">
			<Button variant="outline" onclick={handleClose}>Cancel</Button>
			<div class="flex gap-2">
				<Button variant="outline" onclick={handleExportMarkdown} class="gap-2">
					<FileType class="h-4 w-4" />
					Markdown
				</Button>
				<Button variant="outline" onclick={handleExportHtml} class="gap-2">
					<FileCode class="h-4 w-4" />
					HTML
				</Button>
				<Button onclick={handleExportPdf} disabled={isGenerating} class="gap-2">
					{#if isGenerating}
						<Loader2 class="h-4 w-4 animate-spin" />
						Generating...
					{:else}
						<FileDown class="h-4 w-4" />
						Download PDF
					{/if}
				</Button>
			</div>
		</div>
	{/snippet}
</ResponsiveSheet>
