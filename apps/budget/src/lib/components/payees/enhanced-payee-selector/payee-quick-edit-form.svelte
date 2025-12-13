<script lang="ts">
	import ManageCategoryForm from "$lib/components/forms/manage-category-form.svelte";
	import EntityInput from "$lib/components/input/entity-input.svelte";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Textarea } from "$lib/components/ui/textarea";
	import type { Payee } from "$lib/schema/payees";
	import { CategoriesState } from "$lib/states/entities/categories.svelte";
	import type { EditableEntityItem } from "$lib/types";
	import LoaderCircle from "@lucide/svelte/icons/loader-circle";
	import Tag from "@lucide/svelte/icons/tag";
	import type { QuickEditPayeeData } from "./types";

	interface Props {
		payee?: Payee | null;
		initialName?: string;
		onSave: (data: QuickEditPayeeData) => Promise<void>;
		onCancel: () => void;
	}

	let { payee = null, initialName = "", onSave, onCancel }: Props = $props();

	// Form state
	let name = $state("");
	let notes = $state("");
	let defaultCategoryId = $state<number | null>(null);
	let isSaving = $state(false);
	let error = $state<string | null>(null);

	// Sync form state when payee or initialName changes
	$effect(() => {
		name = payee?.name ?? initialName ?? "";
		notes = payee?.notes ?? "";
		defaultCategoryId = payee?.defaultCategoryId ?? null;
		error = null;
	});

	// Categories state
	const categoriesState = CategoriesState.get();
	const categories = $derived(
		categoriesState
			? (categoriesState.getActiveCategories() as EditableEntityItem[])
			: [],
	);
	const selectedCategory = $derived.by(() => {
		if (!defaultCategoryId) return undefined;
		return categories.find((c) => c.id === defaultCategoryId);
	});

	// Form validation
	const isValid = $derived(name.trim().length > 0);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!isValid || isSaving) return;

		error = null;
		isSaving = true;

		try {
			await onSave({
				name: name.trim(),
				defaultCategoryId,
				notes: notes.trim() || null,
			});
		} catch (err) {
			console.error("Failed to save payee:", err);
			error =
				err instanceof Error ? err.message : "Failed to save payee";
		} finally {
			isSaving = false;
		}
	}

	function handleCategorySelect(category?: EditableEntityItem) {
		defaultCategoryId = category?.id ?? null;
	}

	function handleCategorySave(cat: EditableEntityItem, isNew: boolean) {
		if (isNew && categoriesState) {
			categoriesState.addCategory(cat as any);
		} else if (categoriesState) {
			categoriesState.updateCategory(cat as any);
		}
		defaultCategoryId = cat.id;
	}

	function handleCategoryDelete(id: number) {
		if (categoriesState) {
			categoriesState.deleteCategory(id);
		}
		if (defaultCategoryId === id) {
			defaultCategoryId = null;
		}
	}
</script>

<form onsubmit={handleSubmit} class="flex h-full flex-col">
	<div class="flex-1 space-y-4 overflow-auto p-4">
		<!-- Name -->
		<div class="space-y-2">
			<Label for="payee-name">Name *</Label>
			<Input
				id="payee-name"
				bind:value={name}
				placeholder="Enter payee name"
				required
				autofocus
			/>
		</div>

		<!-- Default Category -->
		<div class="space-y-2">
			<Label>Default Category</Label>
			<EntityInput
				entityLabel="Category"
				entities={categories}
				{...(selectedCategory ? { value: selectedCategory } : {})}
				handleSubmit={handleCategorySelect}
				buttonClass="w-full"
				icon={Tag}
				management={{
					enable: true,
					component: ManageCategoryForm,
					onSave: handleCategorySave,
					onDelete: handleCategoryDelete,
				}}
			/>
			<p class="text-muted-foreground text-xs">
				Auto-applied to new transactions with this payee
			</p>
		</div>

		<!-- Notes -->
		<div class="space-y-2">
			<Label for="payee-notes">Notes</Label>
			<Textarea
				id="payee-notes"
				bind:value={notes}
				placeholder="Optional notes about this payee..."
				rows={3}
			/>
		</div>

		<!-- Error message -->
		{#if error}
			<p class="text-destructive text-sm">{error}</p>
		{/if}
	</div>

	<!-- Footer actions -->
	<div class="flex gap-2 border-t p-4">
		<Button
			type="button"
			variant="outline"
			onclick={onCancel}
			disabled={isSaving}
			class="flex-1"
		>
			Cancel
		</Button>
		<Button type="submit" disabled={!isValid || isSaving} class="flex-1">
			{#if isSaving}
				<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
			{/if}
			{payee ? "Save Changes" : "Create Payee"}
		</Button>
	</div>
</form>
