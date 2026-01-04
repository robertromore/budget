<script lang="ts">
	import { browser } from '$app/environment';
	import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
	import * as Sheet from '$lib/components/ui/sheet';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Switch } from '$lib/components/ui/switch';
	import { Badge } from '$lib/components/ui/badge';
	import { chartSelection } from '$lib/states/ui/chart-selection.svelte';
	import { bulkCreateAnnotations, getAnnotationsByMonths } from '$lib/query/annotations';
	import { ANNOTATION_TAGS, type AnnotationTag } from '$lib/schema/month-annotations';
	import { toast } from 'svelte-sonner';

	// Icons
	import StickyNote from '@lucide/svelte/icons/sticky-note';
	import Flag from '@lucide/svelte/icons/flag';
	import Tag from '@lucide/svelte/icons/tag';
	import X from '@lucide/svelte/icons/x';

	interface Props {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		mode?: 'note' | 'flag';
	}

	let { open = $bindable(false), onOpenChange, mode = 'note' }: Props = $props();

	// Form state
	let note = $state('');
	let flaggedForReview = $state(false);
	let selectedTags = $state<string[]>([]);
	let isSubmitting = $state(false);

	// Get selected months from chart selection
	const selectedMonths = $derived(chartSelection.selectedPoints.map((p) => p.id));
	const accountId = $derived(chartSelection.selectedPoints[0]?.accountId);

	// Query existing annotations for selected months (only in browser)
	const existingAnnotationsQuery = $derived.by(() => {
		if (!browser) return null;
		if (selectedMonths.length === 0) return null;
		return getAnnotationsByMonths(selectedMonths, accountId).options();
	});

	// Create mutation (lazy - only used in browser)
	const createMutation = $derived(browser ? bulkCreateAnnotations.options() : null);

	// Reset form when opened
	$effect(() => {
		if (open) {
			note = '';
			flaggedForReview = mode === 'flag';
			selectedTags = [];

			// Pre-fill from existing annotation if only one month selected
			if (selectedMonths.length === 1 && existingAnnotationsQuery?.data?.[0]) {
				const existing = existingAnnotationsQuery.data[0];
				note = existing.note ?? '';
				flaggedForReview = existing.flaggedForReview ?? false;
				selectedTags = existing.tags ?? [];
			}
		}
	});

	function toggleTag(tag: string) {
		if (selectedTags.includes(tag)) {
			selectedTags = selectedTags.filter((t) => t !== tag);
		} else {
			selectedTags = [...selectedTags, tag];
		}
	}

	async function handleSubmit() {
		if (!createMutation) {
			toast.error('Unable to save - please try again');
			return;
		}

		if (selectedMonths.length === 0) {
			toast.error('No months selected');
			return;
		}

		// Validate that at least one field is filled
		if (!note?.trim() && !flaggedForReview && selectedTags.length === 0) {
			toast.error('Please add a note, flag, or tags');
			return;
		}

		isSubmitting = true;

		try {
			await createMutation.mutateAsync({
				months: selectedMonths,
				accountId: accountId,
				note: note?.trim() || null,
				flaggedForReview,
				tags: selectedTags
			});

			handleClose();
		} catch (error) {
			// Error is handled by mutation
		} finally {
			isSubmitting = false;
		}
	}

	function handleClose() {
		open = false;
		onOpenChange?.(false);
	}
</script>

<ResponsiveSheet bind:open {onOpenChange} defaultWidth={450}>
	{#snippet header()}
		<Sheet.Title class="flex items-center gap-2">
			{#if mode === 'flag'}
				<Flag class="h-5 w-5" />
				Flag for Review
			{:else}
				<StickyNote class="h-5 w-5" />
				Add Note
			{/if}
		</Sheet.Title>
		<Sheet.Description>
			{#if selectedMonths.length === 1}
				Annotate {chartSelection.selectedPoints[0]?.label ?? selectedMonths[0]}
			{:else}
				Annotate {selectedMonths.length} selected months
			{/if}
		</Sheet.Description>
	{/snippet}

	{#snippet content()}
		<div class="space-y-6">
			<!-- Existing annotations warning -->
			{#if existingAnnotationsQuery?.data && existingAnnotationsQuery.data.length > 0}
				<div class="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950">
					<p class="text-sm text-yellow-800 dark:text-yellow-200">
						{existingAnnotationsQuery.data.length === 1
							? 'An existing annotation will be updated.'
							: `${existingAnnotationsQuery.data.length} existing annotations will be updated.`}
					</p>
				</div>
			{/if}

			<!-- Note field -->
			<div class="space-y-2">
				<Label for="note">Note</Label>
				<Textarea
					id="note"
					bind:value={note}
					placeholder="Add a note about these months..."
					rows={4}
					maxlength={500}
				/>
				<p class="text-xs text-muted-foreground">{note.length}/500 characters</p>
			</div>

			<!-- Flag toggle -->
			<div class="flex items-center justify-between rounded-lg border p-4">
				<div class="flex items-center gap-3">
					<Flag class="h-5 w-5 text-muted-foreground" />
					<div>
						<p class="font-medium">Flag for Review</p>
						<p class="text-sm text-muted-foreground">Mark for follow-up later</p>
					</div>
				</div>
				<Switch bind:checked={flaggedForReview} />
			</div>

			<!-- Tags -->
			<div class="space-y-3">
				<div class="flex items-center gap-2">
					<Tag class="h-4 w-4 text-muted-foreground" />
					<Label>Tags</Label>
				</div>
				<div class="flex flex-wrap gap-2">
					{#each ANNOTATION_TAGS as tag}
						{@const isSelected = selectedTags.includes(tag)}
						<button
							type="button"
							onclick={() => toggleTag(tag)}
							class="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors {isSelected
								? 'border-primary bg-primary/10 text-primary'
								: 'border-border hover:border-primary/50 hover:bg-muted'}"
						>
							{tag}
							{#if isSelected}
								<X class="h-3 w-3" />
							{/if}
						</button>
					{/each}
				</div>
			</div>

			<!-- Selected months summary -->
			<div class="rounded-lg bg-muted/50 p-4">
				<p class="mb-2 text-sm font-medium">Selected Months</p>
				<div class="flex flex-wrap gap-1.5">
					{#each chartSelection.selectedPoints as point}
						<Badge variant="secondary" class="text-xs">{point.label}</Badge>
					{/each}
				</div>
			</div>
		</div>
	{/snippet}

	{#snippet footer()}
		<div class="flex justify-between gap-2">
			<Button variant="outline" onclick={handleClose}>Cancel</Button>
			<Button onclick={handleSubmit} disabled={isSubmitting}>
				{isSubmitting ? 'Saving...' : 'Save Annotation'}
			</Button>
		</div>
	{/snippet}
</ResponsiveSheet>
