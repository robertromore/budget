/**
 * Condition Evaluator
 *
 * Evaluates conditions against entity data to determine if a rule should be triggered.
 * Supports nested AND/OR groups, various operators, and deep field access.
 */

import type {
  Condition,
  ConditionGroup,
  ConditionOperator,
} from "$lib/types/automation";
import { isConditionGroup } from "$lib/types/automation";

/**
 * Evaluate a condition group (AND/OR) against an entity
 */
export function evaluateConditionGroup(
  group: ConditionGroup,
  entity: Record<string, unknown>,
  context?: EvaluationContext
): boolean {
  if (group.conditions.length === 0) {
    return true; // Empty group always matches
  }

  if (group.operator === "AND") {
    return group.conditions.every((item) => evaluateConditionItem(item, entity, context));
  } else {
    return group.conditions.some((item) => evaluateConditionItem(item, entity, context));
  }
}

/**
 * Evaluate a single condition or nested group
 */
function evaluateConditionItem(
  item: Condition | ConditionGroup,
  entity: Record<string, unknown>,
  context?: EvaluationContext
): boolean {
  if (isConditionGroup(item)) {
    return evaluateConditionGroup(item, entity, context);
  }
  return evaluateCondition(item, entity, context);
}

/**
 * Evaluate a single condition against an entity
 */
export function evaluateCondition(
  condition: Condition,
  entity: Record<string, unknown>,
  context?: EvaluationContext
): boolean {
  const fieldValue = getFieldValue(entity, condition.field);
  let result = evaluateOperator(condition.operator, fieldValue, condition.value, condition.value2, context);

  // Apply negation if specified
  if (condition.negate) {
    result = !result;
  }

  return result;
}

/**
 * Get a field value from an entity, supporting dot notation for nested fields
 */
export function getFieldValue(entity: Record<string, unknown>, field: string): unknown {
  const parts = field.split(".");
  let value: unknown = entity;

  for (const part of parts) {
    if (value === null || value === undefined) {
      return undefined;
    }
    if (typeof value !== "object") {
      return undefined;
    }
    value = (value as Record<string, unknown>)[part];
  }

  return value;
}

/**
 * Evaluate an operator against a field value
 */
function evaluateOperator(
  operator: ConditionOperator,
  fieldValue: unknown,
  conditionValue: unknown,
  conditionValue2?: unknown,
  context?: EvaluationContext
): boolean {
  switch (operator) {
    case "equals":
      return equals(fieldValue, conditionValue);

    case "notEquals":
      return !equals(fieldValue, conditionValue);

    case "contains":
      return contains(fieldValue, conditionValue);

    case "startsWith":
      return startsWith(fieldValue, conditionValue);

    case "endsWith":
      return endsWith(fieldValue, conditionValue);

    case "matches":
      return matches(fieldValue, conditionValue);

    case "greaterThan":
      return greaterThan(fieldValue, conditionValue);

    case "lessThan":
      return lessThan(fieldValue, conditionValue);

    case "greaterThanOrEquals":
      return greaterThanOrEquals(fieldValue, conditionValue);

    case "lessThanOrEquals":
      return lessThanOrEquals(fieldValue, conditionValue);

    case "between":
      return between(fieldValue, conditionValue, conditionValue2);

    case "in":
      return isIn(fieldValue, conditionValue);

    case "inGroup":
      return inGroup(fieldValue, conditionValue, context);

    case "isNull":
      return fieldValue === null || fieldValue === undefined;

    case "isEmpty":
      return isEmpty(fieldValue);

    case "before":
      return before(fieldValue, conditionValue);

    case "after":
      return after(fieldValue, conditionValue);

    case "within":
      return within(fieldValue, conditionValue);

    case "dayOfWeek":
      return dayOfWeek(fieldValue, conditionValue);

    case "dayOfMonth":
      return dayOfMonth(fieldValue, conditionValue);

    default:
      console.warn(`Unknown operator: ${operator}`);
      return false;
  }
}

// =============================================================================
// Operator Implementations
// =============================================================================

function equals(a: unknown, b: unknown): boolean {
  // Handle case-insensitive string comparison
  if (typeof a === "string" && typeof b === "string") {
    return a.toLowerCase() === b.toLowerCase();
  }
  // Handle number comparison with type coercion
  if (typeof a === "number" || typeof b === "number") {
    return Number(a) === Number(b);
  }
  return a === b;
}

function contains(fieldValue: unknown, searchValue: unknown): boolean {
  if (typeof fieldValue !== "string" || typeof searchValue !== "string") {
    return false;
  }
  return fieldValue.toLowerCase().includes(searchValue.toLowerCase());
}

function startsWith(fieldValue: unknown, searchValue: unknown): boolean {
  if (typeof fieldValue !== "string" || typeof searchValue !== "string") {
    return false;
  }
  return fieldValue.toLowerCase().startsWith(searchValue.toLowerCase());
}

function endsWith(fieldValue: unknown, searchValue: unknown): boolean {
  if (typeof fieldValue !== "string" || typeof searchValue !== "string") {
    return false;
  }
  return fieldValue.toLowerCase().endsWith(searchValue.toLowerCase());
}

