/**
 * Custom SvelteFlow Node Types for Automation Rule Builder
 *
 * Exports all custom node components and their type definitions.
 */

export { default as ActionNode } from './action-node.svelte';
export { default as ConditionNode } from './condition-node.svelte';
export { default as GroupNode } from './group-node.svelte';
export { default as TriggerNode } from './trigger-node.svelte';

import ActionNode from './action-node.svelte';
import ConditionNode from './condition-node.svelte';
import GroupNode from './group-node.svelte';
import TriggerNode from './trigger-node.svelte';

/**
 * Node types registry for SvelteFlow
 */
export const nodeTypes = {
	trigger: TriggerNode,
	condition: ConditionNode,
	action: ActionNode,
	group: GroupNode,
} as const;

export type NodeType = keyof typeof nodeTypes;
