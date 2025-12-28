<!--
  NL Sentence Builder

  Displays a human-readable summary of the rule configuration.
  Shows the rule as a natural language sentence with color-coded highlights.
-->
<script lang="ts">
	import {
		actionDefinitions,
		conditionFields,
		getEntityTypeLabel,
		isConditionGroup,
		operatorInfo,
		triggerEvents,
		type Condition,
		type ConditionGroup,
	} from '$lib/types/automation';
	import { formatDate } from '$lib/utils/date-formatters';
	import type { RuleConfig } from '../utils';

	// Regex to detect ISO date strings (YYYY-MM-DD)
	const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

	interface Props {
		/** The rule configuration to summarize */
		ruleConfig: RuleConfig;
	}

	let { ruleConfig }: Props = $props();

	// Segment types for building the sentence
	type SegmentType = 'text' | 'trigger' | 'condition' | 'action';
	type Segment = { type: SegmentType; value: string };

	// Build trigger segments
	const triggerSegments = $derived((): Segment[] => {
		const entityLabel = getEntityTypeLabel(ruleConfig.trigger.entityType).toLowerCase();
		const events = triggerEvents[ruleConfig.trigger.entityType] || [];
		const eventInfo = events.find((e) => e.event === ruleConfig.trigger.event);
		const eventLabel = eventInfo?.label.toLowerCase() || ruleConfig.trigger.event;

		return [
			{ type: 'text', value: 'a ' },
			{ type: 'trigger', value: entityLabel },
			{ type: 'text', value: ' is ' },
			{ type: 'trigger', value: eventLabel },
		];
	});

	// Build condition segments (recursive)
	function buildConditionSegments(
		item: Condition | ConditionGroup,
		depth: number = 0
	): Segment[] {
		if (isConditionGroup(item)) {
			if (item.conditions.length === 0) {
				return [];
			}

			const childSegmentArrays = item.conditions
				.map((child) => buildConditionSegments(child, depth + 1))
				.filter((arr) => arr.length > 0);

			if (childSegmentArrays.length === 0) {
				return [];
			}

			const connector = item.operator === 'AND' ? ' and ' : ' or ';
			const result: Segment[] = [];

			// Wrap in parentheses for nested groups with multiple children
			if (depth > 0 && childSegmentArrays.length > 1) {
				result.push({ type: 'text', value: '(' });
			}

			childSegmentArrays.forEach((segments, index) => {
				if (index > 0) {
					result.push({ type: 'text', value: connector });
				}
				result.push(...segments);
			});

			if (depth > 0 && childSegmentArrays.length > 1) {
				result.push({ type: 'text', value: ')' });
			}

			return result;
		}

		// Single condition
		const fields = conditionFields[ruleConfig.trigger.entityType] || [];
		const fieldInfo = fields.find((f) => f.field === item.field);
		const fieldLabel = fieldInfo?.label.toLowerCase() || item.field;

		const opInfo = operatorInfo[item.operator];
		const opLabel = opInfo?.label || item.operator;

		const segments: Segment[] = [];

		if (item.negate) {
			segments.push({ type: 'text', value: 'NOT (' });
		}

		segments.push({ type: 'condition', value: fieldLabel });
		segments.push({ type: 'text', value: ' ' });
		segments.push({ type: 'condition', value: opLabel });

		if (opInfo?.valueCount === 1) {
			const valueStr = formatValue(item.value);
			segments.push({ type: 'text', value: ' ' });
			segments.push({ type: 'condition', value: valueStr });
		} else if (opInfo?.valueCount === 2 && item.operator === 'between') {
			segments.push({ type: 'text', value: ' ' });
			segments.push({ type: 'condition', value: formatValue(item.value) });
			segments.push({ type: 'text', value: ' and ' });
			segments.push({ type: 'condition', value: formatValue(item.value2) });
		}

		if (item.negate) {
			segments.push({ type: 'text', value: ')' });
		}

		return segments;
	}

	function formatValue(value: unknown): string {
		if (value === null || value === undefined || value === '') {
			return '...';
		}
		if (typeof value === 'string') {
			// Check if it's an ISO date string and format it nicely
			if (ISO_DATE_REGEX.test(value)) {
				try {
					return formatDate(new Date(value + 'T00:00:00'));
				} catch {
					return value;
				}
			}
			return `"${value}"`;
		}
		if (typeof value === 'boolean') {
			return value ? 'true' : 'false';
		}
		return String(value);
	}

	// Build conditions segments
	const conditionsSegments = $derived((): Segment[] => {
		return buildConditionSegments(ruleConfig.conditions);
	});

	// Build actions segments
	const actionsSegments = $derived((): Segment[] => {
		if (ruleConfig.actions.length === 0) {
			return [];
		}

		const result: Segment[] = [];

		ruleConfig.actions.forEach((action, index) => {
			if (index > 0) {
				result.push({ type: 'text', value: ', then ' });
			}

			const actionDef = actionDefinitions.find((a) => a.type === action.type);
			if (!actionDef) {
				result.push({ type: 'action', value: action.type || '...' });
				return;
			}

			result.push({ type: 'action', value: actionDef.label.toLowerCase() });

			// Add key parameters
			const keyParams = actionDef.params.filter((p) => p.required);
			if (keyParams.length > 0) {
				const validParams = keyParams.filter((param) => {
					const value = action.params?.[param.name];
					return value !== null && value !== undefined && value !== '';
				});

				if (validParams.length > 0) {
					result.push({ type: 'text', value: ' (' });
					validParams.forEach((param, paramIndex) => {
						if (paramIndex > 0) {
							result.push({ type: 'text', value: ', ' });
						}
						const value = action.params?.[param.name];
						result.push({ type: 'text', value: `${param.label.toLowerCase()}: ` });
						result.push({ type: 'action', value: formatValue(value) });
					});
					result.push({ type: 'text', value: ')' });
				}
			}
		});

		return result;
	});

	// Full sentence segments
	const fullSentenceSegments = $derived((): Segment[] => {
		const segments: Segment[] = [{ type: 'text', value: 'When ' }];

		segments.push(...triggerSegments());

		const conditions = conditionsSegments();
		if (conditions.length > 0) {
			segments.push({ type: 'text', value: ' and ' });
			segments.push(...conditions);
		}

		const actions = actionsSegments();
		if (actions.length > 0) {
			segments.push({ type: 'text', value: ', then ' });
			segments.push(...actions);
		} else {
			segments.push({ type: 'text', value: ', then ' });
			segments.push({ type: 'action', value: '...' });
		}

		segments.push({ type: 'text', value: '.' });

		return segments;
	});

	// Get CSS classes for each segment type
	function getSegmentClasses(type: SegmentType): string {
		const base = 'mx-0.5 rounded border px-1.5 py-0.5 font-medium';
		switch (type) {
			case 'trigger':
				return `${base} border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950 dark:text-green-300`;
			case 'condition':
				return `${base} border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-300`;
			case 'action':
				return `${base} border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-950 dark:text-orange-300`;
			default:
				return '';
		}
	}
</script>

<div class="rounded-lg border bg-muted/20 p-4">
	<h4 class="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
		Rule Summary
	</h4>
	<p class="text-sm leading-relaxed text-foreground">
		{#each fullSentenceSegments() as segment}
			{#if segment.type !== 'text'}
				<span class={getSegmentClasses(segment.type)}>{segment.value}</span>
			{:else}
				{segment.value}
			{/if}
		{/each}
	</p>
</div>
