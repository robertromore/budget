/**
 * Rule to Flow Converter
 *
 * Converts automation rule configuration into SvelteFlow nodes and edges.
 */

import type {
  ActionConfig,
  Condition,
  ConditionGroup,
  EntityType,
  FlowState,
  TriggerConfig,
} from '$lib/types/automation';
import { isConditionGroup } from '$lib/types/automation';
import type { Edge, Node } from '@xyflow/svelte';

interface RuleConfig {
	trigger: TriggerConfig;
	conditions: ConditionGroup;
	actions: ActionConfig[];
}

interface RuleToFlowOptions {
	/** Use this ID for the trigger node (to preserve positions from saved flow state) */
	triggerId?: string;
}

// Layout constants
const NODE_WIDTH = 280;
const NODE_HEIGHT = 200;
const HORIZONTAL_GAP = 100;
const VERTICAL_GAP = 80;

/**
 * Convert a rule configuration into flow nodes and edges
 */
export function ruleToFlow(rule: RuleConfig, options?: RuleToFlowOptions): { nodes: Node[]; edges: Edge[] } {
	const nodes: Node[] = [];
	const edges: Edge[] = [];
	let nodeIdCounter = 0;

	const generateId = () => `node-${++nodeIdCounter}`;

	// Create trigger node at top center
	// Use provided triggerId to preserve position mapping from saved flow state
	const triggerId = options?.triggerId || generateId();
	nodes.push({
		id: triggerId,
		type: 'trigger',
		position: { x: 400, y: 50 },
		data: {
			...rule.trigger,
			id: triggerId,
		},
	});

	// Process conditions and create nodes
	let currentY = 50 + NODE_HEIGHT + VERTICAL_GAP;
	let sourceId = triggerId;

	if (rule.conditions.conditions.length > 0) {
		const { lastNodeIds, maxY } = processConditionGroup(
			rule.conditions,
			nodes,
			edges,
			sourceId,
			400,
			currentY,
			generateId,
			rule.trigger.entityType
		);
		currentY = maxY + VERTICAL_GAP;
		sourceId = lastNodeIds[0] || triggerId;
	}

	// Create action nodes at the bottom
	const actionStartX = 400 - ((rule.actions.length - 1) * (NODE_WIDTH + HORIZONTAL_GAP)) / 2;

	rule.actions.forEach((action, index) => {
		const actionId = action.id || generateId();
		const x = actionStartX + index * (NODE_WIDTH + HORIZONTAL_GAP);

		nodes.push({
			id: actionId,
			type: 'action',
			position: { x, y: currentY },
			data: {
				...action,
				id: actionId,
				entityType: rule.trigger.entityType,
			},
		});

		// Connect from last condition/group to action
		edges.push({
			id: `edge-${sourceId}-${actionId}`,
			source: sourceId,
			target: actionId,
		});
	});

	return { nodes, edges };
}

/**
 * Process a condition group and create nodes/edges
 */
function processConditionGroup(
	group: ConditionGroup,
	nodes: Node[],
	edges: Edge[],
	parentId: string,
	centerX: number,
	startY: number,
	generateId: () => string,
	entityType: EntityType
): { lastNodeIds: string[]; maxY: number } {
	if (group.conditions.length === 0) {
		return { lastNodeIds: [parentId], maxY: startY };
	}

	// If single condition, don't create a group node
	if (group.conditions.length === 1 && !isConditionGroup(group.conditions[0])) {
		const condition = group.conditions[0] as Condition;
		const conditionId = condition.id || generateId();

		nodes.push({
			id: conditionId,
			type: 'condition',
			position: { x: centerX, y: startY },
			data: {
				...condition,
				id: conditionId,
				entityType,
			},
		});

		edges.push({
			id: `edge-${parentId}-${conditionId}`,
			source: parentId,
			target: conditionId,
		});

		return {
			lastNodeIds: [conditionId],
			maxY: startY + NODE_HEIGHT,
		};
	}

	// Create group node if multiple conditions
	const groupId = group.id || generateId();
	nodes.push({
		id: groupId,
		type: 'group',
		position: { x: centerX, y: startY },
		data: {
			id: groupId,
			operator: group.operator,
		},
	});

	edges.push({
		id: `edge-${parentId}-${groupId}`,
		source: parentId,
		target: groupId,
	});

	// Process child conditions
	const childStartY = startY + NODE_HEIGHT + VERTICAL_GAP;
	const childCount = group.conditions.length;
	const totalWidth = (childCount - 1) * (NODE_WIDTH + HORIZONTAL_GAP);
	const childStartX = centerX - totalWidth / 2;

	const lastNodeIds: string[] = [];
	let maxY = childStartY;

	group.conditions.forEach((child, index) => {
		const childX = childStartX + index * (NODE_WIDTH + HORIZONTAL_GAP);
		const handleId = index === 0 ? 'out-1' : 'out-2';

		if (isConditionGroup(child)) {
			const result = processConditionGroup(
				child,
				nodes,
				edges,
				groupId,
				childX,
				childStartY,
				generateId,
				entityType
			);
			lastNodeIds.push(...result.lastNodeIds);
			maxY = Math.max(maxY, result.maxY);
		} else {
			const condition = child as Condition;
			const conditionId = condition.id || generateId();

			nodes.push({
				id: conditionId,
				type: 'condition',
				position: { x: childX, y: childStartY },
				data: {
					...condition,
					id: conditionId,
					entityType,
				},
			});

			edges.push({
				id: `edge-${groupId}-${conditionId}`,
				source: groupId,
				target: conditionId,
				sourceHandle: handleId,
			});

			lastNodeIds.push(conditionId);
			maxY = Math.max(maxY, childStartY + NODE_HEIGHT);
		}
	});

	return { lastNodeIds, maxY };
}

