<!--
  Rule Builder NL (Natural Language)

  Natural language interface for building automation rules.
  Uses structured template format with inline dropdowns.
-->
<script lang="ts">
	import { cn } from '$lib/utils';
	import {
		addAction,
		createEmptyAction,
		createEmptyCondition,
		createEmptyConditionGroup,
		removeAction,
		updateAction,
		updateTrigger,
		type RuleConfig,
	} from './utils';
	import NlActionRow from './nl/nl-action-row.svelte';
	import NlAddButton from './nl/nl-add-button.svelte';
	import NlConditionGroup from './nl/nl-condition-group.svelte';
	import NlTriggerRow from './nl/nl-trigger-row.svelte';
	import type { ActionConfig, Condition, ConditionGroup, EntityType, TriggerConfig } from '$lib/types/automation';

	interface Props {
		/** Current rule configuration */
		ruleConfig: RuleConfig;
		/** Entity type (used for creating new conditions/actions) */
		entityType?: EntityType;
		/** Whether the editor is read-only */
		readonly?: boolean;
		/** Called when rule config changes */
		onRuleChange: (config: RuleConfig) => void;
		/** Additional CSS classes */
		class?: string;
	}

	let {
		ruleConfig,
		entityType = 'transaction',
		readonly = false,
		onRuleChange,
		class: className,
	}: Props = $props();

	// Handle trigger update
	function handleTriggerUpdate(trigger: TriggerConfig) {
		onRuleChange(updateTrigger(ruleConfig, trigger));
	}

	// Handle conditions update
	function handleConditionsUpdate(conditions: ConditionGroup) {
		onRuleChange({
			...ruleConfig,
			conditions,
		});
	}

	// Create a new condition
	function createCondition(): Condition {
		return createEmptyCondition(ruleConfig.trigger.entityType);
	}

	// Create a new condition group
	function createGroup(operator: 'AND' | 'OR'): ConditionGroup {
		return createEmptyConditionGroup(operator);
	}

	// Handle action update
	function handleActionUpdate(index: number, action: ActionConfig) {
		onRuleChange(updateAction(ruleConfig, action.id, action));
	}

	// Handle action removal
	function handleActionRemove(actionId: string) {
		onRuleChange(removeAction(ruleConfig, actionId));
	}

	// Add a new action
	function handleAddAction() {
		const newAction = createEmptyAction(ruleConfig.trigger.entityType);
		onRuleChange(addAction(ruleConfig, newAction));
	}
</script>

<div class={cn('flex flex-col gap-6 rounded-lg border bg-background p-6', className)}>
	<!-- Section 1: Trigger -->
	<section>
		<NlTriggerRow
			trigger={ruleConfig.trigger}
			entityTypeDisabled={false}
			onUpdate={handleTriggerUpdate}
		/>
	</section>

	<!-- Section 2: Conditions -->
	<section class="space-y-3">
		<NlConditionGroup
			group={ruleConfig.conditions}
			entityType={ruleConfig.trigger.entityType}
			isRoot={true}
			depth={0}
			onUpdate={handleConditionsUpdate}
			{createCondition}
			{createGroup}
		/>
	</section>

	<!-- Section 3: Actions -->
	<section class="space-y-3">
		<div class="space-y-2">
			{#each ruleConfig.actions as action, index (action.id)}
				<NlActionRow
					{action}
					entityType={ruleConfig.trigger.entityType}
					isFirst={index === 0}
					onUpdate={(updated) => handleActionUpdate(index, updated)}
					onRemove={() => handleActionRemove(action.id)}
				/>
			{/each}

			{#if ruleConfig.actions.length === 0}
				<div class="rounded-md bg-orange-50/50 px-3 py-4 text-center text-sm text-muted-foreground">
					No actions yet. Add an action to complete your rule.
				</div>
			{/if}
		</div>

		<NlAddButton variant="action" onAdd={handleAddAction} />
	</section>
</div>
