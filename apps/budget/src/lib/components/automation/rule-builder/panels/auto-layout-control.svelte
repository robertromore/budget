<!--
  Auto Layout Control

  Dropdown button that allows users to apply different layout algorithms
  to automatically arrange nodes in the flow canvas.
  Must be used inside SvelteFlow context.
-->
<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { useEdges, useNodes, useSvelteFlow, useUpdateNodeInternals } from '@xyflow/svelte';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import GitBranch from '@lucide/svelte/icons/git-branch';
	import LayoutGrid from '@lucide/svelte/icons/layout-grid';
	import Minimize2 from '@lucide/svelte/icons/minimize-2';
	import { tick } from 'svelte';
	import { layoutDirection } from '../stores';
	import { applyLayout, type LayoutDirection } from '../utils';

	const nodes = useNodes();
	const edges = useEdges();
	const { fitView } = useSvelteFlow();
	const updateNodeInternals = useUpdateNodeInternals();

	const layoutOptions: Array<{
		direction: LayoutDirection;
		label: string;
		description: string;
		icon: typeof LayoutGrid;
	}> = [
		{
			direction: 'vertical',
			label: 'Vertical',
			description: 'Top to bottom flow',
			icon: ArrowDown,
		},
		{
			direction: 'horizontal',
			label: 'Horizontal',
			description: 'Left to right flow',
			icon: ArrowRight,
		},
		{
			direction: 'tree',
			label: 'Tree',
			description: 'Branching layout',
			icon: GitBranch,
		},
		{
			direction: 'compact',
			label: 'Compact',
			description: 'Tight spacing',
			icon: Minimize2,
		},
	];

	async function handleLayout(direction: LayoutDirection) {
		// Update the layout direction store so nodes can adjust handle positions
		layoutDirection.set(direction);

		// Apply layout to get new node positions
		const layoutedNodes = applyLayout(nodes.current, edges.current, direction);

		// Update nodes with new positions
		nodes.current = layoutedNodes;

		// Wait for Svelte to process the store update and re-render handles
		await tick();

		// Notify SvelteFlow that node internals (handle positions) have changed
		// This forces edge path recalculation
		const nodeIds = nodes.current.map((n) => n.id);
		updateNodeInternals(nodeIds);

		// Wait for internals update to complete, then fit view
		await tick();
		fitView({ padding: 0.2, duration: 300 });
	}
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger
		title="Auto-layout nodes"
		class="svelte-flow__controls-button flex h-6.5 w-6.5 items-center justify-center rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
	>
		<LayoutGrid class="h-3 w-3" />
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="start" side="right" class="w-48">
		<DropdownMenu.Label>Layout Direction</DropdownMenu.Label>
		<DropdownMenu.Separator />
		{#each layoutOptions as option (option.direction)}
			<DropdownMenu.Item onclick={() => handleLayout(option.direction)}>
				<option.icon class="mr-2 h-4 w-4" />
				<div class="flex flex-col">
					<span>{option.label}</span>
					<span class="text-xs text-muted-foreground">{option.description}</span>
				</div>
			</DropdownMenu.Item>
		{/each}
	</DropdownMenu.Content>
</DropdownMenu.Root>
