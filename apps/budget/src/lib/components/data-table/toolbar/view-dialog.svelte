<script lang="ts">
import * as Dialog from '$lib/components/ui/dialog';
import { Button } from '$lib/components/ui/button';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import { Textarea } from '$lib/components/ui/textarea';
import type { View } from '$lib/schema/views';
import type { ViewDisplayState, ViewFilter, TableEntityType } from '$lib/types';
import { saveView } from '$lib/query/views';
import LoaderCircle from '@lucide/svelte/icons/loader-circle';

interface Props {
	/** Whether the dialog is open */
	open?: boolean;
	/** The view being edited (undefined for new view) */
	view?: View;
	/** Entity type for the view */
	entityType: TableEntityType;
	/** Current filters to save with the view */
	filters?: ViewFilter[];
	/** Current display state to save with the view */
	display?: ViewDisplayState;
	/** Handler for when dialog is closed */
	onOpenChange?: (open: boolean) => void;
	/** Handler for successful save */
	onSave?: (view: View) => void;
}

let {
	open = $bindable(false),
	view,
	entityType,
	filters = [],
	display,
	onOpenChange,
	onSave,
}: Props = $props();

const isUpdate = $derived(view !== undefined && view.id !== undefined);
const mutation = saveView.options();

// Form state
let name = $state(view?.name ?? '');
let description = $state(view?.description ?? '');

// Reset form when view changes
$effect(() => {
	if (view) {
		name = view.name ?? '';
		description = view.description ?? '';
	} else {
		name = '';
		description = '';
	}
});

async function handleSave() {
	if (!name.trim()) {
		return;
	}

	try {
		const viewData = {
			...(view?.id ? { id: view.id } : {}),
			entityType,
			name: name.trim(),
			description: description.trim() || null,
			filters: filters.length > 0 ? filters : null,
			display: display ?? null,
			dirty: false,
		};

		const result = await mutation.mutateAsync(viewData);
		open = false;
		onSave?.(result);
	} catch (error) {
		// Mutation handles error display
		console.error('Failed to save view:', error);
	}
}

function handleCancel() {
	open = false;
	// Reset form
	name = view?.name ?? '';
	description = view?.description ?? '';
}

function handleOpenChange(newOpen: boolean) {
	open = newOpen;
	onOpenChange?.(newOpen);
	if (!newOpen) {
		// Reset form when dialog closes
		name = view?.name ?? '';
		description = view?.description ?? '';
	}
}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-[500px]">
		<Dialog.Header>
			<Dialog.Title>{isUpdate ? 'Edit View' : 'Create New View'}</Dialog.Title>
			<Dialog.Description>
				{isUpdate
					? 'Update the view name and description. The current table state will be saved.'
					: 'Create a new view with the current table state, filters, and display settings.'}
			</Dialog.Description>
		</Dialog.Header>

		<div class="grid gap-4 py-4">
			<div class="grid gap-2">
				<Label for="view-name">Name</Label>
				<Input
					id="view-name"
					bind:value={name}
					placeholder="Enter view name"
					disabled={mutation.isPending}
				/>
			</div>

			<div class="grid gap-2">
				<Label for="view-description">Description (optional)</Label>
				<Textarea
					id="view-description"
					bind:value={description}
					placeholder="Enter view description"
					rows={3}
					disabled={mutation.isPending}
				/>
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={handleCancel} disabled={mutation.isPending}>
				Cancel
			</Button>
			<Button onclick={handleSave} disabled={!name.trim() || mutation.isPending}>
				{#if mutation.isPending}
					<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				{isUpdate ? 'Update View' : 'Create View'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
