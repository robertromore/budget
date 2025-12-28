/**
 * Automation Test Helpers
 *
 * Factory functions and utilities for testing the automation system.
 */

import type {
  ActionConfig,
  Condition,
  ConditionGroup,
  ConditionOperator,
  EntityType,
  TriggerConfig,
  RuleEvent,
  ActionResult,
} from "$lib/types/automation";
import type { EvaluationContext } from "$lib/server/domains/automation/condition-evaluator";

// =============================================================================
// Condition Builders
// =============================================================================

/**
 * Create a test condition with sensible defaults
 */
export function createTestCondition(
  field: string,
  operator: ConditionOperator,
  value: unknown,
  overrides?: Partial<Condition>
): Condition {
  return {
    id: `condition-${Math.random().toString(36).slice(2, 8)}`,
    field,
    operator,
    value,
    ...overrides,
  };
}

/**
 * Create a condition group with AND/OR logic
 */
export function createTestConditionGroup(
  operator: "AND" | "OR",
  conditions: (Condition | ConditionGroup)[],
  overrides?: Partial<ConditionGroup>
): ConditionGroup {
  return {
    id: `group-${Math.random().toString(36).slice(2, 8)}`,
    operator,
    conditions,
    ...overrides,
  };
}

/**
 * Create an empty condition group
 */
export function createEmptyConditionGroup(operator: "AND" | "OR" = "AND"): ConditionGroup {
  return createTestConditionGroup(operator, []);
}

// =============================================================================
// Action Builders
// =============================================================================

/**
 * Create a test action with sensible defaults
 */
export function createTestAction(
  type: string,
  params?: Record<string, unknown>,
  overrides?: Partial<ActionConfig>
): ActionConfig {
  return {
    id: `action-${Math.random().toString(36).slice(2, 8)}`,
    type,
    params: params || {},
    ...overrides,
  };
}

// =============================================================================
// Trigger Builders
// =============================================================================

/**
 * Create a test trigger configuration
 */
export function createTestTrigger(
  entityType: EntityType,
  event: string,
  overrides?: Partial<TriggerConfig>
): TriggerConfig {
  return {
    entityType,
    event,
    ...overrides,
  };
}

// =============================================================================
// Entity Builders
// =============================================================================

/**
 * Create a test transaction entity
 */
export function createTestTransaction(
  overrides?: Partial<{
    id: number;
    amount: number;
    date: string;
    status: string;
    notes: string;
    payeeId: number | null;
    categoryId: number | null;
    accountId: number;
    isTransfer: boolean;
    originalPayeeName: string;
    importedFrom: string | null;
    payee: { name: string } | null;
    category: { name: string; groupId: number } | null;
  }>
): Record<string, unknown> {
  return {
    id: 1,
    amount: -50.00,
    date: "2024-01-15",
    status: "pending",
    notes: "",
    payeeId: 1,
    categoryId: 1,
    accountId: 1,
    isTransfer: false,
    originalPayeeName: "AMAZON.COM",
    importedFrom: null,
    payee: { name: "Amazon" },
    category: { name: "Shopping", groupId: 1 },
    ...overrides,
  };
}

/**
 * Create a test account entity
 */
export function createTestAccount(
  overrides?: Partial<{
    id: number;
    name: string;
    type: string;
    balance: number;
    isClosed: boolean;
  }>
): Record<string, unknown> {
  return {
    id: 1,
    name: "Checking Account",
    type: "checking",
    balance: 1500.00,
    isClosed: false,
    ...overrides,
  };
}

/**
 * Create a test payee entity
 */
export function createTestPayee(
  overrides?: Partial<{
    id: number;
    name: string;
    transactionCount: number;
    defaultCategoryId: number | null;
    isSubscription: boolean;
    avgAmount: number;
  }>
): Record<string, unknown> {
  return {
    id: 1,
    name: "Amazon",
    transactionCount: 25,
    defaultCategoryId: 5,
    isSubscription: false,
    avgAmount: 75.50,
    ...overrides,
  };
}

/**
 * Create a test category entity
 */