/**
 * Import flow state from stored data
 */
export function importFlowState(
	flowState: FlowState | null | undefined,
	entityType: EntityType
): { nodes: Node[]; edges: Edge[] } {
	if (!flowState) {
		return { nodes: [], edges: [] };
	}

	// Restore nodes with entity type context
	const nodes: Node[] = flowState.nodes.map((n) => ({
		id: n.id,
		type: n.type,
		position: n.position,
		data: {
			...n.data,
			entityType: n.type === 'condition' || n.type === 'action' ? entityType : n.data.entityType,
		},
	}));

	// Restore edges
	const edges: Edge[] = flowState.edges.map((e) => ({
		id: e.id,
		source: e.source,
		target: e.target,
		sourceHandle: e.sourceHandle,
		targetHandle: e.targetHandle,
	}));

	return { nodes, edges };
}

/**
 * Create default nodes for a new rule
 */
export function createDefaultFlow(entityType: EntityType = 'transaction'): { nodes: Node[]; edges: Edge[] } {
	const triggerId = 'trigger-1';
	const conditionId = 'condition-1';
	const actionId = 'action-1';

	// Horizontal layout: nodes flow left to right
	const startX = 50;
	const centerY = 150;
	const spacing = NODE_WIDTH + HORIZONTAL_GAP; // 280 + 100 = 380

	const nodes: Node[] = [
		{
			id: triggerId,
			type: 'trigger',
			position: { x: startX, y: centerY },
			data: {
				id: triggerId,
				entityType,
				event: '',
			},
		},
		{
			id: conditionId,
			type: 'condition',
			position: { x: startX + spacing, y: centerY },
			data: {
				id: conditionId,
				entityType,
				field: '',
				operator: 'equals',
				value: '',
			},
		},
		{
			id: actionId,
			type: 'action',
			position: { x: startX + spacing * 2, y: centerY },
			data: {
				id: actionId,
				entityType,
				type: '',
				params: {},
			},
		},
	];

	const edges: Edge[] = [
		{
			id: `edge-${triggerId}-${conditionId}`,
			source: triggerId,
			target: conditionId,
		},
		{
			id: `edge-${conditionId}-${actionId}`,
			source: conditionId,
			target: actionId,
		},
	];

	return { nodes, edges };
}

// ============================================================================
// Layout System
// ============================================================================

/**
 * Available layout directions for the auto-layout feature
 */
export type LayoutDirection = 'vertical' | 'horizontal' | 'tree' | 'compact';

// Compact spacing constants
const COMPACT_H_GAP = 60;
const COMPACT_V_GAP = 50;

/**
 * Build adjacency list from edges
 */
function buildAdjacencyList(edges: Edge[]): Map<string, string[]> {
	const children = new Map<string, string[]>();
	edges.forEach((e) => {
		const existing = children.get(e.source) || [];
		existing.push(e.target);
		children.set(e.source, existing);
	});
	return children;
}

/**
 * Assign hierarchical levels to nodes using BFS from root
 */
function assignLevels(rootId: string, edges: Edge[]): Map<string, number> {
	const children = buildAdjacencyList(edges);
	const levels = new Map<string, number>();
	const queue = [{ id: rootId, level: 0 }];

	while (queue.length > 0) {
		const { id, level } = queue.shift()!;
		if (levels.has(id)) continue;
		levels.set(id, level);

		const childIds = children.get(id) || [];
		childIds.forEach((childId) => {
			queue.push({ id: childId, level: level + 1 });
		});
	}

	return levels;
}

/**
 * Group nodes by their hierarchical level
 */
function groupNodesByLevel(nodes: Node[], levels: Map<string, number>): Map<number, Node[]> {
	const levelGroups = new Map<number, Node[]>();
	nodes.forEach((node) => {
		const level = levels.get(node.id) || 0;
		const group = levelGroups.get(level) || [];
		group.push(node);
		levelGroups.set(level, group);
	});
	return levelGroups;
}

/**
 * Auto-layout nodes using a horizontal arrangement (left to right)
 * @deprecated Use applyLayout with a specific direction instead
 */
