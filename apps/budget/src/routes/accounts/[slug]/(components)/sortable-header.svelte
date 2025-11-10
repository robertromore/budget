<script lang="ts" generics="TData, TValue">
import {useSortable} from '@dnd-kit-svelte/sortable';
import {CSS} from '@dnd-kit-svelte/utilities';
import type {Header} from '@tanstack/table-core';
import {FlexRender} from '$lib/components/ui/data-table';
import GripVertical from '@lucide/svelte/icons/grip-vertical';
import {cn} from '$lib/utils';

interface Props {
	header: Header<TData, TValue>;
	density: 'normal' | 'dense';
	isDraggable: boolean;
	stickyHeader?: boolean;
	onTransformChange?: (columnId: string, transform: string) => void;
}

let {
	header,
	density,
	isDraggable,
	stickyHeader = false,
	onTransformChange
}: Props = $props();

const sortable = useSortable({
	id: header.id,
	disabled: !isDraggable
});

// Function to pass as ref - call setNodeRef directly
function refCallback(node: HTMLTableCellElement | null) {
	if (node && sortable.setNodeRef) {
		if (typeof sortable.setNodeRef === 'function') {
			sortable.setNodeRef(node);
		} else if ('current' in sortable.setNodeRef) {
			sortable.setNodeRef.current = node;
		}
	}
}

const style = $derived(() => {
	const transformValue = sortable.transform?.current;
	const transitionValue = sortable.transition?.current;
	const isDraggingValue = sortable.isDragging?.current;

	if (transformValue) {
		return `transform: ${CSS.Transform.toString(transformValue)}; transition: ${transitionValue ?? ''}; opacity: ${isDraggingValue ? 0 : 1};`;
	}
	return '';
});

// Merge attributes and listeners for the drag handle
const dragHandleProps = $derived(() => {
	if (!isDraggable) return {};
	return {
		...sortable.attributes?.current,
		...sortable.listeners?.current
	};
});

// Report transform changes to parent
$effect(() => {
	if (onTransformChange) {
		const transformValue = sortable.transform?.current;

		if (transformValue) {
			const transformStr = CSS.Transform.toString(transformValue);
			onTransformChange(header.id, transformStr);
		} else {
			onTransformChange(header.id, '');
		}
	}
});
</script>

<th
	use:refCallback
	colspan={header.colSpan}
	data-slot="table-head"
	style={style()}
	class={cn(
		'text-foreground bg-clip-padding px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0',
		density === 'dense' ? 'h-8' : 'h-10',
		stickyHeader && 'relative bg-background border-b border-border'
	)}>
	{#if !header.isPlaceholder && header.column.columnDef.header}
		<div class="flex items-center gap-3">
			{#if isDraggable}
				<button
					type="button"
					{...dragHandleProps()}
					class="touch-none cursor-grab active:cursor-grabbing flex items-center shrink-0">
					<GripVertical class="size-4 text-muted-foreground hover:text-foreground transition-colors" />
				</button>
			{/if}
			<FlexRender
				content={header.column.columnDef.header}
				context={header.getContext()} />
		</div>
	{/if}
</th>
