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
	import type { EntityType } from '$lib/types/automation';
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

<Card.Root class="w-72">
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
			<!-- Node Type Indicator -->
			<div class="mb-4">
				<div class={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${headerColor()}`}>
					{nodeTypeLabel()}
				</div>
				<p class="mt-1 text-xs text-muted-foreground">ID: {selectedNode.id}</p>
			</div>

			<Separator class="my-3" />

			<!-- Node-specific properties -->
			{#if selectedNode.type === 'trigger'}
				<div class="space-y-3">
					<div class="space-y-1.5">
						<Label class="text-xs">Debounce (ms)</Label>
						<Input
							type="number"
							min="0"
							step="100"
							value={String(selectedNode.data.debounceMs || '')}
							oninput={handleDebounceChange}
							placeholder="No debounce"
							class="h-8 text-sm"
						/>
						<p class="text-xs text-muted-foreground">
							Delay before re-triggering (prevents rapid fires)
						</p>
					</div>
				</div>
			{:else if selectedNode.type === 'condition'}
				<div class="space-y-2">
					<p class="text-sm text-muted-foreground">
						Edit condition details directly in the node
					</p>
					<div class="rounded-md bg-muted/50 p-2 text-xs">
						<div class="font-medium">Current:</div>
						<div class="mt-1 space-y-0.5 text-muted-foreground">
							<div>Field: {selectedNode.data.field || '(not set)'}</div>
							<div>Operator: {selectedNode.data.operator || '(not set)'}</div>
							<div>Value: {String(selectedNode.data.value) || '(not set)'}</div>
						</div>
					</div>
				</div>
			{:else if selectedNode.type === 'action'}
				<div class="space-y-2">
					<p class="text-sm text-muted-foreground">
						Edit action details directly in the node
					</p>
					<div class="rounded-md bg-muted/50 p-2 text-xs">
						<div class="font-medium">Current:</div>
						<div class="mt-1 text-muted-foreground">
							Type: {selectedNode.data.type || '(not set)'}
						</div>
					</div>
				</div>
			{:else if selectedNode.type === 'group'}
				<div class="space-y-2">
					<div class="rounded-md bg-muted/50 p-2 text-xs">
						<div class="font-medium">Logic:</div>
						<div class="mt-1 text-muted-foreground">
							{selectedNode.data.operator === 'AND'
								? 'All conditions must match'
								: 'Any condition can match'}
						</div>
					</div>
				</div>
			{/if}

			<Separator class="my-3" />

			<!-- Node Actions -->
			<div class="flex gap-2">
				{#if selectedNode.type !== 'trigger'}
					<Button
						variant="outline"
						size="sm"
						class="flex-1"
						onclick={() => onDuplicateNode(selectedNode.id)}
					>
						<Copy class="mr-1.5 h-3.5 w-3.5" />
						Duplicate
					</Button>
				{/if}
				<Button
					variant="destructive"
					size="sm"
					class="flex-1"
					onclick={() => onDeleteNode(selectedNode.id)}
				>
					<Trash2 class="mr-1.5 h-3.5 w-3.5" />
					Delete
				</Button>
			</div>
		{:else}
			<div class="py-8 text-center">
				<Settings class="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
				<p class="text-sm text-muted-foreground">
					Select a node to view its properties
				</p>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
