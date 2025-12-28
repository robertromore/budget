<!--
  Rule Builder

  Main component for creating and editing automation rules.
  Provides tabbed interface with both visual (node-based) and
  natural language views that stay synchronized.
-->
<script lang="ts">
	import * as Tabs from '$lib/components/ui/tabs';
	import type { EntityType, FlowState } from '$lib/types/automation';
	import { cn } from '$lib/utils';
	import { NlSentenceBuilder } from './nl';
	import RuleBuilderNl from './rule-builder-nl.svelte';
	import RuleBuilderVisual from './rule-builder-visual.svelte';
	import {
		createDefaultRuleConfig,
		flowToRule,
		ruleToFlow,
		type RuleConfig,
	} from './utils';

	type ViewMode = 'visual' | 'natural-language';

	interface Props {
		/** Initial flow state to load */
		initialFlowState?: FlowState | null;
		/** Initial rule config (used if no flow state) */
		initialRuleConfig?: RuleConfig | null;
		/** Entity type for the rule */
		entityType?: EntityType;
		/** Whether the editor is read-only */
		readonly?: boolean;
		/** Called when the rule changes */
		onChange?: (ruleConfig: RuleConfig, flowState: FlowState) => void;
		/** Called on explicit save action */
		onSave?: (ruleConfig: RuleConfig, flowState: FlowState) => void;
		/** Additional CSS classes */
		class?: string;
	}

	let {
		initialFlowState = null,
		initialRuleConfig = null,
		entityType = 'transaction',
		readonly = false,
		onChange,
		onSave,
		class: className,
	}: Props = $props();

	// Active view (visual or natural-language)
	let activeView = $state<ViewMode>('visual');

	// Central state: RuleConfig is the source of truth
	let ruleConfig = $state<RuleConfig>(
		initialRuleConfig ?? createDefaultRuleConfig(entityType)
	);

	// Flow state for the visual editor (derived from ruleConfig or provided)
	let flowState = $state<FlowState | null>(initialFlowState);

	// Reference to the visual builder for imperative methods
	let visualBuilder = $state<RuleBuilderVisual | null>(null);

	// Initialize from flow state if provided
	$effect(() => {
		if (initialFlowState && !initialRuleConfig) {
			try {
				// Convert initial flow state to rule config
				const imported = flowToRule(
					initialFlowState.nodes as any[],
					initialFlowState.edges as any[]
				);
				ruleConfig = imported;
			} catch {
				// Flow might be invalid, use default
				ruleConfig = createDefaultRuleConfig(entityType);
			}
		}
	});

	// Handle changes from the visual editor
	function handleVisualChange(newFlowState: FlowState, newRuleConfig: RuleConfig) {
		flowState = newFlowState;
		ruleConfig = newRuleConfig;
		onChange?.(ruleConfig, flowState);
	}

	// Handle changes from the NL editor
	function handleNLChange(newRuleConfig: RuleConfig) {
		ruleConfig = newRuleConfig;

		// Update flow state from rule config
		const flow = ruleToFlow(newRuleConfig);
		flowState = {
			nodes: flow.nodes as any[],
			edges: flow.edges as any[],
			viewport: flowState?.viewport,
		};

		// Update the visual builder if it exists
		visualBuilder?.updateFromRuleConfig(newRuleConfig);

		onChange?.(ruleConfig, flowState);
	}

	// Handle save action
	function handleSave(newFlowState: FlowState, newRuleConfig: RuleConfig) {
		flowState = newFlowState;
		ruleConfig = newRuleConfig;
		onSave?.(ruleConfig, flowState);
	}

	// Public methods
	export function save() {
		return visualBuilder?.save();
	}

	export function getFlowState(): FlowState | null {
		return visualBuilder?.getFlowState() ?? flowState;
	}

	export function getRuleConfig(): RuleConfig {
		return ruleConfig;
	}

	export function getValidationErrors(): string[] {
		return visualBuilder?.getValidationErrors() ?? [];
	}
</script>

<div class={cn('flex flex-col gap-4', className)}>
	<Tabs.Root bind:value={activeView}>
		<Tabs.List class="grid w-80 grid-cols-2">
			<Tabs.Trigger value="visual">Visual</Tabs.Trigger>
			<Tabs.Trigger value="natural-language">Natural Language</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="visual" class="mt-4">
			<RuleBuilderVisual
				bind:this={visualBuilder}
				initialFlowState={flowState}
				{entityType}
				{readonly}
				onFlowChange={handleVisualChange}
				onSave={handleSave}
			/>
		</Tabs.Content>

		<Tabs.Content value="natural-language" class="mt-4">
			<div class="space-y-4">
				<RuleBuilderNl
					{ruleConfig}
					{entityType}
					{readonly}
					onRuleChange={handleNLChange}
				/>

				<!-- Rule Summary Preview -->
				<NlSentenceBuilder {ruleConfig} />
			</div>
		</Tabs.Content>
	</Tabs.Root>
</div>
