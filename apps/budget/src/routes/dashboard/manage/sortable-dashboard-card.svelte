<script lang="ts">
import { useSortable } from '@dnd-kit-svelte/sortable';
import { CSS } from '@dnd-kit-svelte/utilities';
import type { Snippet } from 'svelte';

let {
  id,
  children,
}: {
  id: number;
  children: Snippet<[{ dragHandleProps: Record<string, any> }]>;
} = $props();

// svelte-ignore state_referenced_locally
const sortable = useSortable({
  get id() { return id; },
});

function refCallback(node: HTMLDivElement) {
  if (sortable.setNodeRef) {
    if (typeof sortable.setNodeRef === 'function') {
      sortable.setNodeRef(node);
    } else if ('current' in (sortable.setNodeRef as object)) {
      (sortable.setNodeRef as { current: HTMLDivElement | null }).current = node;
    }
  }
}

const style = $derived(() => {
  const transform = sortable.transform?.current;
  const transition = sortable.transition?.current;
  const isDragging = sortable.isDragging?.current;

  if (transform) {
    return `transform: ${CSS.Transform.toString(transform)}; transition: ${transition ?? ''}; opacity: ${isDragging ? 0.5 : 1}; z-index: ${isDragging ? 50 : 'auto'};`;
  }
  return '';
});

const dragHandleProps = $derived(() => ({
  ...(sortable.attributes?.current ?? {}),
  ...(sortable.listeners?.current ?? {}),
}));
</script>

<div use:refCallback style={style()}>
  {@render children({ dragHandleProps: dragHandleProps() })}
</div>
