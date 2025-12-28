<!--
  Trigger Node

  Entry point node for automation rules.
  Allows selection of entity type and trigger event.
-->
<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { entityTypes, triggerEvents, type EntityType, type TriggerConfig } from '$lib/types/automation';
	import Zap from '@lucide/svelte/icons/zap';
	import { Handle, Position } from '@xyflow/svelte';
	import { isHorizontalLayout, layoutDirection } from '../stores';

	interface TriggerNodeData extends TriggerConfig {
		onUpdate?: (data: TriggerConfig) => void;
	}

	interface Props {
		id: string;
		data: TriggerNodeData;
		selected?: boolean;
	}

	let { id, data, selected }: Props = $props();

	// Dynamic handle position based on layout direction
	const sourcePosition = $derived(isHorizontalLayout($layoutDirection) ? Position.Right : Position.Bottom);

	// Local state to ensure reactivity with SvelteFlow
	let localEntityType = $state(data.entityType);
	let localEvent = $state(data.event);

	// Sync local state with prop changes
	$effect(() => {
		localEntityType = data.entityType;
	});
	$effect(() => {
		localEvent = data.event;
	});

	// Get available events for selected entity type
	const availableEvents = $derived(
		localEntityType ? triggerEvents[localEntityType] || [] : []
	);

	// Display labels for Select triggers
	const entityTypeLabel = $derived(
		entityTypes.find((t) => t.value === localEntityType)?.label || 'Select entity...'
	);
	const eventLabel = $derived(
		availableEvents.find((e) => e.event === localEvent)?.label || 'Select event...'
	);

	function handleEntityTypeChange(value: string | undefined) {
		if (!value) return;
		const entityType = value as EntityType;
		// Reset event when entity type changes
		const events = triggerEvents[entityType] || [];
		const firstEvent = events[0]?.event || '';
		// Update local state immediately for responsive UI
		localEntityType = entityType;
		localEvent = firstEvent;
		data.onUpdate?.({
			entityType,
			event: firstEvent,
			debounceMs: data.debounceMs
		});
	}

	function handleEventChange(value: string | undefined) {
		if (!value) return;
		// Update local state immediately for responsive UI
		localEvent = value;
		data.onUpdate?.({
			entityType: localEntityType,
			event: value,
			debounceMs: data.debounceMs
		});
	}
</script>

<div
	class="trigger-node w-64 rounded-lg border-2 bg-background shadow-md transition-all {selected
		? 'border-green-500 ring-2 ring-green-200'
		: 'border-green-400'}"
>
	<!-- Header -->
	<div class="flex items-center gap-2 rounded-t-md bg-green-500 px-3 py-2 text-white">
		<Zap class="h-4 w-4" />
		<span class="font-semibold">Trigger</span>
	</div>

	<!-- Body -->
	<div class="space-y-3 p-3">
		<div class="space-y-1.5">
			<Label class="text-xs text-muted-foreground">When</Label>
			<Select.Root
				type="single"
				value={localEntityType}
				onValueChange={handleEntityTypeChange}
			>
				<Select.Trigger class="h-8 text-sm">
					{entityTypeLabel}
				</Select.Trigger>
				<Select.Content>
					{#each entityTypes as type (type.value)}
						<Select.Item value={type.value}>{type.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<div class="space-y-1.5">
			<Label class="text-xs text-muted-foreground">Event</Label>
			<Select.Root
				type="single"
				value={localEvent}
				onValueChange={handleEventChange}
				disabled={!localEntityType}
			>
				<Select.Trigger class="h-8 text-sm">
					{eventLabel}
				</Select.Trigger>
				<Select.Content>
					{#each availableEvents as evt (evt.event)}
						<Select.Item value={evt.event}>
							<div class="flex flex-col">
								<span>{evt.label}</span>
								{#if evt.description}
									<span class="text-xs text-muted-foreground">{evt.description}</span>
								{/if}
							</div>
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
	</div>

	<!-- Output Handle -->
	<Handle type="source" position={sourcePosition} class="!h-3 !w-3 !bg-green-500 !border-2 !border-white" />
</div>
