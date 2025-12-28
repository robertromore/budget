<!--
  Node Palette

  A panel containing draggable node types that can be added to the flow canvas.
-->
<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import type { EntityType } from '$lib/types/automation';
	import { cn } from '$lib/utils';
	import Combine from '@lucide/svelte/icons/combine';
	import Filter from '@lucide/svelte/icons/filter';
	import Play from '@lucide/svelte/icons/play';
	import Zap from '@lucide/svelte/icons/zap';

	interface Props {
		entityType: EntityType;
		onAddNode: (type: 'trigger' | 'condition' | 'action' | 'group') => void;
		hasTrigger?: boolean;
	}

	let { entityType, onAddNode, hasTrigger = false }: Props = $props();

	const nodeTypes = $derived([
		{
			type: 'trigger' as const,
			label: 'Trigger',
			description: 'Entry point that starts the rule',
			icon: Zap,
			color: 'bg-green-500',
			disabled: hasTrigger, // Only one trigger allowed
		},
		{
			type: 'condition' as const,
			label: 'Condition',
			description: 'Check a field against a value',
			icon: Filter,
			color: 'bg-blue-500',
			disabled: false,
		},
		{
			type: 'group' as const,
			label: 'Group',
			description: 'AND/OR logic for conditions',
			icon: Combine,
			color: 'bg-purple-500',
			disabled: false,
		},
		{
			type: 'action' as const,
			label: 'Action',
			description: 'Execute when conditions match',
			icon: Play,
			color: 'bg-orange-500',
			disabled: false,
		},
	]);

	function handleDragStart(e: DragEvent, type: 'trigger' | 'condition' | 'action' | 'group') {
		if (e.dataTransfer) {
			e.dataTransfer.setData('application/reactflow', type);
			e.dataTransfer.effectAllowed = 'move';
		}
	}
</script>

<Card.Root class="w-64">
	<Card.Header class="pb-3">
		<Card.Title class="text-sm font-medium">Add Nodes</Card.Title>
		<Card.Description class="text-xs">
			Drag and drop or click to add
		</Card.Description>
	</Card.Header>
	<Card.Content class="space-y-2">
		{#each nodeTypes as nodeType (nodeType.type)}
			{@const Icon = nodeType.icon}
			<button
				type="button"
				class={cn(
					'flex w-full cursor-grab items-start gap-3 rounded-lg border p-3 text-left transition-all',
					'hover:border-primary hover:bg-muted/50',
					'active:cursor-grabbing',
					nodeType.disabled && 'cursor-not-allowed opacity-50'
				)}
				disabled={nodeType.disabled}
				draggable={!nodeType.disabled}
				ondragstart={(e) => handleDragStart(e, nodeType.type)}
				onclick={() => !nodeType.disabled && onAddNode(nodeType.type)}
			>
				<div class={cn('rounded-md p-1.5 text-white', nodeType.color)}>
					<Icon class="h-4 w-4" />
				</div>
				<div class="flex-1 space-y-0.5">
					<div class="text-sm font-medium">{nodeType.label}</div>
					<div class="text-xs text-muted-foreground">{nodeType.description}</div>
				</div>
			</button>
		{/each}
	</Card.Content>
</Card.Root>
