<!--
  Properties Panel

  A panel for editing properties of the selected node.
-->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import { conditionFields, getActionLabel, operatorInfo, type ConditionOperator, type EntityType } from '$lib/types/automation';
	import Copy from '@lucide/svelte/icons/copy';
	import Settings from '@lucide/svelte/icons/settings';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import type { Node } from '@xyflow/svelte';

	interface Props {
		selectedNode: Node | null;
		entityType: EntityType;
		onDeleteNode: (nodeId: string) => void;
		onDuplicateNode: (nodeId: string) => void;
		onUpdateNodeData: (nodeId: string, data: Record<string, unknown>) => void;
	}

	let { selectedNode, entityType, onDeleteNode, onDuplicateNode, onUpdateNodeData }: Props = $props();

	// Get node type label
	const nodeTypeLabel = $derived(() => {
		if (!selectedNode) return '';
		switch (selectedNode.type) {
			case 'trigger':
				return 'Trigger';
			case 'condition':
				return 'Condition';
			case 'action':
				return 'Action';
			case 'group':
				return 'Group';
			default:
				return 'Node';
		}
	});

	// Get header color based on node type
	const headerColor = $derived(() => {
		if (!selectedNode) return 'bg-muted';
		switch (selectedNode.type) {
			case 'trigger':
				return 'bg-green-500';
			case 'condition':
				return 'bg-blue-500';
			case 'action':
				return 'bg-orange-500';
			case 'group':
				return 'bg-purple-500';
			default:
				return 'bg-muted';
		}
	});

	function handleDebounceChange(e: Event) {
		if (!selectedNode) return;
		const target = e.target as HTMLInputElement;
		const debounceMs = parseInt(target.value) || undefined;
		onUpdateNodeData(selectedNode.id, {
			...selectedNode.data,
			debounceMs,
		});
	}
</script>

<Card.Root>
	<Card.Header class="pb-3">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<Settings class="h-4 w-4 text-muted-foreground" />
				<Card.Title class="text-sm font-medium">Properties</Card.Title>
			</div>
		</div>
	</Card.Header>

	<Card.Content>
		{#if selectedNode}
			<div class="flex items-start gap-4">
				<!-- Node Type Indicator -->
				<div class="shrink-0">
					<div class={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${headerColor()}`}>
						{nodeTypeLabel()}
					</div>
					<p class="mt-1 text-xs text-muted-foreground">ID: {selectedNode.id}</p>
				</div>

				<!-- Node-specific properties -->
				<div class="flex-1">
					{#if selectedNode.type === 'trigger'}
						<div class="flex items-center gap-2">
							<Label class="text-xs whitespace-nowrap">Debounce (ms)</Label>
							<Input
								type="number"
								min="0"
								step="100"
								value={String(selectedNode.data.debounceMs || '')}
								oninput={handleDebounceChange}
								placeholder="No debounce"
								class="h-8 w-24 text-sm"
							/>
						</div>
					{:else if selectedNode.type === 'condition'}
						{@const field = selectedNode.data.field as string | undefined}
						{@const operator = selectedNode.data.operator as ConditionOperator | undefined}
						{@const fieldLabel = conditionFields[entityType]?.find(f => f.field === field)?.label || field}
						{@const opLabel = operator ? (operatorInfo[operator]?.label || operator) : undefined}
						<div class="flex gap-3 text-xs text-muted-foreground">
							<span>Field: <strong class="text-foreground">{fieldLabel || '(not set)'}</strong></span>
							<span>Op: <strong class="text-foreground">{opLabel || '(not set)'}</strong></span>
							<span>Value: <strong class="text-foreground">{String(selectedNode.data.value) || '(not set)'}</strong></span>
						</div>
					{:else if selectedNode.type === 'action'}
						{@const actionType = selectedNode.data.type as string | undefined}
						<div class="text-xs text-muted-foreground">
							Type: <strong class="text-foreground">{actionType ? getActionLabel(actionType) : '(not set)'}</strong>
						</div>
					{:else if selectedNode.type === 'group'}
						<div class="text-xs text-muted-foreground">
							Logic: <strong class="text-foreground">{selectedNode.data.operator === 'AND' ? 'All must match' : 'Any can match'}</strong>
						</div>
					{/if}
				</div>

				<!-- Node Actions -->
				<div class="flex shrink-0 gap-2">
					{#if selectedNode.type !== 'trigger'}
						<Button
							variant="outline"
							size="sm"
							onclick={() => onDuplicateNode(selectedNode.id)}
						>
							<Copy class="mr-1.5 h-3.5 w-3.5" />
							Duplicate
						</Button>
					{/if}
					<Button
						variant="destructive"
						size="sm"
						onclick={() => onDeleteNode(selectedNode.id)}
					>
						<Trash2 class="mr-1.5 h-3.5 w-3.5" />
						Delete
					</Button>
				</div>
			</div>
		{:else}
			<div class="flex items-center gap-3 py-2">
				<Settings class="h-5 w-5 text-muted-foreground/50" />
				<p class="text-sm text-muted-foreground">
					Select a node to view its properties
				</p>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
