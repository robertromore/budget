<script lang="ts">
	import { EnhancedCategorySelector } from "$lib/components/categories/enhanced-category-selector";
	import type { Category } from "$lib/schema";

	let {
		value,
		onUpdateValue,
	}: {
		value?: Category | null;
		onUpdateValue: (newValue: number | null) => void;
	} = $props();

	const categoryId = $derived(value?.id ?? null);

	function handleValueChange(newCategoryId: number | null) {
		onUpdateValue(newCategoryId);
	}
</script>

<EnhancedCategorySelector
	value={categoryId}
	onValueChange={handleValueChange}
	buttonClass="w-48"
	placeholder="Select category..."
/>
