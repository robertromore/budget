<script lang="ts">
	import { Checkbox } from "$lib/components/ui/checkbox";
	import type { Row, Table } from "@tanstack/table-core";
	import {
	  lastSelectedRowId,
	  setLastSelectedRowId,
	} from "../../(data)/selection.svelte";

	// Using 'any' for Row/Table types since this component only uses
	// methods that exist on all Row/Table instances (getIsSelected, toggleSelected, etc.)
	interface Props {
		row: Row<any>;
		table: Table<any>;
		disabled?: boolean;
	}

	let { row, table, disabled = false }: Props = $props();

	function handleClick(event: MouseEvent) {
		// Prevent the checkbox from handling this click
		event.preventDefault();
		event.stopPropagation();

		if (disabled) return;

		const isShiftClick = event.shiftKey;

		// Prevent text selection when shift-clicking
		if (isShiftClick) {
			window.getSelection()?.removeAllRanges();
		}
		const lastRowId = lastSelectedRowId();

		if (isShiftClick && lastRowId !== null) {
			// Get all rows in their current order
			const rows = table.getRowModel().rows;
			const currentRowIndex = rows.findIndex((r) => r.id === row.id);
			const lastRowIndex = rows.findIndex((r) => r.id === lastRowId);

			if (currentRowIndex !== -1 && lastRowIndex !== -1) {
				// Determine range bounds
				const startIndex = Math.min(currentRowIndex, lastRowIndex);
				const endIndex = Math.max(currentRowIndex, lastRowIndex);

				// Select all rows in the range
				for (let i = startIndex; i <= endIndex; i++) {
					const rowToSelect = rows[i];
					if (rowToSelect && rowToSelect.getCanSelect()) {
						rowToSelect.toggleSelected(true);
					}
				}
			}
		} else {
			// Normal click - toggle the row
			row.toggleSelected(!row.getIsSelected());
		}

		// Always update the last selected row ID
		setLastSelectedRowId(row.id);
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (disabled) return;

		// Handle Space and Enter for keyboard accessibility
		if (event.key === " " || event.key === "Enter") {
			event.preventDefault();
			row.toggleSelected(!row.getIsSelected());
			setLastSelectedRowId(row.id);
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
