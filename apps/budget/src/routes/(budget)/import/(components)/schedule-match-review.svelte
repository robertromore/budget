<script lang="ts">
	import * as Badge from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Slider } from '$lib/components/ui/slider';
	import type { ScheduleMatch } from '$core/types/import';
	import { formatCurrency } from '$lib/utils/formatters';
	import CalendarClock from '@lucide/svelte/icons/calendar-clock';

	let {
		scheduleMatches,
		filteredScheduleMatches,
		groupedScheduleMatches,
		threshold = $bindable(0.75),
		onToggleMatch,
		onSelectAll,
		onDeselectAll,
		onBack,
		onNext,
	}: {
		scheduleMatches: ScheduleMatch[];
		filteredScheduleMatches: ScheduleMatch[];
		groupedScheduleMatches: Array<{
			scheduleId: number;
			scheduleName: string;
			matches: ScheduleMatch[];
			avgScore: number;
		}>;
		threshold: number;
		onToggleMatch: (rowIndex: number, selected: boolean) => void;
		onSelectAll: () => void;
		onDeselectAll: () => void;
		onBack: () => void;
		onNext: () => void;
	} = $props();

	function getConfidenceBadgeVariant(
		confidence: string
	): 'default' | 'secondary' | 'destructive' | 'outline' {
		switch (confidence) {
			case 'exact':
				return 'default';
			case 'high':
				return 'secondary';
			default:
				return 'outline';
		}
	}

	function getScoreBorderColor(score: number): string {
		if (score >= 0.9) return 'border-l-4 border-l-green-500';
		if (score >= 0.8) return 'border-l-4 border-l-green-400';
		if (score >= 0.75) return 'border-l-4 border-l-yellow-500';
		if (score >= 0.65) return 'border-l-4 border-l-orange-500';
		return 'border-l-4 border-l-red-500';
	}

	function getScoreAllBorderColor(score: number): string {
		if (score >= 0.9) return 'border-green-500 border-l-4';
		if (score >= 0.8) return 'border-green-400 border-l-4';
		if (score >= 0.75) return 'border-yellow-500 border-l-4';
		if (score >= 0.65) return 'border-orange-500 border-l-4';
		return 'border-red-500 border-l-4';
	}
</script>

<div class="space-y-6">
	<div>
		<div class="mb-2 flex items-center gap-3">
			<CalendarClock class="text-primary h-8 w-8" />
			<h2 class="text-2xl font-bold">Review Schedule Matches</h2>
		</div>
		<p class="text-muted-foreground mt-2">
			We found {scheduleMatches.length} transaction{scheduleMatches.length !== 1 ? 's' : ''}
			that match existing schedules. Select which ones you'd like to link.
		</p>
	</div>

	<!-- Match Threshold Slider -->
	<Card.Root>
		<Card.Header class="pb-4">
			<Card.Title class="text-base">Match Threshold</Card.Title>
			<Card.Description class="text-sm">
				Adjust to show matches above {Math.round(threshold * 100)}% confidence
				· Showing {filteredScheduleMatches.length} of {scheduleMatches.length} matches
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="space-y-4">
				<Slider
					type="single"
					bind:value={threshold}
					min={0.2}
					max={1.0}
					step={0.05}
					class="w-full" />
				<div class="text-muted-foreground flex justify-between text-xs">
					<span>20%</span>
					<span>40%</span>
					<span>60%</span>
					<span>80%</span>
					<span>100%</span>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
		{#each groupedScheduleMatches as group (group.scheduleId)}
			<Card.Root class="flex flex-col {getScoreBorderColor(group.avgScore)}">
				<Card.Header class="pb-3">
					<div class="flex items-start justify-between gap-2">
						<div class="flex min-w-0 items-start gap-2">
							<CalendarClock class="text-primary mt-0.5 h-5 w-5 shrink-0" />
							<div class="min-w-0">
								<Card.Title class="truncate text-base">{group.scheduleName}</Card.Title>
								<Card.Description class="text-xs">
									{group.matches.length} match{group.matches.length !== 1 ? 'es' : ''} · {Math.round(
										group.avgScore * 100
									)}% avg
								</Card.Description>
							</div>
						</div>
						<div class="flex shrink-0 flex-col gap-1">
							<Button
								variant="outline"
								size="sm"
								class="h-7 px-2 text-xs"
								onclick={() => {
									group.matches.forEach((match) => {
										onToggleMatch(match.rowIndex, true);
									});
								}}>
								All
							</Button>
							<Button
								variant="outline"
								size="sm"
								class="h-7 px-2 text-xs"
								onclick={() => {
									group.matches.forEach((match) => {
										onToggleMatch(match.rowIndex, false);
									});
								}}>
								None
							</Button>
						</div>
					</div>
				</Card.Header>
				<Card.Content>
					<div class="space-y-3">
						{#each group.matches as match (match.rowIndex)}
							<div
								class="flex cursor-pointer items-start gap-2 rounded-lg border p-2 transition-colors {getScoreAllBorderColor(
									match.score
								)}
                             {match.selected ? 'bg-primary/5' : 'bg-card hover:bg-accent/50'}"
								onclick={() => onToggleMatch(match.rowIndex, !match.selected)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										onToggleMatch(match.rowIndex, !match.selected);
									}
								}}
								role="button"
								tabindex="0"
								aria-pressed={match.selected}>
								<Checkbox
									checked={match.selected}
									onCheckedChange={(checked) =>
										onToggleMatch(match.rowIndex, checked === true)}
									class="mt-1" />
								<div class="min-w-0 flex-1">
									<div class="mb-2 flex items-center justify-between gap-2">
										<div class="truncate text-sm font-medium">
											{new Date(match.transactionData.date).toLocaleDateString()}
										</div>
										<Badge.Badge
											variant={getConfidenceBadgeVariant(match.confidence)}
											class="shrink-0">
											{Math.round(match.score * 100)}%
										</Badge.Badge>
									</div>
									<div class="space-y-1">
										<div class="flex items-center justify-between text-sm">
											<span class="text-muted-foreground text-xs">Transaction</span>
											<span class="font-mono font-medium"
												>{formatCurrency(Math.abs(match.transactionData.amount))}</span>
										</div>
										<div class="flex items-center justify-between text-sm">
											<span class="text-muted-foreground text-xs">Schedule</span>
											<span class="font-mono"
												>{formatCurrency(Math.abs(match.scheduleData.amount))}</span>
										</div>
									</div>
									{#if match.transactionData.payee}
										<div class="text-muted-foreground mt-2 truncate text-xs">
											{match.transactionData.payee}
										</div>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>

	<!-- Actions -->
	<div class="flex items-center justify-between">
		<Button variant="outline" onclick={onBack}>Back</Button>
		<Button onclick={onNext}>Continue to Entity Review</Button>
	</div>
</div>
