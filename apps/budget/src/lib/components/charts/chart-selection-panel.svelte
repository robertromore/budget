<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { chartSelection, type ChartSelectionAction } from '$lib/states/ui/chart-selection.svelte';
	import { currencyFormatter } from '$lib/utils/formatters';
	import { toast } from '$lib/utils/toast-interceptor';

	// Action sheets
	import AnnotationSheet from './actions/annotation-sheet.svelte';
	import BudgetActionSheet from './actions/budget-action-sheet.svelte';
	import ComparisonSheet from './actions/comparison-sheet.svelte';
	import DrillDownSheet from './actions/drill-down-sheet.svelte';
	import ExportSheet from './actions/export-sheet.svelte';
	import ReportBuilderSheet from './actions/report-builder-sheet.svelte';
	import StatisticsSheet from './actions/statistics-sheet.svelte';
	import TrendAnalysisSheet from './actions/trend-analysis-sheet.svelte';
	import OutlierAnalysisSheet from './actions/outlier-analysis-sheet.svelte';
	import SeasonalAnalysisSheet from './actions/seasonal-analysis-sheet.svelte';

	// Icons
	import BarChart2 from '@lucide/svelte/icons/bar-chart-2';
	import Calculator from '@lucide/svelte/icons/calculator';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import Calendar from '@lucide/svelte/icons/calendar';
	import Target from '@lucide/svelte/icons/target';
	import Bell from '@lucide/svelte/icons/bell';
	import StickyNote from '@lucide/svelte/icons/sticky-note';
	import Flag from '@lucide/svelte/icons/flag';
	import FileSpreadsheet from '@lucide/svelte/icons/file-spreadsheet';
	import FileText from '@lucide/svelte/icons/file-text';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';

	interface ActionItem {
		id: ChartSelectionAction;
		label: string;
		icon: typeof BarChart2;
		description?: string;
	}

	// Sheet states
	let comparisonOpen = $state(false);
	let statisticsOpen = $state(false);
	let trendOpen = $state(false);
	let outlierOpen = $state(false);
	let seasonalOpen = $state(false);
	let exportOpen = $state(false);
	let drillDownOpen = $state(false);
	let budgetActionOpen = $state(false);
	let annotationOpen = $state(false);
	let annotationMode = $state<'note' | 'flag'>('note');
	let reportBuilderOpen = $state(false);

	// Action categories
	const analyzeActions: ActionItem[] = [
		{ id: 'compare', label: 'Compare Selected', icon: BarChart2, description: 'Side-by-side comparison' },
		{ id: 'average', label: 'Calculate Statistics', icon: Calculator, description: 'Average, median, std dev' },
		{ id: 'trend', label: 'Show Trend', icon: TrendingUp, description: 'Trend between points' },
		{ id: 'outliers', label: 'Identify Outliers', icon: AlertCircle, description: 'Find unusual values' },
		{ id: 'seasonal', label: 'Seasonal Patterns', icon: Calendar, description: 'Compare same months' }
	];

	const actionActions: ActionItem[] = [
		{ id: 'set-budget', label: 'Set as Budget Target', icon: Target, description: 'Use for budget planning' },
		{ id: 'create-alert', label: 'Create Alert', icon: Bell, description: 'Notify on thresholds' },
		{ id: 'add-note', label: 'Add Note', icon: StickyNote, description: 'Annotate selection' },
		{ id: 'flag-review', label: 'Flag for Review', icon: Flag, description: 'Add to review queue' }
	];

	const exportActions: ActionItem[] = [
		{ id: 'export-csv', label: 'Export to CSV', icon: FileSpreadsheet, description: 'Download as spreadsheet' },
		{ id: 'export-report', label: 'Build Report', icon: FileText, description: 'Custom report builder' },
		{ id: 'drill-down', label: 'Drill-Down View', icon: Search, description: 'View all transactions' }
	];

	function handleAction(actionId: ChartSelectionAction) {
		switch (actionId) {
			case 'compare':
				comparisonOpen = true;
				break;
			case 'average':
				statisticsOpen = true;
				break;
			case 'trend':
				trendOpen = true;
				break;
			case 'outliers':
				outlierOpen = true;
				break;
			case 'seasonal':
				seasonalOpen = true;
				break;
			case 'export-csv':
				exportOpen = true;
				break;
			case 'drill-down':
				drillDownOpen = true;
				break;
			case 'set-budget':
				budgetActionOpen = true;
				break;
			case 'add-note':
				annotationMode = 'note';
				annotationOpen = true;
				break;
			case 'flag-review':
				annotationMode = 'flag';
				annotationOpen = true;
				break;
			case 'export-report':
				reportBuilderOpen = true;
				break;
			case 'create-alert':
				// This feature will be implemented later
				toast.info('Coming soon', {
					description: 'This feature is under development'
				});
				break;
		}
	}

	// Keyboard shortcuts
	function handleKeydown(event: KeyboardEvent) {
		if (!chartSelection.isActive) return;

		if (event.key === 'Escape') {
			chartSelection.clear();
			event.preventDefault();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if chartSelection.isActive}
	<div
		class="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 animate-in fade-in-0 slide-in-from-bottom-4 duration-200"
		role="toolbar"
		aria-label="Chart selection actions"
	>
		<div
			class="flex items-center gap-1.5 rounded-lg border bg-background/95 px-3 py-2 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/80"
		>
			<!-- Selection count and summary -->
			<div class="flex items-center gap-2 border-r pr-3">
				<span class="text-sm font-medium tabular-nums">
					{chartSelection.count} month{chartSelection.count !== 1 ? 's' : ''}
				</span>
				<span class="text-xs text-muted-foreground">
					{currencyFormatter.format(chartSelection.totalValue)}
				</span>
			</div>

			<!-- Analyze dropdown -->
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="ghost" size="sm" class="gap-1">
							Analyze
							<ChevronDown class="h-3 w-3 opacity-50" />
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="start" class="w-56">
					<DropdownMenu.Group>
						<DropdownMenu.GroupHeading>Analysis Tools</DropdownMenu.GroupHeading>
						{#each analyzeActions as action}
							<DropdownMenu.Item onclick={() => handleAction(action.id)}>
								<action.icon class="mr-2 h-4 w-4" />
								<div class="flex flex-col">
									<span>{action.label}</span>
									{#if action.description}
										<span class="text-xs text-muted-foreground">{action.description}</span>
									{/if}
								</div>
							</DropdownMenu.Item>
						{/each}
					</DropdownMenu.Group>
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			<!-- Actions dropdown -->
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="ghost" size="sm" class="gap-1">
							Actions
							<ChevronDown class="h-3 w-3 opacity-50" />
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="center" class="w-56">
					<DropdownMenu.Group>
						<DropdownMenu.GroupHeading>Take Action</DropdownMenu.GroupHeading>
						{#each actionActions as action}
							<DropdownMenu.Item onclick={() => handleAction(action.id)}>
								<action.icon class="mr-2 h-4 w-4" />
								<div class="flex flex-col">
									<span>{action.label}</span>
									{#if action.description}
										<span class="text-xs text-muted-foreground">{action.description}</span>
									{/if}
								</div>
							</DropdownMenu.Item>
						{/each}
					</DropdownMenu.Group>
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			<!-- Export dropdown -->
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="ghost" size="sm" class="gap-1">
							Export
							<ChevronDown class="h-3 w-3 opacity-50" />
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end" class="w-56">
					<DropdownMenu.Group>
						<DropdownMenu.GroupHeading>Export Data</DropdownMenu.GroupHeading>
						{#each exportActions as action}
							<DropdownMenu.Item onclick={() => handleAction(action.id)}>
								<action.icon class="mr-2 h-4 w-4" />
								<div class="flex flex-col">
									<span>{action.label}</span>
									{#if action.description}
										<span class="text-xs text-muted-foreground">{action.description}</span>
									{/if}
								</div>
							</DropdownMenu.Item>
						{/each}
					</DropdownMenu.Group>
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			<!-- Clear button -->
			<div class="border-l pl-1.5">
				<Button
					variant="ghost"
					size="icon"
					class="h-7 w-7"
					onclick={() => chartSelection.clear()}
					title="Clear selection (Esc)"
				>
					<X class="h-4 w-4" />
				</Button>
			</div>
		</div>
	</div>
{/if}

<!-- Action sheets -->
<ComparisonSheet bind:open={comparisonOpen} />
<StatisticsSheet bind:open={statisticsOpen} />
<TrendAnalysisSheet bind:open={trendOpen} />
<OutlierAnalysisSheet bind:open={outlierOpen} />
<SeasonalAnalysisSheet bind:open={seasonalOpen} />
<ExportSheet bind:open={exportOpen} />
<DrillDownSheet bind:open={drillDownOpen} />
<BudgetActionSheet bind:open={budgetActionOpen} />
<AnnotationSheet bind:open={annotationOpen} mode={annotationMode} />
<ReportBuilderSheet bind:open={reportBuilderOpen} />