function matches(fieldValue: unknown, pattern: unknown): boolean {
  if (typeof fieldValue !== "string" || typeof pattern !== "string") {
    return false;
  }
  try {
    const regex = new RegExp(pattern, "i");
    return regex.test(fieldValue);
  } catch {
    console.warn(`Invalid regex pattern: ${pattern}`);
    return false;
  }
}

function greaterThan(a: unknown, b: unknown): boolean {
  const numA = toNumber(a);
  const numB = toNumber(b);
  if (numA === null || numB === null) return false;
  return numA > numB;
}

function lessThan(a: unknown, b: unknown): boolean {
  const numA = toNumber(a);
  const numB = toNumber(b);
  if (numA === null || numB === null) return false;
  return numA < numB;
}

function greaterThanOrEquals(a: unknown, b: unknown): boolean {
  const numA = toNumber(a);
  const numB = toNumber(b);
  if (numA === null || numB === null) return false;
  return numA >= numB;
}

function lessThanOrEquals(a: unknown, b: unknown): boolean {
  const numA = toNumber(a);
  const numB = toNumber(b);
  if (numA === null || numB === null) return false;
  return numA <= numB;
}

function between(fieldValue: unknown, min: unknown, max: unknown): boolean {
  const numValue = toNumber(fieldValue);
  const numMin = toNumber(min);
  const numMax = toNumber(max);
  if (numValue === null || numMin === null || numMax === null) return false;
  return numValue >= numMin && numValue <= numMax;
}

function isIn(fieldValue: unknown, list: unknown): boolean {
  if (!Array.isArray(list)) return false;

  // Handle case-insensitive string comparison
  if (typeof fieldValue === "string") {
    const lowerValue = fieldValue.toLowerCase();
    return list.some((item) =>
      typeof item === "string" ? item.toLowerCase() === lowerValue : item === fieldValue
    );
  }

  return list.includes(fieldValue);
}

function inGroup(
  categoryId: unknown,
  groupId: unknown,
  context?: EvaluationContext
): boolean {
  // This requires access to category hierarchy data
  // The context should provide a function to check category membership
  if (!context?.checkCategoryInGroup) {
    console.warn("inGroup operator requires checkCategoryInGroup in context");
    return false;
  }
  const catId = toNumber(categoryId);
  const grpId = toNumber(groupId);
  if (catId === null || grpId === null) return false;
  return context.checkCategoryInGroup(catId, grpId);
}

function isEmpty(fieldValue: unknown): boolean {
  if (fieldValue === null || fieldValue === undefined) return true;
  if (typeof fieldValue === "string") return fieldValue.trim() === "";
  if (Array.isArray(fieldValue)) return fieldValue.length === 0;
  return false;
}

function before(dateValue: unknown, compareDate: unknown): boolean {
  const date1 = toDate(dateValue);
  const date2 = toDate(compareDate);
  if (!date1 || !date2) return false;
  return date1 < date2;
}

function after(dateValue: unknown, compareDate: unknown): boolean {
  const date1 = toDate(dateValue);
  const date2 = toDate(compareDate);
  if (!date1 || !date2) return false;
  return date1 > date2;
}

function within(dateValue: unknown, days: unknown): boolean {
  const date = toDate(dateValue);
  const numDays = toNumber(days);
  if (!date || numDays === null) return false;

  const now = new Date();
  const futureDate = new Date(now);
  futureDate.setDate(now.getDate() + numDays);

  return date >= now && date <= futureDate;
}

function dayOfWeek(dateValue: unknown, allowedDays: unknown): boolean {
  const date = toDate(dateValue);
  if (!date || !Array.isArray(allowedDays)) return false;

  // Use UTC methods to avoid timezone issues with date strings like "2024-01-15"
  const dayNum = date.getUTCDay(); // 0-6, Sunday is 0
  // Convert day numbers to names for comparison
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dayName = dayNames[dayNum];

  return allowedDays.some((day) =>
    typeof day === "string" ? day.toLowerCase() === dayName : day === dayNum
  );
}

function dayOfMonth(dateValue: unknown, day: unknown): boolean {
  const date = toDate(dateValue);
  const numDay = toNumber(day);
  if (!date || numDay === null) return false;
  // Use UTC methods to avoid timezone issues with date strings
  return date.getUTCDate() === numDay;
}

// =============================================================================
// Helper Functions
// =============================================================================

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && !isNaN(value)) return value;
  if (typeof value === "string") {
    const num = parseFloat(value);
    if (!isNaN(num)) return num;
  }
  return null;
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    if (!isNaN(date.getTime())) return date;
  }
  return null;
}

// =============================================================================
// Types
// =============================================================================

/**
 * Context provided during condition evaluation
 */
export interface EvaluationContext {
  /** Check if a category belongs to a group */
  checkCategoryInGroup?: (categoryId: number, groupId: number) => boolean;
  /** Additional context data */
  [key: string]: unknown;
}
