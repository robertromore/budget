<script lang="ts">
	import { Checkbox } from "$lib/components/ui/checkbox";
	import type { Row, Table } from "@tanstack/table-core";

	interface Props {
		row: Row<any>;
		table: Table<any>;
		disabled?: boolean;
	}

	let { row, table, disabled = false }: Props = $props();

	function handleClick(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();

		if (disabled) return;

		row.toggleSelected(!row.getIsSelected());
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (disabled) return;

		if (event.key === " " || event.key === "Enter") {
			event.preventDefault();
			row.toggleSelected(!row.getIsSelected());
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
		checked={row.getIsSelected()}
		{disabled}
		class="pointer-events-none"
		aria-label="Select row"
	/>
</div>
