/**
 * Rule Config Helpers
 *
 * Functions for creating and manipulating RuleConfig objects.
 * These are used by both the visual and natural language rule builders
 * to maintain a single source of truth.
 */

import type {
	ActionConfig,
	Condition,
	ConditionGroup,
	ConditionOperator,
	EntityType,
	TriggerConfig,
} from '$lib/types/automation';
import { conditionFields, getActionsForEntity, isConditionGroup, triggerEvents } from '$lib/types/automation';

// =============================================================================
// Types
// =============================================================================

/**
 * Complete rule configuration (source of truth for both views)
 */
export interface RuleConfig {
	trigger: TriggerConfig;
	conditions: ConditionGroup;
	actions: ActionConfig[];
}

// =============================================================================
// ID Generation
// =============================================================================

let idCounter = 0;

/**
 * Generate a unique ID for conditions, groups, and actions
 */
export function generateId(prefix: string = 'item'): string {
	return `${prefix}-${Date.now()}-${++idCounter}`;
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a default rule configuration for a given entity type
 */
export function createDefaultRuleConfig(entityType: EntityType): RuleConfig {
	const events = triggerEvents[entityType];
	const defaultEvent = events?.[0]?.event ?? 'created';

	return {
		trigger: {
			entityType,
			event: defaultEvent,
		},
		conditions: {
			id: generateId('group'),
			operator: 'AND',
			conditions: [],
		},
		actions: [],
	};
}

/**
 * Create a rule configuration scoped to a specific account
 * Pre-populates with transaction entity type and accountId condition
 */
export function createAccountScopedRuleConfig(accountId: number): RuleConfig {
	const baseConfig = createDefaultRuleConfig('transaction');

	// Add the accountId condition to scope the rule to this account
	baseConfig.conditions.conditions.push({
		id: generateId('cond'),
		field: 'accountId',
		operator: 'equals' as ConditionOperator,
		value: accountId,
		negate: false,
	});

	return baseConfig;
}

/**
 * Create a new empty condition
 */
export function createEmptyCondition(entityType: EntityType): Condition {
	const fields = conditionFields[entityType];
	const defaultField = fields?.[0];

	return {
		id: generateId('cond'),
		field: defaultField?.field ?? '',
		operator: (defaultField?.operators[0] ?? 'equals') as ConditionOperator,
		value: '',
		negate: false,
	};
}

/**
 * Create a new empty condition group
 */
export function createEmptyConditionGroup(operator: 'AND' | 'OR' = 'AND'): ConditionGroup {
	return {
		id: generateId('group'),
		operator,
		conditions: [],
	};
}

/**
 * Create a new empty action with default values
 */
export function createEmptyAction(entityType: EntityType = 'transaction'): ActionConfig {
	const actions = getActionsForEntity(entityType);
	const defaultAction = actions[0];

	// Initialize default params for the action
	const defaultParams: Record<string, unknown> = {};
	if (defaultAction?.params) {
		for (const param of defaultAction.params) {
			if (param.default !== undefined) {
				defaultParams[param.name] = param.default;
			} else if (param.type === 'boolean') {
				defaultParams[param.name] = false;
			} else if (param.type === 'number') {
				defaultParams[param.name] = 0;
			} else {
				defaultParams[param.name] = null;
			}
		}
	}

	return {
		id: generateId('action'),
		type: defaultAction?.type ?? '',
		params: defaultParams,
		continueOnError: false,
	};
}

// =============================================================================
// Trigger Operations
// =============================================================================

/**
 * Update the trigger configuration
 */
export function updateTrigger(
	config: RuleConfig,
	updates: Partial<TriggerConfig>
): RuleConfig {
	return {
		...config,
		trigger: {
			...config.trigger,
			...updates,
		},
	};
}

// =============================================================================
// Condition Operations
// =============================================================================

/**
 * Find a condition or group by ID in the condition tree
 * Returns the item and its parent group
 */
export function findConditionById(
	group: ConditionGroup,
	id: string,
	parent: ConditionGroup | null = null
): { item: Condition | ConditionGroup; parent: ConditionGroup } | null {
	// Check if this group matches
	if (group.id === id) {
		return parent ? { item: group, parent } : null;
	}

	// Search in children
	for (const child of group.conditions) {
		if (child.id === id) {
			return { item: child, parent: group };
		}

		// Recurse into nested groups
		if (isConditionGroup(child)) {
			const found = findConditionById(child, id, group);
			if (found) return found;
		}
	}

	return null;
}

/**
 * Find a group by ID in the condition tree
 */
export function findGroupById(
	group: ConditionGroup,
	id: string
): ConditionGroup | null {
	if (group.id === id) {
		return group;
	}

	for (const child of group.conditions) {
		if (isConditionGroup(child)) {
			const found = findGroupById(child, id);
			if (found) return found;
		}
	}

	return null;
}

/**
 * Add a condition to a specific group
 */
export function addConditionToGroup(
	config: RuleConfig,
	groupId: string,
	condition: Condition
): RuleConfig {
	const newConditions = deepCloneConditionGroup(config.conditions);
	const group = findGroupById(newConditions, groupId);

	if (group) {
		group.conditions.push(condition);
	}

	return {
		...config,
		conditions: newConditions,
	};
}

/**
 * Add a nested group to a specific group
 */
export function addGroupToGroup(
	config: RuleConfig,
	parentGroupId: string,
	newGroup: ConditionGroup
): RuleConfig {
	const newConditions = deepCloneConditionGroup(config.conditions);
	const parentGroup = findGroupById(newConditions, parentGroupId);

	if (parentGroup) {
		parentGroup.conditions.push(newGroup);
	}

	return {
		...config,
		conditions: newConditions,
	};
}

/**
 * Remove a condition or group by ID
 */
export function removeConditionById(
	config: RuleConfig,
	conditionId: string
): RuleConfig {
	const newConditions = deepCloneConditionGroup(config.conditions);
	removeFromGroup(newConditions, conditionId);

	return {
		...config,
		conditions: newConditions,
	};
}

/**
 * Helper to remove an item from a group (mutates the group)
 */
function removeFromGroup(group: ConditionGroup, id: string): boolean {
	const index = group.conditions.findIndex((c) => c.id === id);
	if (index !== -1) {
		group.conditions.splice(index, 1);
		return true;
	}

	// Recurse into nested groups
	for (const child of group.conditions) {
		if (isConditionGroup(child)) {
			if (removeFromGroup(child, id)) {
				return true;
			}
		}
	}

	return false;
}

/**
 * Update a condition's properties
 */
export function updateCondition(
	config: RuleConfig,
	conditionId: string,
	updates: Partial<Condition>
): RuleConfig {
	const newConditions = deepCloneConditionGroup(config.conditions);
	updateConditionInGroup(newConditions, conditionId, updates);

	return {
		...config,
		conditions: newConditions,
	};
}

/**
 * Helper to update a condition in a group (mutates the group)
 */
function updateConditionInGroup(
	group: ConditionGroup,
	id: string,
	updates: Partial<Condition>
): boolean {
	for (let i = 0; i < group.conditions.length; i++) {
		const child = group.conditions[i];

		if (child.id === id && !isConditionGroup(child)) {
			group.conditions[i] = { ...child, ...updates, id: child.id };
			return true;
		}

		if (isConditionGroup(child)) {
			if (updateConditionInGroup(child, id, updates)) {
				return true;
			}
		}
	}

	return false;
}

/**
 * Update a group's operator (AND/OR)
 */
export function updateGroupOperator(
	config: RuleConfig,
	groupId: string,
	operator: 'AND' | 'OR'
): RuleConfig {
	const newConditions = deepCloneConditionGroup(config.conditions);
	const group = findGroupById(newConditions, groupId);

	if (group) {
		group.operator = operator;
	}

	return {
		...config,
		conditions: newConditions,
	};
}

/**
 * Move a condition within or between groups
 */
export function moveCondition(
	config: RuleConfig,
	conditionId: string,
	toGroupId: string,
	toIndex: number
): RuleConfig {
	const newConditions = deepCloneConditionGroup(config.conditions);

	// Find and remove the condition from its current location
	const found = findConditionById(newConditions, conditionId);
	if (!found) return config;

	const { item, parent } = found;
	const currentIndex = parent.conditions.findIndex((c) => c.id === conditionId);
	if (currentIndex === -1) return config;

	parent.conditions.splice(currentIndex, 1);

	// Add to the target group
	const targetGroup = findGroupById(newConditions, toGroupId);
	if (targetGroup) {
		targetGroup.conditions.splice(toIndex, 0, item);
	}

	return {
		...config,
		conditions: newConditions,
	};
}

// =============================================================================
// Action Operations
// =============================================================================

/**
 * Add an action to the rule
 */
export function addAction(config: RuleConfig, action: ActionConfig): RuleConfig {
	return {
		...config,
		actions: [...config.actions, action],
	};
}

/**
 * Remove an action by ID
 */
export function removeAction(config: RuleConfig, actionId: string): RuleConfig {
	return {
		...config,
		actions: config.actions.filter((a) => a.id !== actionId),
	};
}

/**
 * Update an action's properties
 */
export function updateAction(
	config: RuleConfig,
	actionId: string,
	updates: Partial<ActionConfig>
): RuleConfig {
	return {
		...config,
		actions: config.actions.map((action) =>
			action.id === actionId ? { ...action, ...updates, id: action.id } : action
		),
	};
}

/**
 * Move an action to a new position
 */
export function moveAction(
	config: RuleConfig,
	actionId: string,
	toIndex: number
): RuleConfig {
	const actions = [...config.actions];
	const currentIndex = actions.findIndex((a) => a.id === actionId);

	if (currentIndex === -1) return config;

	const [action] = actions.splice(currentIndex, 1);
	actions.splice(toIndex, 0, action);

	return {
		...config,
		actions,
	};
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Deep clone a condition group (for immutable updates)
 */
export function deepCloneConditionGroup(group: ConditionGroup): ConditionGroup {
	return {
		id: group.id,
		operator: group.operator,
		conditions: group.conditions.map((child) =>
			isConditionGroup(child) ? deepCloneConditionGroup(child) : { ...child }
		),
	};
}

/**
 * Count total conditions in a group (including nested)
 */
export function countConditions(group: ConditionGroup): number {
	let count = 0;

	for (const child of group.conditions) {
		if (isConditionGroup(child)) {
			count += countConditions(child);
		} else {
			count += 1;
		}
	}

	return count;
}

/**
 * Get all condition IDs in a group (including nested)
 */
export function getAllConditionIds(group: ConditionGroup): string[] {
	const ids: string[] = [group.id];

	for (const child of group.conditions) {
		if (isConditionGroup(child)) {
			ids.push(...getAllConditionIds(child));
		} else {
			ids.push(child.id);
		}
	}

	return ids;
}

/**
 * Check if a rule config has any conditions
 */
export function hasConditions(config: RuleConfig): boolean {
	return config.conditions.conditions.length > 0;
}

/**
 * Check if a rule config has any actions
 */
export function hasActions(config: RuleConfig): boolean {
	return config.actions.length > 0;
}

/**
 * Validate a rule config (basic validation)
 */
export function validateRuleConfig(config: RuleConfig): {
	valid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	// Check trigger
	if (!config.trigger.entityType) {
		errors.push('Trigger entity type is required');
	}
	if (!config.trigger.event) {
		errors.push('Trigger event is required');
	}

	// Check actions
	if (config.actions.length === 0) {
		errors.push('At least one action is required');
	}

	for (const action of config.actions) {
		if (!action.type) {
			errors.push(`Action ${action.id} is missing a type`);
		}
	}

	// Validate conditions recursively
	validateConditionGroup(config.conditions, errors);

	return {
		valid: errors.length === 0,
		errors,
	};
}

/**
 * Helper to validate a condition group
 */
function validateConditionGroup(group: ConditionGroup, errors: string[]): void {
	for (const child of group.conditions) {
		if (isConditionGroup(child)) {
			if (child.conditions.length === 0) {
				errors.push(`Group ${child.id} is empty`);
			}
			validateConditionGroup(child, errors);
		} else {
			const condition = child as Condition;
			if (!condition.field) {
				errors.push(`Condition ${condition.id} is missing a field`);
			}
			if (!condition.operator) {
				errors.push(`Condition ${condition.id} is missing an operator`);
			}
		}
	}
}

/**
 * Flatten a condition group into a list of all conditions
 */
export function flattenConditions(group: ConditionGroup): Condition[] {
	const conditions: Condition[] = [];

	for (const child of group.conditions) {
		if (isConditionGroup(child)) {
			conditions.push(...flattenConditions(child));
		} else {
			conditions.push(child);
		}
	}

	return conditions;
}
