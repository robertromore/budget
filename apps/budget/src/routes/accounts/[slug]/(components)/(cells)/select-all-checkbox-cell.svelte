<script lang="ts">
	import { Checkbox } from "$lib/components/ui/checkbox";
	import type { Table } from "@tanstack/table-core";

	interface Props {
		table: Table<any>;
	}

	let { table }: Props = $props();

	const allPageRowsSelected = $derived(table.getIsAllPageRowsSelected());
	const somePageRowsSelected = $derived(table.getIsSomePageRowsSelected());

	function handleClick(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();

		if (allPageRowsSelected) {
			table.toggleAllRowsSelected(false);
		} else {
			table.toggleAllPageRowsSelected(true);
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === " " || event.key === "Enter") {
			event.preventDefault();
			if (allPageRowsSelected) {
				table.toggleAllRowsSelected(false);
			} else {
				table.toggleAllPageRowsSelected(true);
			}
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="cursor-pointer select-none"
	onclick={handleClick}
	onkeydown={handleKeyDown}
>
	<Checkbox
		checked={allPageRowsSelected}
		indeterminate={somePageRowsSelected && !allPageRowsSelected}
		class="pointer-events-none"
		aria-label="Select all on page"
	/>
</div>
