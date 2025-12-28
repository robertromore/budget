/**
 * Flow to Rule Converter
 *
 * Converts SvelteFlow node/edge state into automation rule configuration.
 */

import type {
  ActionConfig,
  Condition,
  ConditionGroup,
  FlowState,
  TriggerConfig,
} from '$lib/types/automation';
import type { Edge, Node } from '@xyflow/svelte';

interface FlowNode extends Node {
	type: 'trigger' | 'condition' | 'action' | 'group';
	data: Record<string, unknown>;
}

interface RuleConfig {
	trigger: TriggerConfig;
	conditions: ConditionGroup;
	actions: ActionConfig[];
}

/**
 * Convert flow nodes and edges into a rule configuration
 */
export function flowToRule(nodes: Node[], edges: Edge[]): RuleConfig {
	const flowNodes = nodes as FlowNode[];

	// Find the trigger node (entry point)
	const triggerNode = flowNodes.find((n) => n.type === 'trigger');
	if (!triggerNode) {
		throw new Error('Rule must have a trigger node');
	}

	// Extract trigger config
	const trigger: TriggerConfig = {
		entityType: triggerNode.data.entityType as TriggerConfig['entityType'],
		event: triggerNode.data.event as string,
		debounceMs: triggerNode.data.debounceMs as number | undefined,
	};

	// Build the condition tree by traversing from trigger
	const conditions = buildConditionTree(triggerNode.id, flowNodes, edges);

	// Collect all action nodes (terminal nodes)
	const actions = collectActions(flowNodes, edges);

	return {
		trigger,
		conditions,
		actions,
	};
}

/**
 * Build condition tree by traversing from a source node
 */
function buildConditionTree(
	sourceId: string,
	nodes: FlowNode[],
	edges: Edge[]
): ConditionGroup {
	// Find edges from this source
	const outgoingEdges = edges.filter((e) => e.source === sourceId);

	// Get target nodes
	const targetNodes = outgoingEdges
		.map((e) => nodes.find((n) => n.id === e.target))
		.filter((n): n is FlowNode => n !== undefined);

	const conditions: (Condition | ConditionGroup)[] = [];

	for (const node of targetNodes) {
		if (node.type === 'condition') {
			// Single condition
			conditions.push({
				id: node.data.id as string,
				field: node.data.field as string,
				operator: node.data.operator as Condition['operator'],
				value: node.data.value,
				value2: node.data.value2,
				negate: node.data.negate as boolean | undefined,
			});
		} else if (node.type === 'group') {
			// Nested group - recursively build its conditions
			const nestedGroup = buildConditionTree(node.id, nodes, edges);
			nestedGroup.id = node.data.id as string;
			nestedGroup.operator = node.data.operator as 'AND' | 'OR';
			conditions.push(nestedGroup);
		}
		// Skip action nodes - they're collected separately
	}

	// Default to AND if we have conditions, otherwise return empty group
	return {
		id: `group-${sourceId}`,
		operator: 'AND',
		conditions,
	};
}

/**
 * Collect all action nodes from the flow
 */
function collectActions(nodes: FlowNode[], edges: Edge[]): ActionConfig[] {
	const actionNodes = nodes.filter((n) => n.type === 'action');

	return actionNodes.map((node) => ({
		id: node.data.id as string,
		type: node.data.type as string,
		params: node.data.params as Record<string, unknown>,
		continueOnError: node.data.continueOnError as boolean | undefined,
	}));
}

/**
 * Validate that the flow represents a valid rule
 */
export function validateFlow(nodes: Node[], edges: Edge[]): string[] {
	const errors: string[] = [];
	const flowNodes = nodes as FlowNode[];

	// Must have exactly one trigger
	const triggerNodes = flowNodes.filter((n) => n.type === 'trigger');
	if (triggerNodes.length === 0) {
		errors.push('Rule must have a trigger node');
	} else if (triggerNodes.length > 1) {
		errors.push('Rule can only have one trigger node');
	}

	// Must have at least one action
	const actionNodes = flowNodes.filter((n) => n.type === 'action');
	if (actionNodes.length === 0) {
		errors.push('Rule must have at least one action node');
	}

	// Trigger must be connected
	if (triggerNodes.length === 1) {
		const triggerEdges = edges.filter((e) => e.source === triggerNodes[0].id);
		if (triggerEdges.length === 0) {
			errors.push('Trigger must be connected to at least one condition or action');
		}
	}

	// All actions must be reachable from trigger
	for (const action of actionNodes) {
		if (!isReachable(triggerNodes[0]?.id, action.id, edges)) {
			errors.push(`Action "${action.data.type}" is not connected to the trigger`);
		}
	}

	// Validate each node's data
	for (const node of flowNodes) {
		const nodeErrors = validateNodeData(node);
		errors.push(...nodeErrors);
	}

	return errors;
}

/**
 * Check if target is reachable from source via edges
 */
function isReachable(sourceId: string | undefined, targetId: string, edges: Edge[]): boolean {
	if (!sourceId) return false;
	if (sourceId === targetId) return true;

	const visited = new Set<string>();
	const queue = [sourceId];

	while (queue.length > 0) {
		const current = queue.shift()!;
		if (visited.has(current)) continue;
		visited.add(current);

		const outgoing = edges.filter((e) => e.source === current);
		for (const edge of outgoing) {
			if (edge.target === targetId) return true;
			queue.push(edge.target);
		}
	}

	return false;
}

/**
 * Validate individual node data
 */
function validateNodeData(node: FlowNode): string[] {
	const errors: string[] = [];

	switch (node.type) {
		case 'trigger':
			if (!node.data.entityType) {
				errors.push('Trigger must have an entity type');
			}
			if (!node.data.event) {
				errors.push('Trigger must have an event');
			}
			break;

		case 'condition':
			if (!node.data.field) {
				errors.push('Condition must have a field');
			}
			if (!node.data.operator) {
				errors.push('Condition must have an operator');
			}
			break;

		case 'action':
			if (!node.data.type) {
				errors.push('Action must have a type');
			}
			break;

		case 'group':
			if (!node.data.operator || !['AND', 'OR'].includes(node.data.operator as string)) {
				errors.push('Group must have a valid operator (AND/OR)');
			}
			break;
	}

	return errors;
}

/**
 * Export flow state for storage
 */
export function exportFlowState(nodes: Node[], edges: Edge[], viewport?: { x: number; y: number; zoom: number }): FlowState {
	return {
		nodes: nodes.map((n) => ({
			id: n.id,
			type: n.type as 'trigger' | 'condition' | 'action' | 'group',
			position: n.position,
			data: n.data,
		})),
		edges: edges.map((e) => ({
			id: e.id,
			source: e.source,
			target: e.target,
			sourceHandle: e.sourceHandle || undefined,
			targetHandle: e.targetHandle || undefined,
		})),
		viewport,
	};
}
