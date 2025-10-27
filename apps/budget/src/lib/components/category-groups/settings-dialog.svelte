<script lang="ts">
	import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
	import * as Sheet from '$lib/components/ui/sheet';
	import {Button} from '$lib/components/ui/button';
	import {Label} from '$lib/components/ui/label';
	import {Switch} from '$lib/components/ui/switch';
	import {Slider} from '$lib/components/ui/slider';
	import {Settings, LoaderCircle} from '@lucide/svelte/icons';
	import {getCategoryGroupSettings, updateCategoryGroupSettings} from '$lib/query/category-groups';

	interface Props {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}

	let {open = $bindable(false), onOpenChange}: Props = $props();

	const settingsQuery = getCategoryGroupSettings().options();
	const updateMutation = updateCategoryGroupSettings.options();

	const settings = $derived(settingsQuery.data);
	const isLoading = $derived(settingsQuery.isLoading);
	const isSaving = $derived(updateMutation.isPending);

	// Local state for form values
	let recommendationsEnabled = $state(true);
	let minConfidenceScore = $state(0.7); // Slider expects array

	// Sync with query data when it changes
	$effect(() => {
		if (settings) {
			recommendationsEnabled = settings.recommendationsEnabled;
			minConfidenceScore = settings.minConfidenceScore;
		}
	});

	function handleSave() {
		updateMutation.mutate(
			{
				recommendationsEnabled,
				minConfidenceScore,
			},
			{
				onSuccess: () => {
					open = false;
				},
			}
		);
	}

	function handleCancel() {
		// Reset to original values
		if (settings) {
			recommendationsEnabled = settings.recommendationsEnabled;
			minConfidenceScore = settings.minConfidenceScore;
		}
		open = false;
	}

	// Format confidence score for display
	const confidenceLabel = $derived(`${Math.round(minConfidenceScore * 100)}%`);
</script>

<ResponsiveSheet bind:open>
	{#snippet header()}
		<div class="flex items-center gap-2">
			<Settings class="h-5 w-5 text-primary" />
			<Sheet.Title>Category Group Settings</Sheet.Title>
		</div>
		<Sheet.Description>
			Configure how category group recommendations work
		</Sheet.Description>
	{/snippet}

	{#snippet content()}
		{#if isLoading}
			<div class="flex items-center justify-center py-12">
				<LoaderCircle class="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		{:else}
			<div class="space-y-6 py-4">
				<!-- Enable/Disable Recommendations -->
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<div class="space-y-0.5">
							<Label for="recommendations-enabled" class="text-base">
								Enable Recommendations
							</Label>
							<p class="text-sm text-muted-foreground">
								Automatically generate grouping suggestions for uncategorized items
							</p>
						</div>
						<Switch
							id="recommendations-enabled"
							bind:checked={recommendationsEnabled}
							disabled={isSaving}
						/>
					</div>
				</div>

				<!-- Min Confidence Score Slider -->
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<Label for="min-confidence" class="text-base">
							Minimum Confidence Score
						</Label>
						<span class="text-sm font-medium">{confidenceLabel}</span>
					</div>
					<p class="text-sm text-muted-foreground">
						Only show recommendations with confidence above this threshold
					</p>
					<Slider
            type="single"
						id="min-confidence"
						bind:value={minConfidenceScore}
						min={0}
						max={1}
						step={0.05}
						disabled={isSaving || !recommendationsEnabled}
						class="w-full"
					/>
					<div class="flex justify-between text-xs text-muted-foreground">
						<span>0%</span>
						<span>50%</span>
						<span>100%</span>
					</div>
				</div>

				<!-- Info Box -->
				<div class="rounded-lg bg-muted p-4 text-sm">
					<p class="font-medium mb-1">How recommendations work</p>
					<ul class="space-y-1 text-muted-foreground list-disc list-inside">
						<li>AI analyzes category names and patterns</li>
						<li>Suggests logical groupings based on similarity</li>
						<li>You manually approve, dismiss, or reject each suggestion</li>
						<li>Higher confidence scores indicate stronger matches</li>
					</ul>
				</div>
			</div>
		{/if}
	{/snippet}

	{#snippet footer()}
		<Button variant="outline" onclick={handleCancel} disabled={isSaving}>
			Cancel
		</Button>
		<Button onclick={handleSave} disabled={isSaving || isLoading}>
			{#if isSaving}
				<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
				Saving...
			{:else}
				Save Changes
			{/if}
		</Button>
	{/snippet}
</ResponsiveSheet>
