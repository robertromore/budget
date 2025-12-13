<script lang="ts">
	import { ParentCategorySelector } from "$lib/components/categories";
	import { Button } from "$lib/components/ui/button";
	import { ColorPicker } from "$lib/components/ui/color-picker";
	import { IconPicker } from "$lib/components/ui/icon-picker";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import * as Select from "$lib/components/ui/select";
	import { Textarea } from "$lib/components/ui/textarea";
	import { categoryTypeEnum, type CategoryType } from "$lib/schema";
	import type { Category } from "$lib/schema/categories";
	import { CategoriesState } from "$lib/states/entities/categories.svelte";
	import LoaderCircle from "@lucide/svelte/icons/loader-circle";
	import type { QuickEditCategoryData } from "./types";

	interface Props {
		category?: Category | null;
		initialName?: string;
		onSave: (data: QuickEditCategoryData) => Promise<void>;
		onCancel: () => void;
	}

	let { category = null, initialName = "", onSave, onCancel }: Props = $props();

	// Form state
	let name = $state("");
	let parentId = $state<number | null>(null);
	let categoryType = $state<CategoryType>("expense");
	let categoryIcon = $state<string | null>(null);
	let categoryColor = $state<string | null>(null);
	let notes = $state<string | null>(null);
	let isSaving = $state(false);
	let error = $state<string | null>(null);

	// Sync form state when category or initialName changes
	$effect(() => {
		name = category?.name ?? initialName ?? "";
		parentId = category?.parentId ?? null;
		categoryType = category?.categoryType ?? "expense";
		categoryIcon = category?.categoryIcon ?? null;
		categoryColor = category?.categoryColor ?? null;
		notes = category?.notes ?? null;
		error = null;
	});

	// Categories state for parent selector
	const categoriesState = CategoriesState.get();
	const allCategories = $derived(categoriesState.all);

	// Category type options
	const categoryTypeOptions = categoryTypeEnum.map((type) => ({
		value: type,
		label: type.charAt(0).toUpperCase() + type.slice(1),
	}));

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
				parentId,
				categoryType,
				categoryIcon,
				categoryColor,
				notes: notes?.trim() || null,
			});
		} catch (err) {
			console.error("Failed to save category:", err);
			error = err instanceof Error ? err.message : "Failed to save category";
		} finally {
			isSaving = false;
		}
	}

	function handleIconChange(event: CustomEvent<{ value: string }>) {
		categoryIcon = event.detail.value || null;
	}

	function handleColorChange(event: CustomEvent<{ value: string }>) {
		categoryColor = event.detail.value || null;
	}
</script>

<form onsubmit={handleSubmit} class="flex h-full flex-col">
	<div class="flex-1 space-y-4 overflow-auto p-4">
		<!-- Name -->
		<div class="space-y-2">
			<Label for="category-name">Name *</Label>
			<Input
				id="category-name"
				bind:value={name}
				placeholder="Enter category name"
				required
				autofocus
			/>
		</div>

		<!-- Category Type -->
		<div class="space-y-2">
			<Label>Type</Label>
			<Select.Root type="single" bind:value={categoryType}>
				<Select.Trigger class="w-full">
					{categoryTypeOptions.find((opt) => opt.value === categoryType)?.label ??
						"Select type"}
				</Select.Trigger>
				<Select.Content>
					{#each categoryTypeOptions as option (option.value)}
						<Select.Item value={option.value}>{option.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<!-- Parent Category -->
		<div class="space-y-2">
			<ParentCategorySelector
				categories={allCategories}
				bind:value={parentId}
				currentCategoryId={category?.id ?? undefined}
			/>
		</div>

		<!-- Icon and Color -->
		<div class="grid grid-cols-2 gap-4">
			<div class="space-y-2">
				<Label>Icon</Label>
				<IconPicker
					value={categoryIcon ?? ""}
					placeholder="Select icon"
					onchange={handleIconChange}
				/>
			</div>

			<div class="space-y-2">
				<Label>Color</Label>
				<ColorPicker
					value={categoryColor ?? ""}
					placeholder="Select color"
					onchange={handleColorChange}
				/>
			</div>
		</div>

		<!-- Notes -->
		<div class="space-y-2">
			<Label for="category-notes">Notes</Label>
			<Textarea
				id="category-notes"
				bind:value={notes}
				placeholder="Optional notes about this category..."
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
			{category ? "Save Changes" : "Create Category"}
		</Button>
	</div>
</form>
