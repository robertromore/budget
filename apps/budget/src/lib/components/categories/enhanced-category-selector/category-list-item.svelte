<script lang="ts">
	import { getIconByName } from "$lib/components/ui/icon-picker/icon-categories";
	import type { Category } from "$lib/schema/categories";
	import { cn } from "$lib/utils";
	import Check from "@lucide/svelte/icons/check";
	import Pencil from "@lucide/svelte/icons/pencil";
	import Tag from "@lucide/svelte/icons/tag";
	import type { DisplayMode } from "./types";

	interface Props {
		category: Category;
		isSelected: boolean;
		isFocused: boolean;
		displayMode?: DisplayMode;
		onFocus: () => void;
		onSelect: () => void;
		onEdit: () => void;
	}

	let {
		category,
		isSelected,
		isFocused,
		displayMode = "normal",
		onFocus,
		onSelect,
		onEdit,
	}: Props = $props();

	// Get category icon component
	const IconComponent = $derived.by(() => {
		if (!category.categoryIcon) return Tag;
		const iconData = getIconByName(category.categoryIcon);
		return iconData?.icon || Tag;
	});

	function getCategoryTypeLabel(type?: string | null): string {
		if (!type) return "Expense";
		return type.charAt(0).toUpperCase() + type.slice(1);
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === "Enter") {
			e.preventDefault();
			onSelect();
		} else if (e.key === "e" || e.key === "E") {
			e.preventDefault();
			onEdit();
		}
	}
</script>

<div
	role="option"
	tabindex="0"
	aria-selected={isSelected}
	data-category-id={category.id}
	class={cn(
		"group relative flex w-full cursor-pointer items-center rounded-lg border text-left transition-all",
		displayMode === "compact" ? "gap-2 px-2.5 py-2" : "gap-3 px-3 py-3",
		isSelected && "border-primary bg-primary/5",
		isFocused && !isSelected && "border-primary bg-accent",
		!isFocused && !isSelected && "hover:border-primary/50 hover:bg-accent/50",
	)}
	onclick={onFocus}
	ondblclick={onSelect}
	onkeydown={handleKeyDown}
>
	<!-- Color indicator and icon -->
	<div class="flex shrink-0 items-center gap-2">
		{#if category.categoryColor}
			<div
				class="h-3 w-1 rounded-full"
				style={`background-color: ${category.categoryColor};`}
			></div>
		{/if}
		<div
			class={cn(
				"flex items-center justify-center rounded-md",
				displayMode === "compact" ? "h-6 w-6" : "h-8 w-8",
				category.categoryColor ? "bg-opacity-10" : "bg-muted",
			)}
			style={category.categoryColor
				? `background-color: ${category.categoryColor}20;`
				: undefined}
		>
			<IconComponent
				class={cn(
					displayMode === "compact" ? "h-3.5 w-3.5" : "h-4 w-4",
					category.categoryColor ? "" : "text-muted-foreground",
				)}
				style={category.categoryColor
					? `color: ${category.categoryColor};`
					: undefined}
			/>
		</div>
	</div>

	<!-- Category info -->
	<div class="min-w-0 flex-1">
		<p class="truncate text-sm font-medium">{category.name}</p>
		{#if displayMode === "normal"}
			<div class="mt-0.5 flex items-center gap-2">
				<p class="text-muted-foreground text-xs">
					{getCategoryTypeLabel(category.categoryType)}
				</p>
			</div>
		{/if}
	</div>

	<!-- Selection indicator -->
	{#if isSelected}
		<Check
			class={cn(
				"shrink-0",
				displayMode === "compact" ? "h-3.5 w-3.5" : "h-4 w-4",
				"text-primary",
			)}
		/>
	{/if}

	<!-- Edit button (visible on hover/focus) -->
	<button
		type="button"
		class={cn(
			"shrink-0 rounded p-1 transition-opacity",
			"hover:bg-background",
			"opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
			isFocused && "opacity-100",
		)}
		onclick={(e) => {
			e.stopPropagation();
			onEdit();
		}}
		title="Edit category"
	>
		<Pencil class="h-3.5 w-3.5" />
	</button>
</div>
