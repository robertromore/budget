<script lang="ts">
	import {Button} from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import {Badge} from '$lib/components/ui/badge';
	import {Check, X, Sparkles, CircleAlert, LoaderCircle, CheckCircle2, Users} from '@lucide/svelte/icons';
	import {
		approveRecommendation,
		dismissRecommendation,
		rejectRecommendation,
		generateRecommendations,
		listRecommendations,
	} from '$lib/query/category-groups';

	const recommendationsQuery = listRecommendations().options();
	const approveMutation = approveRecommendation.options();
	const dismissMutation = dismissRecommendation.options();
	const rejectMutation = rejectRecommendation.options();
	const generateMutation = generateRecommendations.options();

	const recommendations = $derived(recommendationsQuery.data ?? []);
	const isLoading = $derived(recommendationsQuery.isLoading);
	const isGenerating = $derived(generateMutation.isPending);

	// Group recommendations by suggested group
	const groupedRecommendations = $derived.by(() => {
		const groups = new Map<string, typeof recommendations>();

		for (const rec of recommendations) {
			const groupKey = rec.suggestedGroupName || `Group #${rec.suggestedGroupId}`;
			if (!groups.has(groupKey)) {
				groups.set(groupKey, []);
			}
			groups.get(groupKey)!.push(rec);
		}

		return Array.from(groups.entries()).map(([groupName, recs]) => ({
			groupName,
			recommendations: recs,
			isNewGroup: recs[0]?.suggestedGroupName !== null,
			avgConfidence: recs.reduce((sum, r) => sum + r.confidenceScore, 0) / recs.length,
		})).sort((a, b) => b.avgConfidence - a.avgConfidence);
	});

	function handleApprove(id: number) {
		approveMutation.mutate(id);
	}

	function handleDismiss(id: number) {
		dismissMutation.mutate(id);
	}

	function handleReject(id: number) {
		rejectMutation.mutate(id);
	}

	function handleApproveAll(recIds: number[]) {
		for (const id of recIds) {
			approveMutation.mutate(id);
		}
	}

	function handleRejectAll(recIds: number[]) {
		for (const id of recIds) {
			rejectMutation.mutate(id);
		}
	}

	function handleGenerate() {
		generateMutation.mutate();
	}

	function getConfidenceColor(score: number): string {
		if (score >= 0.9) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
		if (score >= 0.7) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
		if (score >= 0.5) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
		return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
	}

	function formatConfidence(score: number): string {
		return `${Math.round(score * 100)}%`;
	}
</script>

<Card.Root>
	<Card.Header>
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<Sparkles class="h-5 w-5 text-primary" />
				<Card.Title>Grouping Suggestions</Card.Title>
			</div>
			<Button onclick={handleGenerate} disabled={isGenerating} size="sm">
				{#if isGenerating}
					<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
					Generating...
				{:else}
					<Sparkles class="mr-2 h-4 w-4" />
					Generate
				{/if}
			</Button>
		</div>
		<Card.Description>
			Review and apply AI-powered suggestions for organizing your categories
		</Card.Description>
	</Card.Header>

	<Card.Content class="space-y-4">
		{#if isLoading}
			<div class="flex items-center justify-center py-8 text-muted-foreground">
				<LoaderCircle class="mr-2 h-5 w-5 animate-spin" />
				Loading recommendations...
			</div>
		{:else if recommendations.length === 0}
			<div class="flex flex-col items-center justify-center py-12 text-center">
				<CircleAlert class="h-12 w-12 text-muted-foreground/50 mb-4" />
				<p class="text-sm text-muted-foreground">No recommendations available</p>
				<p class="text-xs text-muted-foreground mt-1">
					Click "Generate" to create grouping suggestions
				</p>
			</div>
		{:else}
			{#each groupedRecommendations as group (group.groupName)}
				{@const isProcessing =
					approveMutation.isPending ||
					dismissMutation.isPending ||
					rejectMutation.isPending}

				<div class="rounded-lg border bg-card">
					<!-- Group Header -->
					<div class="border-b bg-muted/30 p-4">
						<div class="flex items-center justify-between gap-4">
							<div class="flex items-center gap-3">
								<div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
									<Users class="h-5 w-5 text-primary" />
								</div>
								<div>
									<div class="flex items-center gap-2">
										<h3 class="font-semibold text-base">{group.groupName}</h3>
										{#if group.isNewGroup}
											<Badge variant="outline" class="text-xs">
												New Group
											</Badge>
										{/if}
									</div>
									<div class="flex items-center gap-2 mt-1">
										<span class="text-xs text-muted-foreground">
											{group.recommendations.length} {group.recommendations.length === 1 ? 'category' : 'categories'}
										</span>
										<span class="text-xs text-muted-foreground">•</span>
										<Badge variant="secondary" class={`text-xs ${getConfidenceColor(group.avgConfidence)}`}>
											{formatConfidence(group.avgConfidence)} confidence
										</Badge>
									</div>
								</div>
							</div>

							<!-- Group Actions -->
							<div class="flex items-center gap-1">
								<Button
									size="sm"
									variant="default"
									class="h-8 text-xs"
									onclick={() => handleApproveAll(group.recommendations.map(r => r.id))}
									disabled={isProcessing}
								>
									<CheckCircle2 class="mr-1.5 h-3.5 w-3.5" />
									Approve All
								</Button>
								<Button
									size="sm"
									variant="ghost"
									class="h-8 text-xs text-muted-foreground"
									onclick={() => handleRejectAll(group.recommendations.map(r => r.id))}
									disabled={isProcessing}
								>
									<X class="mr-1.5 h-3.5 w-3.5" />
									Reject All
								</Button>
							</div>
						</div>
					</div>

					<!-- Category List -->
					<div class="divide-y">
						{#each group.recommendations as recommendation (recommendation.id)}
							<div class="p-3 hover:bg-muted/50 transition-colors">
								<div class="flex items-center justify-between gap-4">
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2 mb-1">
											<span class="font-medium text-sm truncate">
												{recommendation.categoryName || `Category #${recommendation.categoryId}`}
											</span>
											<Badge variant="outline" class={`text-xs ${getConfidenceColor(recommendation.confidenceScore)}`}>
												{formatConfidence(recommendation.confidenceScore)}
											</Badge>
										</div>
										{#if recommendation.reasoning}
											<p class="text-xs text-muted-foreground line-clamp-2">
												{recommendation.reasoning}
											</p>
										{/if}
									</div>

									<div class="flex items-center gap-1 flex-shrink-0">
										<Button
											size="icon"
											variant="ghost"
											class="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
											onclick={() => handleApprove(recommendation.id)}
											disabled={isProcessing}
											title="Approve"
										>
											<Check class="h-3.5 w-3.5" />
										</Button>
										<Button
											size="icon"
											variant="ghost"
											class="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
											onclick={() => handleReject(recommendation.id)}
											disabled={isProcessing}
											title="Reject"
										>
											<X class="h-3.5 w-3.5" />
										</Button>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		{/if}
	</Card.Content>
</Card.Root>