export function autoLayout(nodes: Node[], edges: Edge[]): Node[] {
	return layoutHorizontal(nodes, edges);
}

/**
 * Vertical layout: nodes flow from top to bottom
 */
function layoutVertical(
	nodes: Node[],
	edges: Edge[],
	hGap: number = HORIZONTAL_GAP,
	vGap: number = VERTICAL_GAP
): Node[] {
	const triggerNode = nodes.find((n) => n.type === 'trigger');
	if (!triggerNode) return nodes;

	const levels = assignLevels(triggerNode.id, edges);
	const levelGroups = groupNodesByLevel(nodes, levels);

	const updatedNodes: Node[] = [];
	const centerX = 400;

	levelGroups.forEach((group, level) => {
		const y = 50 + level * (NODE_HEIGHT + vGap);
		const totalWidth = (group.length - 1) * (NODE_WIDTH + hGap);
		const startX = centerX - totalWidth / 2;

		group.forEach((node, index) => {
			updatedNodes.push({
				...node,
				position: {
					x: startX + index * (NODE_WIDTH + hGap),
					y,
				},
			});
		});
	});

	return updatedNodes;
}

/**
 * Horizontal layout: nodes flow from left to right
 */
function layoutHorizontal(nodes: Node[], edges: Edge[]): Node[] {
	const triggerNode = nodes.find((n) => n.type === 'trigger');
	if (!triggerNode) return nodes;

	const levels = assignLevels(triggerNode.id, edges);
	const levelGroups = groupNodesByLevel(nodes, levels);

	const updatedNodes: Node[] = [];
	const centerY = 300;

	levelGroups.forEach((group, level) => {
		const x = 50 + level * (NODE_WIDTH + HORIZONTAL_GAP);
		const totalHeight = (group.length - 1) * (NODE_HEIGHT + VERTICAL_GAP);
		const startY = centerY - totalHeight / 2;

		group.forEach((node, index) => {
			updatedNodes.push({
				...node,
				position: {
					x,
					y: startY + index * (NODE_HEIGHT + VERTICAL_GAP),
				},
			});
		});
	});

	return updatedNodes;
}

/**
 * Tree layout: parent-centered branching (good for OR groups)
 * Children are positioned symmetrically around their parent's position
 */
function layoutTree(nodes: Node[], edges: Edge[]): Node[] {
	const triggerNode = nodes.find((n) => n.type === 'trigger');
	if (!triggerNode) return nodes;

	const children = buildAdjacencyList(edges);
	const positioned = new Map<string, { x: number; y: number }>();
	const updatedNodes: Node[] = [];

	// Calculate subtree widths for proper spacing
	function getSubtreeWidth(nodeId: string): number {
		const childIds = children.get(nodeId) || [];
		if (childIds.length === 0) return NODE_WIDTH;

		const childWidths = childIds.map(getSubtreeWidth);
		return Math.max(
			NODE_WIDTH,
			childWidths.reduce((sum, w) => sum + w + HORIZONTAL_GAP, -HORIZONTAL_GAP)
		);
	}

	// Position nodes recursively
	function positionNode(nodeId: string, x: number, y: number) {
		positioned.set(nodeId, { x, y });

		const childIds = children.get(nodeId) || [];
		if (childIds.length === 0) return;

		const childY = y + NODE_HEIGHT + VERTICAL_GAP;

		// Calculate total width needed for children
		const childWidths = childIds.map(getSubtreeWidth);
		const totalWidth = childWidths.reduce((sum, w) => sum + w + HORIZONTAL_GAP, -HORIZONTAL_GAP);

		// Position children centered under parent
		let currentX = x - totalWidth / 2 + childWidths[0] / 2;

		childIds.forEach((childId, index) => {
			positionNode(childId, currentX, childY);
			if (index < childIds.length - 1) {
				currentX += childWidths[index] / 2 + HORIZONTAL_GAP + childWidths[index + 1] / 2;
			}
		});
	}

	// Start from trigger at center top
	positionNode(triggerNode.id, 400, 50);

	// Create updated nodes with new positions
	nodes.forEach((node) => {
		const pos = positioned.get(node.id);
		updatedNodes.push({
			...node,
			position: pos || node.position,
		});
	});

	return updatedNodes;
}

/**
 * Compact layout: same as vertical but with tighter spacing
 */
function layoutCompact(nodes: Node[], edges: Edge[]): Node[] {
	return layoutVertical(nodes, edges, COMPACT_H_GAP, COMPACT_V_GAP);
}

/**
 * Apply a layout to nodes based on the specified direction
 */
export function applyLayout(
	nodes: Node[],
	edges: Edge[],
	direction: LayoutDirection
): Node[] {
	switch (direction) {
		case 'vertical':
			return layoutVertical(nodes, edges);
		case 'horizontal':
			return layoutHorizontal(nodes, edges);
		case 'tree':
			return layoutTree(nodes, edges);
		case 'compact':
			return layoutCompact(nodes, edges);
		default:
			return layoutVertical(nodes, edges);
	}
}
