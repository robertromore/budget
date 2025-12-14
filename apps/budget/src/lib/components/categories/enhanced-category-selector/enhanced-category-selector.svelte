<script lang="ts">
	import { browser } from "$app/environment";
	import { getIconByName } from "$lib/components/ui/icon-picker/icon-categories";
	import ResponsiveSheet from "$lib/components/ui/responsive-sheet/responsive-sheet.svelte";
	import * as ToggleGroup from "$lib/components/ui/toggle-group";
	import type { Category } from "$lib/schema/categories";
	import { CategoriesState } from "$lib/states/entities/categories.svelte";
	import { rpc } from "$lib/query";
	import { cn } from "$lib/utils";
	import { MediaQuery } from "svelte/reactivity";
	import CategoryDetailPanel from "./category-detail-panel.svelte";
	import CategoryEmptyState from "./category-empty-state.svelte";
	import CategoryListView from "./category-list-view.svelte";
	import type {
	  DisplayMode,
	  EditMode,
	  LayoutMode,
	  QuickEditCategoryData,
	} from "./types";

	import Columns2 from "@lucide/svelte/icons/columns-2";
	import LayoutList from "@lucide/svelte/icons/layout-list";
	import Tag from "@lucide/svelte/icons/tag";

	interface Props {
		value?: number | null;
		onValueChange: (categoryId: number | null) => void;
		displayMode?: DisplayMode;
		allowCreate?: boolean;
		allowEdit?: boolean;
		buttonClass?: string;
		placeholder?: string;
	}

	let {
		value = $bindable(null),
		onValueChange,
		displayMode = "normal",
		allowCreate = true,
		allowEdit = true,
		buttonClass = "",
		placeholder = "Select category...",
	}: Props = $props();

	// Layout mode preference storage
	const LAYOUT_MODE_KEY = "category-selector-layout-mode";

	function getStoredLayoutMode(): LayoutMode {
		if (!browser) return "slide-in";
		return (
			(localStorage.getItem(LAYOUT_MODE_KEY) as LayoutMode) || "slide-in"
		);
	}

	function setStoredLayoutMode(mode: LayoutMode) {
		if (browser) {
			localStorage.setItem(LAYOUT_MODE_KEY, mode);
		}
	}

	// State
	const isDesktop = new MediaQuery("(min-width: 768px)");
	let open = $state(false);
	let layoutMode = $state<LayoutMode>(getStoredLayoutMode());
	let focusedCategoryId = $state<number | null>(null);
	let editMode = $state<EditMode>("view");
	let createInitialName = $state("");

	// Categories from context
	const categoriesState = CategoriesState.get();
	const allCategories = $derived(
		categoriesState ? categoriesState.getActiveCategories() : [],
	);

	// Selected category (the one that will be returned as value)
	const selectedCategory = $derived(
		allCategories.find((c) => c.id === value),
	);

	// Focused category (the one shown in detail panel)
	const focusedCategory = $derived(
		focusedCategoryId
			? (allCategories.find((c) => c.id === focusedCategoryId) ?? null)
			: null,
	);

	// Get icon for selected category
	const SelectedIcon = $derived.by(() => {
		if (!selectedCategory?.categoryIcon) return Tag;
		const iconData = getIconByName(selectedCategory.categoryIcon);
		return iconData?.icon || Tag;
	});

	// Use slide-in on mobile regardless of setting
	const effectiveLayoutMode = $derived(
		isDesktop.current ? layoutMode : "slide-in",
	);

	// Show detail panel in slide-in mode
	const showDetailPanel = $derived(
		focusedCategoryId !== null || editMode === "create",
	);

	// Handle layout mode change
	function handleLayoutModeChange(mode: string) {
		if (mode === "slide-in" || mode === "side-by-side") {
			layoutMode = mode;
			setStoredLayoutMode(mode);
		}
	}

	// Handle category focus (show in detail panel)
	function handleCategoryFocus(categoryId: number) {
		focusedCategoryId = categoryId;
		editMode = "view";
	}

	// Handle category select (confirm selection and close)
	function handleCategorySelect(categoryId: number) {
		value = categoryId;
		onValueChange(categoryId);
		open = false;
		resetState();
	}

	// Handle category edit
	function handleCategoryEdit(categoryId: number) {
		focusedCategoryId = categoryId;
		editMode = "edit";
	}

	// Handle create new category
	function handleCreateNew(searchValue: string = "") {
		createInitialName = searchValue;
		focusedCategoryId = null;
		editMode = "create";
	}

	// Handle back from detail panel
	function handleBack() {
		focusedCategoryId = null;
		editMode = "view";
		createInitialName = "";
	}

	// Handle save category (create or update)
	async function handleSaveCategory(
		data: QuickEditCategoryData,
	): Promise<void> {
		if (editMode === "create") {
			// Create new category
			const result = await rpc.categories.createCategory.execute({
				name: data.name,
				parentId: data.parentId,
				categoryType: data.categoryType as any,
				categoryIcon: data.categoryIcon,
				categoryColor: data.categoryColor,
				notes: data.notes,
			});
			if (categoriesState) {
				categoriesState.addCategory(result as Category);
			}
			// Auto-select the new category
			handleCategorySelect(result.id);
		} else if (focusedCategory) {
			// Update existing category
			const result = await rpc.categories.updateCategory.execute({
				id: focusedCategory.id,
				name: data.name,
				parentId: data.parentId,
				categoryType: data.categoryType as any,
				categoryIcon: data.categoryIcon,
				categoryColor: data.categoryColor,
				notes: data.notes,
			});
			if (categoriesState) {
				categoriesState.updateCategory(result as Category);
			}
			editMode = "view";
		}
	}

	// Handle select from detail panel
	function handleSelectFromDetail() {
		if (focusedCategoryId) {
			handleCategorySelect(focusedCategoryId);
		}
	}

	// Reset state when closing
	function resetState() {
		focusedCategoryId = null;
		editMode = "view";
		createInitialName = "";
	}

	// Handle open change via callback
	function handleOpenChange(newOpen: boolean) {
		if (!newOpen) {
			resetState();
		}
	}
