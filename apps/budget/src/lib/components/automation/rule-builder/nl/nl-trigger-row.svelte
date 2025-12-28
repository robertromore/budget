<!--
  NL Trigger Row

  Displays the trigger selection in natural language format:
  "When [Entity Type ▼] [Event ▼]"
-->
<script lang="ts">
	import * as Select from '$lib/components/ui/select';
	import {
		entityTypes,
		getEntityTypeLabel,
		triggerEvents,
		type EntityType,
		type TriggerConfig,
	} from '$lib/types/automation';

	interface Props {
		/** Current trigger configuration */
		trigger: TriggerConfig;
		/** Whether the entity type can be changed (usually disabled) */
		entityTypeDisabled?: boolean;
		/** Called when trigger is updated */
		onUpdate: (trigger: TriggerConfig) => void;
	}

	let { trigger, entityTypeDisabled = true, onUpdate }: Props = $props();

	// Get available events for the current entity type
	const availableEvents = $derived(triggerEvents[trigger.entityType] || []);

	// Get display labels
	const entityLabel = $derived(getEntityTypeLabel(trigger.entityType));
	const eventLabel = $derived(
		availableEvents.find((e) => e.event === trigger.event)?.label || 'Select event...'
	);

	function handleEntityTypeChange(value: string | undefined) {
		if (!value) return;
		const newEntityType = value as EntityType;
		const newEvents = triggerEvents[newEntityType] || [];
		const defaultEvent = newEvents[0]?.event || '';

		onUpdate({
			...trigger,
			entityType: newEntityType,
			event: defaultEvent,
		});
	}

	function handleEventChange(value: string | undefined) {
		if (!value) return;
		onUpdate({
			...trigger,
			event: value,
		});
	}
</script>

<div class="group flex flex-wrap items-center gap-2 rounded-md border border-green-200 bg-green-50/50 px-3 py-2 text-base dark:border-green-800 dark:bg-green-950/30">
	<span class="font-medium text-foreground">When</span>

	<!-- Entity Type Select -->
	<Select.Root
		type="single"
		value={trigger.entityType}
		onValueChange={handleEntityTypeChange}
		disabled={entityTypeDisabled}
	>
		<Select.Trigger class="h-8 w-auto min-w-32 gap-1 border-green-300 bg-green-50 px-3 font-medium text-green-700 hover:bg-green-100 dark:border-green-700 dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-900">
			{entityLabel}
		</Select.Trigger>
		<Select.Content>
			{#each entityTypes as type (type.value)}
				<Select.Item value={type.value}>
					{type.label}
				</Select.Item>
			{/each}
		</Select.Content>
	</Select.Root>

	<span class="text-muted-foreground">is</span>

	<!-- Event Select -->
	<Select.Root type="single" value={trigger.event} onValueChange={handleEventChange}>
		<Select.Trigger class="h-8 w-auto min-w-36 gap-1 border-green-300 bg-green-50 px-3 font-medium text-green-700 hover:bg-green-100 dark:border-green-700 dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-900">
			{eventLabel}
		</Select.Trigger>
		<Select.Content>
			{#each availableEvents as event (event.event)}
				<Select.Item value={event.event}>
					<div class="flex flex-col">
						<span>{event.label}</span>
						<span class="text-xs text-muted-foreground">{event.description}</span>
					</div>
				</Select.Item>
			{/each}
		</Select.Content>
	</Select.Root>
</div>
