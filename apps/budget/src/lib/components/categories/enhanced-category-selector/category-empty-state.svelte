<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import { getIconByName } from "$lib/components/ui/icon-picker/icon-categories";
	import type { Category } from "$lib/schema/categories";
	import Plus from "@lucide/svelte/icons/plus";
	import Star from "@lucide/svelte/icons/star";
	import Tag from "@lucide/svelte/icons/tag";

	interface Props {
		categories: Category[];
		onCreateNew: () => void;
		onCategoryFocus: (categoryId: number) => void;
	}

	let { categories, onCreateNew, onCategoryFocus }: Props = $props();

	// Get popular/frequently used categories (first 5 sorted by name)
	const popularCategories = $derived(
		[...categories]
			.sort((a, b) => (a.name || "").localeCompare(b.name || ""))
			.slice(0, 5),
	);

	// Get icon component for a category
	function getIconComponent(iconName: string | null | undefined) {
		if (!iconName) return Tag;
		const iconData = getIconByName(iconName);
		return iconData?.icon || Tag;
	}
</script>

<div class="flex h-full flex-col items-center justify-center p-6 text-center">
	<div
		class="bg-muted/50 mb-4 flex h-16 w-16 items-center justify-center rounded-full"
	>
		<Tag class="text-muted-foreground h-8 w-8" />
	</div>

	<h3 class="text-lg font-semibold">Select a Category</h3>
	<p class="text-muted-foreground mt-1 text-sm">
		Choose a category from the list or create a new one
	</p>

	<Button variant="outline" class="mt-4" onclick={onCreateNew}>
		<Plus class="mr-2 h-4 w-4" />
		Create New Category
	</Button>

	{#if popularCategories.length > 0}
		<div class="mt-8 w-full max-w-xs">
			<div
				class="text-muted-foreground mb-3 flex items-center justify-center gap-2 text-sm"
			>
				<Star class="h-4 w-4" />
				<span>Popular Categories</span>
			</div>
			<div class="space-y-1">
				{#each popularCategories as category (category.id)}
					{@const IconComponent = getIconComponent(category.categoryIcon)}
					<button
						type="button"
						class="hover:bg-accent flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors"
						onclick={() => onCategoryFocus(category.id)}
					>
						<div
							class="flex h-5 w-5 shrink-0 items-center justify-center rounded"
							style={category.categoryColor
								? `background-color: ${category.categoryColor}20;`
								: undefined}
						>
							<IconComponent
								class="h-3 w-3"
								style={category.categoryColor
									? `color: ${category.categoryColor};`
									: undefined}
							/>
						</div>
						{category.name}
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>
