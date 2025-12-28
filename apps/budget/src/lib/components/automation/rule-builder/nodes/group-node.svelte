<!--
  Group Node

  Container node for grouping conditions with AND/OR logic.
  This is a special node that visually contains child conditions.
-->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import Combine from '@lucide/svelte/icons/combine';
	import { Handle, Position } from '@xyflow/svelte';
	import { isHorizontalLayout, layoutDirection } from '../stores';

	interface GroupNodeData {
		id: string;
		operator: 'AND' | 'OR';
		label?: string;
		onUpdate?: (data: { id: string; operator: 'AND' | 'OR' }) => void;
	}

	interface Props {
		id: string;
		data: GroupNodeData;
		selected?: boolean;
	}

	let { id, data, selected }: Props = $props();

	// Dynamic handle positions based on layout direction
	const isHorizontal = $derived(isHorizontalLayout($layoutDirection));
	const targetPosition = $derived(isHorizontal ? Position.Left : Position.Top);
	const sourcePosition = $derived(isHorizontal ? Position.Right : Position.Bottom);
	// For multiple source handles, adjust positioning style
	const sourceHandle1Style = $derived(isHorizontal ? 'top: 30%' : 'left: 30%');
	const sourceHandle2Style = $derived(isHorizontal ? 'top: 70%' : 'left: 70%');

	function toggleOperator() {
		const newOperator = data.operator === 'AND' ? 'OR' : 'AND';
		data.onUpdate?.({
			id: data.id,
			operator: newOperator
		});
	}
</script>

<div
	class={cn(
		'group-node w-48 rounded-lg border-2 bg-background shadow-md transition-all',
		selected ? 'ring-2' : '',
		data.operator === 'AND'
			? selected
				? 'border-purple-500 ring-purple-200'
				: 'border-purple-400'
			: selected
				? 'border-indigo-500 ring-indigo-200'
				: 'border-indigo-400'
	)}
>
	<!-- Input Handle -->
	<Handle
		type="target"
		position={targetPosition}
		class={cn(
			'!h-3 !w-3 !border-2 !border-white',
			data.operator === 'AND' ? '!bg-purple-500' : '!bg-indigo-500'
		)}
	/>

	<!-- Header -->
	<div
		class={cn(
			'flex items-center justify-between rounded-t-md px-3 py-2 text-white',
			data.operator === 'AND' ? 'bg-purple-500' : 'bg-indigo-500'
		)}
	>
		<div class="flex items-center gap-2">
			<Combine class="h-4 w-4" />
			<span class="font-semibold">Group</span>
		</div>
	</div>

	<!-- Body -->
	<div class="p-3">
		<div class="flex items-center justify-center gap-2">
			<Button
				variant={data.operator === 'AND' ? 'default' : 'outline'}
				size="sm"
				class={cn(
					'h-7 px-3 text-xs font-semibold',
					data.operator === 'AND' && 'bg-purple-600 hover:bg-purple-700'
				)}
				onclick={data.operator !== 'AND' ? toggleOperator : undefined}
			>
				AND
			</Button>
			<Button
				variant={data.operator === 'OR' ? 'default' : 'outline'}
				size="sm"
				class={cn(
					'h-7 px-3 text-xs font-semibold',
					data.operator === 'OR' && 'bg-indigo-600 hover:bg-indigo-700'
				)}
				onclick={data.operator !== 'OR' ? toggleOperator : undefined}
			>
				OR
			</Button>
		</div>

		<p class="mt-2 text-center text-xs text-muted-foreground">
			{#if data.operator === 'AND'}
				All conditions must match
			{:else}
				Any condition can match
			{/if}
		</p>
	</div>

	<!-- Output Handles (multiple for branching) -->
	<Handle
		type="source"
		position={sourcePosition}
		id="out-1"
		style={sourceHandle1Style}
		class={cn(
			'!h-3 !w-3 !border-2 !border-white',
			data.operator === 'AND' ? '!bg-purple-500' : '!bg-indigo-500'
		)}
	/>
	<Handle
		type="source"
		position={sourcePosition}
		id="out-2"
		style={sourceHandle2Style}
		class={cn(
			'!h-3 !w-3 !border-2 !border-white',
			data.operator === 'AND' ? '!bg-purple-500' : '!bg-indigo-500'
		)}
	/>
</div>