export function createTestCategory(
  overrides?: Partial<{
    id: number;
    name: string;
    groupId: number | null;
    monthlyTotal: number;
    isHidden: boolean;
    isTaxDeductible: boolean;
  }>
): Record<string, unknown> {
  return {
    id: 1,
    name: "Shopping",
    groupId: 1,
    monthlyTotal: 250.00,
    isHidden: false,
    isTaxDeductible: false,
    ...overrides,
  };
}

/**
 * Create a test schedule entity
 */
export function createTestSchedule(
  overrides?: Partial<{
    id: number;
    amount: number;
    frequency: string;
    nextOccurrence: string;
    autoAdd: boolean;
    payeeId: number | null;
  }>
): Record<string, unknown> {
  return {
    id: 1,
    amount: -100.00,
    frequency: "monthly",
    nextOccurrence: "2024-02-01",
    autoAdd: true,
    payeeId: 1,
    ...overrides,
  };
}

/**
 * Create a test budget entity
 */
export function createTestBudget(
  overrides?: Partial<{
    id: number;
    type: string;
    spent: number;
    remaining: number;
    percentUsed: number;
    targetAmount: number;
  }>
): Record<string, unknown> {
  return {
    id: 1,
    type: "category-envelope",
    spent: 150.00,
    remaining: 50.00,
    percentUsed: 75,
    targetAmount: 200.00,
    ...overrides,
  };
}

// =============================================================================
// Evaluation Context Builders
// =============================================================================

/**
 * Create a test evaluation context with category hierarchy
 */
export function createTestEvaluationContext(
  categoryGroups?: Map<number, number[]>,
  overrides?: Partial<EvaluationContext>
): EvaluationContext {
  const groups = categoryGroups || new Map([
    [1, [1, 2, 3]], // Group 1 contains categories 1, 2, 3
    [2, [4, 5, 6]], // Group 2 contains categories 4, 5, 6
  ]);

  return {
    checkCategoryInGroup: (categoryId: number, groupId: number) => {
      const categoriesInGroup = groups.get(groupId);
      return categoriesInGroup?.includes(categoryId) ?? false;
    },
    ...overrides,
  };
}

// =============================================================================
// Rule Event Builders
// =============================================================================

/**
 * Create a test rule event
 */
export function createTestRuleEvent<T = unknown>(
  entityType: EntityType,
  event: string,
  entity: T,
  overrides?: Partial<RuleEvent<T>>
): RuleEvent<T> {
  return {
    entityType,
    event,
    workspaceId: 1,
    entity,
    timestamp: new Date(),
    ...overrides,
  };
}

// =============================================================================
// Action Result Builders
// =============================================================================

/**
 * Create a test action result
 */
export function createTestActionResult(
  actionId: string,
  actionType: string,
  success: boolean,
  overrides?: Partial<ActionResult>
): ActionResult {
  return {
    actionId,
    actionType,
    success,
    ...overrides,
  };
}

// =============================================================================
// Assertion Helpers
// =============================================================================

/**
 * Assert that a rule matches an entity
 */
export function assertConditionEvaluates(
  result: boolean,
  expected: boolean,
  description?: string
): void {
  if (result !== expected) {
    throw new Error(
      `Condition evaluation failed: expected ${expected}, got ${result}${
        description ? ` (${description})` : ""
      }`
    );
  }
}

/**
 * Assert action result matches expected outcome
 */
export function assertActionResult(
  result: ActionResult,
  expected: Partial<ActionResult>
): void {
  if (expected.success !== undefined && result.success !== expected.success) {
    throw new Error(
      `Action result success mismatch: expected ${expected.success}, got ${result.success}`
    );
  }
  if (expected.error !== undefined && result.error !== expected.error) {
    throw new Error(
      `Action result error mismatch: expected "${expected.error}", got "${result.error}"`
    );
  }
}

// =============================================================================
// Date Helpers
// =============================================================================

/**
 * Create a date string in ISO format
 */
export function createDateString(
  year: number,
  month: number,
  day: number
): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Create a date relative to today
 */
export function createRelativeDate(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split("T")[0];
}

/**
 * Get the day of week (0-6, Sunday is 0) for a date string
 */
export function getDayOfWeek(dateString: string): number {
  return new Date(dateString).getDay();
}
