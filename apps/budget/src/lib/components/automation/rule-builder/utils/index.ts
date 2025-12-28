/**
 * Rule Builder Utilities
 *
 * Export all utility functions for flow/rule conversion and config manipulation.
 */

export {
  exportFlowState, flowToRule,
  validateFlow
} from './flow-to-rule';

export {
  applyLayout,
  autoLayout,
  createDefaultFlow,
  importFlowState,
  ruleToFlow,
  type LayoutDirection,
} from './rule-to-flow';

export {
  // Types
  type RuleConfig,
  // Factory functions
  createDefaultRuleConfig,
  createEmptyAction,
  createEmptyCondition,
  createEmptyConditionGroup,
  generateId,
  // Trigger operations
  updateTrigger,
  // Condition operations
  addConditionToGroup,
  addGroupToGroup,
  findConditionById,
  findGroupById,
  moveCondition,
  removeConditionById,
  updateCondition,
  updateGroupOperator,
  // Action operations
  addAction,
  moveAction,
  removeAction,
  updateAction,
  // Utility functions
  countConditions,
  deepCloneConditionGroup,
  flattenConditions,
  getAllConditionIds,
  hasActions,
  hasConditions,
  validateRuleConfig,
} from './rule-config-helpers';