</script>

<div class="w-full">
	<ResponsiveSheet
		bind:open
		onOpenChange={handleOpenChange}
		defaultWidth={effectiveLayoutMode === "side-by-side" ? 800 : 480}
		minWidth={effectiveLayoutMode === "side-by-side" ? 600 : 400}
		maxWidth={effectiveLayoutMode === "side-by-side" ? 1200 : 600}
		triggerClass={cn(
			"flex items-center w-full h-9 px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background",
			"hover:bg-accent hover:text-accent-foreground",
			"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
			"justify-start text-left font-normal",
			!selectedCategory && "text-muted-foreground",
			buttonClass,
		)}
	>
		{#snippet trigger()}
			{#if selectedCategory}
				<div
					class="mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded"
					style={selectedCategory.categoryColor
						? `background-color: ${selectedCategory.categoryColor}20;`
						: undefined}
				>
					<SelectedIcon
						class="h-3 w-3"
						style={selectedCategory.categoryColor
							? `color: ${selectedCategory.categoryColor};`
							: undefined}
					/>
				</div>
				<span class="truncate">{selectedCategory.name}</span>
			{:else}
				<Tag class="mr-2 h-4 w-4 shrink-0" />
				<span class="truncate">{placeholder}</span>
			{/if}
		{/snippet}

		{#snippet header()}
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-lg font-semibold">Select Category</h2>
					<p class="text-muted-foreground text-sm">
						{allCategories.length} categories available
					</p>
				</div>

				<!-- Layout mode toggle (desktop only) -->
				{#if isDesktop.current}
					<ToggleGroup.Root
						type="single"
						value={layoutMode}
						onValueChange={handleLayoutModeChange}
						class="border"
					>
						<ToggleGroup.Item
							value="slide-in"
							aria-label="Slide-in layout"
							class="px-2"
						>
							<LayoutList class="h-4 w-4" />
						</ToggleGroup.Item>
						<ToggleGroup.Item
							value="side-by-side"
							aria-label="Side-by-side layout"
							class="px-2"
						>
							<Columns2 class="h-4 w-4" />
						</ToggleGroup.Item>
					</ToggleGroup.Root>
				{/if}
			</div>
		{/snippet}

		{#snippet content()}
			{#if effectiveLayoutMode === "slide-in"}
				<!-- Slide-in layout -->
				<div
					class="relative h-[calc(100vh-12rem)] min-h-[400px] overflow-hidden"
				>
					<!-- List panel -->
					<div
						class={cn(
							"absolute inset-0 transition-transform duration-200 ease-out",
							showDetailPanel && "-translate-x-full",
						)}
					>
						<CategoryListView
							categories={allCategories}
							selectedId={value}
							focusedId={focusedCategoryId}
							{displayMode}
							{allowCreate}
							onCategoryFocus={handleCategoryFocus}
							onCategorySelect={handleCategorySelect}
							onCategoryEdit={handleCategoryEdit}
							onCreateNew={handleCreateNew}
						/>
					</div>

					<!-- Detail panel (slides from right) -->
					<div
						class={cn(
							"absolute inset-0 transition-transform duration-200 ease-out",
							!showDetailPanel && "translate-x-full",
						)}
					>
						<CategoryDetailPanel
							category={focusedCategory}
							mode={editMode}
							initialName={createInitialName}
							showBackButton={true}
							onModeChange={(mode) => (editMode = mode)}
							onSave={handleSaveCategory}
							onSelect={handleSelectFromDetail}
							onBack={handleBack}
						/>
					</div>
				</div>
			{:else}
				<!-- Side-by-side layout -->
				<div
					class="grid h-[calc(100vh-12rem)] min-h-[400px] grid-cols-[40%_60%]"
				>
					<!-- List panel -->
					<div class="overflow-hidden border-r">
						<CategoryListView
							categories={allCategories}
							selectedId={value}
							focusedId={focusedCategoryId}
							{displayMode}
							{allowCreate}
							onCategoryFocus={handleCategoryFocus}
							onCategorySelect={handleCategorySelect}
							onCategoryEdit={handleCategoryEdit}
							onCreateNew={handleCreateNew}
						/>
					</div>

					<!-- Detail panel -->
					<div class="overflow-hidden">
						{#if showDetailPanel}
							<CategoryDetailPanel
								category={focusedCategory}
								mode={editMode}
								initialName={createInitialName}
								showBackButton={false}
								onModeChange={(mode) => (editMode = mode)}
								onSave={handleSaveCategory}
								onSelect={handleSelectFromDetail}
								onBack={handleBack}
							/>
						{:else}
							<CategoryEmptyState
								categories={allCategories}
								onCreateNew={() => handleCreateNew("")}
								onCategoryFocus={handleCategoryFocus}
							/>
						{/if}
					</div>
				</div>
			{/if}
		{/snippet}
	</ResponsiveSheet>
</div>
