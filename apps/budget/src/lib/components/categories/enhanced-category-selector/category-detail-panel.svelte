<script lang="ts">
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import { getIconByName } from "$lib/components/ui/icon-picker/icon-categories";
	import type { Category } from "$lib/schema/categories";
	import { CategoriesState } from "$lib/states/entities/categories.svelte";
	import ArrowLeft from "@lucide/svelte/icons/arrow-left";
	import Check from "@lucide/svelte/icons/check";
	import FileText from "@lucide/svelte/icons/file-text";
	import FolderTree from "@lucide/svelte/icons/folder-tree";
	import Pencil from "@lucide/svelte/icons/pencil";
	import Tag from "@lucide/svelte/icons/tag";
	import CategoryQuickEditForm from "./category-quick-edit-form.svelte";
	import type { EditMode, QuickEditCategoryData } from "./types";

	interface Props {
		category?: Category | null;
		mode: EditMode;
		initialName?: string;
		showBackButton?: boolean;
		onModeChange: (mode: EditMode) => void;
		onSave: (data: QuickEditCategoryData) => Promise<void>;
		onSelect: () => void;
		onBack: () => void;
	}

	let {
		category = null,
		mode,
		initialName = "",
		showBackButton = true,
		onModeChange,
		onSave,
		onSelect,
		onBack,
	}: Props = $props();

	const categoriesState = CategoriesState.get();

	// Get parent category name for display
	const parentCategoryName = $derived.by(() => {
		if (!category?.parentId || !categoriesState) return null;
		const parent = categoriesState.getById(category.parentId);
		return parent?.name ?? null;
	});

	// Get category icon component
	const IconComponent = $derived.by(() => {
		if (!category?.categoryIcon) return Tag;
		const iconData = getIconByName(category.categoryIcon);
		return iconData?.icon || Tag;
	});

	function getTypeLabel(type?: string | null): string {
		if (!type) return "Expense";
		return type.charAt(0).toUpperCase() + type.slice(1);
	}

	async function handleSave(data: QuickEditCategoryData) {
		await onSave(data);
		onModeChange("view");
	}

	function handleCancel() {
		// Always go back to the list when canceling from edit/create
		onBack();
	}
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	{#if mode === "view"}
		<div class="flex items-center justify-between border-b px-4 py-4">
			<div class="flex items-center gap-3">
				{#if showBackButton}
					<button
						type="button"
						onclick={onBack}
						class="hover:bg-accent rounded p-1"
					>
						<ArrowLeft class="h-5 w-5" />
					</button>
				{/if}
				<h3 class="text-lg font-semibold">
					{category?.name ?? "Category Details"}
				</h3>
			</div>
			<Button size="sm" onclick={onSelect}>
				<Check class="mr-1 h-4 w-4" />
				Select
			</Button>
		</div>
	{:else}
		<div class="flex items-center gap-3 border-b px-4 py-4">
			<button
				type="button"
				onclick={handleCancel}
				class="hover:bg-accent rounded p-1"
			>
				<ArrowLeft class="h-5 w-5" />
			</button>
			<h3 class="text-lg font-semibold">
				{mode === "create" ? "Create Category" : "Edit Category"}
			</h3>
		</div>
	{/if}

	<!-- Content -->
	{#if mode === "view" && category}
		<!-- View mode content -->
		<div class="flex-1 space-y-6 overflow-auto p-4">
			<!-- Category header with icon and color -->
			<div class="flex items-start gap-4">
				<div
					class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
					style={category.categoryColor
						? `background-color: ${category.categoryColor}20;`
						: undefined}
				>
					<IconComponent
						class="h-7 w-7"
						style={category.categoryColor
							? `color: ${category.categoryColor};`
							: undefined}
					/>
				</div>
				<div>
					<h2 class="text-2xl font-bold">{category.name}</h2>
					<Badge variant="secondary" class="mt-2">
						{getTypeLabel(category.categoryType)}
					</Badge>
				</div>
			</div>

			<!-- Color indicator -->
			{#if category.categoryColor}
				<div class="space-y-1">
					<div class="text-muted-foreground flex items-center gap-2 text-sm">
						<div
							class="h-4 w-4 rounded-full border"
							style={`background-color: ${category.categoryColor};`}
						></div>
						<span>Color</span>
					</div>
					<p class="font-medium">{category.categoryColor}</p>
				</div>
			{/if}

			<!-- Parent Category -->
			{#if parentCategoryName}
				<div class="space-y-1">
					<div class="text-muted-foreground flex items-center gap-2 text-sm">
						<FolderTree class="h-4 w-4" />
						<span>Parent Category</span>
					</div>
					<p class="font-medium">{parentCategoryName}</p>
				</div>
			{/if}

			<!-- Notes -->
			{#if category.notes}
				<div class="space-y-1">
					<div class="text-muted-foreground flex items-center gap-2 text-sm">
						<FileText class="h-4 w-4" />
						<span>Notes</span>
					</div>
					<p class="text-sm">{category.notes}</p>
				</div>
			{/if}
		</div>

		<!-- View mode footer -->
		<div class="border-t p-4">
			<Button
				variant="outline"
				class="w-full"
				onclick={() => onModeChange("edit")}
			>
				<Pencil class="mr-2 h-4 w-4" />
				Edit Category
			</Button>
		</div>
	{:else}
		<!-- Edit/Create mode -->
		<CategoryQuickEditForm
			category={mode === "edit" ? category : null}
			{initialName}
			onSave={handleSave}
			onCancel={handleCancel}
		/>
	{/if}
</div>
