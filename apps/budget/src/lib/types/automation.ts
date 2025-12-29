/**
 * Automation System Type Definitions
 *
 * Types for the rule-based automation system including
 * triggers, conditions, actions, and the visual flow editor.
 */

// =============================================================================
// Entity Types
// =============================================================================

/**
 * Entity types that can trigger automation rules
 */
export type EntityType =
  | "transaction"
  | "account"
  | "payee"
  | "category"
  | "schedule"
  | "budget";

export const entityTypes: { value: EntityType; label: string }[] = [
  { value: "transaction", label: "Transaction" },
  { value: "account", label: "Account" },
  { value: "payee", label: "Payee" },
  { value: "category", label: "Category" },
  { value: "schedule", label: "Schedule" },
  { value: "budget", label: "Budget" },
];

/**
 * Get entity type label by value
 */
export function getEntityTypeLabel(entityType: EntityType): string {
  return entityTypes.find((t) => t.value === entityType)?.label || entityType;
}

// =============================================================================
// Trigger Events
// =============================================================================

/**
 * Events that can trigger rule evaluation
 */
export interface TriggerEvent {
  entityType: EntityType;
  event: string;
  label: string;
  description: string;
}

/**
 * Events by entity type
 */
export const triggerEvents: Record<EntityType, TriggerEvent[]> = {
  transaction: [
    { entityType: "transaction", event: "created", label: "Created", description: "New transaction added (manual, import, or scheduled)" },
    { entityType: "transaction", event: "updated", label: "Updated", description: "Transaction fields modified" },
    { entityType: "transaction", event: "deleted", label: "Deleted", description: "Transaction removed" },
    { entityType: "transaction", event: "imported", label: "Imported", description: "Transaction created via import" },
    { entityType: "transaction", event: "categorized", label: "Categorized", description: "Category assigned to transaction" },
    { entityType: "transaction", event: "cleared", label: "Cleared", description: "Status changed to cleared" },
  ],
  account: [
    { entityType: "account", event: "created", label: "Created", description: "New account added" },
    { entityType: "account", event: "updated", label: "Updated", description: "Account settings changed" },
    { entityType: "account", event: "balanceChanged", label: "Balance Changed", description: "Balance updated after transaction" },
    { entityType: "account", event: "reconciled", label: "Reconciled", description: "Account marked as reconciled" },
  ],
  payee: [
    { entityType: "payee", event: "created", label: "Created", description: "New payee added" },
    { entityType: "payee", event: "updated", label: "Updated", description: "Payee details changed" },
    { entityType: "payee", event: "merged", label: "Merged", description: "Payee merged with another" },
  ],
  category: [
    { entityType: "category", event: "created", label: "Created", description: "New category added" },
    { entityType: "category", event: "updated", label: "Updated", description: "Category details changed" },
    { entityType: "category", event: "spendingThresholdReached", label: "Spending Threshold", description: "Monthly spending hits threshold" },
  ],
  schedule: [
    { entityType: "schedule", event: "created", label: "Created", description: "New schedule added" },
    { entityType: "schedule", event: "due", label: "Due", description: "Scheduled occurrence is due" },
    { entityType: "schedule", event: "executed", label: "Executed", description: "Auto-add created transaction" },
    { entityType: "schedule", event: "skipped", label: "Skipped", description: "Occurrence was skipped" },
  ],
  budget: [
    { entityType: "budget", event: "created", label: "Created", description: "New budget added" },
    { entityType: "budget", event: "updated", label: "Updated", description: "Budget settings changed" },
    { entityType: "budget", event: "overspent", label: "Overspent", description: "Spending exceeded budget" },
    { entityType: "budget", event: "threshold", label: "Threshold Reached", description: "Spending hit warning threshold" },
    { entityType: "budget", event: "periodReset", label: "Period Reset", description: "New budget period started" },
  ],
};

/**
 * Trigger configuration stored in the rule
 */
export interface TriggerConfig {
  entityType: EntityType;
  event: string;
  debounceMs?: number; // Prevent rapid re-triggering
}

// =============================================================================
// Condition Fields
// =============================================================================

/**
 * Field definition for condition building
 */
export interface ConditionField {
  field: string;
  label: string;
  type: "string" | "number" | "boolean" | "date" | "enum" | "reference";
  operators: ConditionOperator[];
  enumValues?: string[]; // For enum type
  referenceType?: string; // For reference type (e.g., "category", "payee")
}

/**
 * Condition fields by entity type
 */
export const conditionFields: Record<EntityType, ConditionField[]> = {
  transaction: [
    { field: "amount", label: "Amount", type: "number", operators: ["equals", "notEquals", "greaterThan", "lessThan", "greaterThanOrEquals", "lessThanOrEquals", "between"] },
    { field: "date", label: "Date", type: "date", operators: ["equals", "before", "after", "between", "dayOfWeek", "dayOfMonth"] },
    { field: "status", label: "Status", type: "enum", operators: ["equals", "notEquals", "in"], enumValues: ["cleared", "pending", "scheduled"] },
    { field: "notes", label: "Notes", type: "string", operators: ["contains", "startsWith", "endsWith", "matches", "isEmpty", "isNull"] },
    { field: "payeeId", label: "Payee", type: "reference", operators: ["equals", "notEquals", "isNull", "in"], referenceType: "payee" },
    { field: "payee.name", label: "Payee Name", type: "string", operators: ["contains", "startsWith", "endsWith", "matches"] },
    { field: "categoryId", label: "Category", type: "reference", operators: ["equals", "notEquals", "isNull", "in", "inGroup"], referenceType: "category" },
    { field: "accountId", label: "Account", type: "reference", operators: ["equals", "notEquals", "in"], referenceType: "account" },
    { field: "isTransfer", label: "Is Transfer", type: "boolean", operators: ["equals"] },
    { field: "originalPayeeName", label: "Original Payee Name", type: "string", operators: ["contains", "startsWith", "endsWith", "matches"] },
    { field: "importedFrom", label: "Imported From", type: "string", operators: ["contains", "equals", "isNull"] },
  ],
  account: [
    { field: "balance", label: "Balance", type: "number", operators: ["equals", "notEquals", "greaterThan", "lessThan", "greaterThanOrEquals", "lessThanOrEquals", "between"] },
    { field: "type", label: "Type", type: "enum", operators: ["equals", "notEquals", "in"], enumValues: ["checking", "savings", "credit", "cash", "investment", "loan", "other"] },
    { field: "name", label: "Name", type: "string", operators: ["contains", "startsWith", "endsWith"] },
    { field: "isClosed", label: "Is Closed", type: "boolean", operators: ["equals"] },
  ],
  payee: [
    { field: "name", label: "Name", type: "string", operators: ["contains", "startsWith", "endsWith", "matches"] },
    { field: "transactionCount", label: "Transaction Count", type: "number", operators: ["equals", "greaterThan", "lessThan", "greaterThanOrEquals", "lessThanOrEquals"] },
    { field: "defaultCategoryId", label: "Default Category", type: "reference", operators: ["equals", "notEquals", "isNull"], referenceType: "category" },
    { field: "isSubscription", label: "Is Subscription", type: "boolean", operators: ["equals"] },
    { field: "avgAmount", label: "Average Amount", type: "number", operators: ["greaterThan", "lessThan", "between"] },
  ],
  category: [
    { field: "name", label: "Name", type: "string", operators: ["contains", "startsWith", "endsWith"] },
    { field: "groupId", label: "Category Group", type: "reference", operators: ["equals", "notEquals", "in"], referenceType: "categoryGroup" },
    { field: "monthlyTotal", label: "Monthly Total", type: "number", operators: ["greaterThan", "lessThan", "greaterThanOrEquals", "lessThanOrEquals", "between"] },
    { field: "isHidden", label: "Is Hidden", type: "boolean", operators: ["equals"] },
    { field: "isTaxDeductible", label: "Is Tax Deductible", type: "boolean", operators: ["equals"] },
  ],
  schedule: [
    { field: "amount", label: "Amount", type: "number", operators: ["equals", "greaterThan", "lessThan", "between"] },
    { field: "frequency", label: "Frequency", type: "enum", operators: ["equals", "in"], enumValues: ["daily", "weekly", "biweekly", "monthly", "quarterly", "yearly"] },
    { field: "nextOccurrence", label: "Next Occurrence", type: "date", operators: ["before", "after", "within"] },
    { field: "autoAdd", label: "Auto Add", type: "boolean", operators: ["equals"] },
    { field: "payeeId", label: "Payee", type: "reference", operators: ["equals", "notEquals"], referenceType: "payee" },
  ],
  budget: [
    { field: "type", label: "Type", type: "enum", operators: ["equals"], enumValues: ["account-monthly", "category-envelope", "goal-based"] },
    { field: "spent", label: "Spent", type: "number", operators: ["greaterThan", "lessThan", "greaterThanOrEquals", "lessThanOrEquals", "between"] },
    { field: "remaining", label: "Remaining", type: "number", operators: ["greaterThan", "lessThan", "greaterThanOrEquals", "lessThanOrEquals"] },
    { field: "percentUsed", label: "Percent Used", type: "number", operators: ["greaterThan", "lessThan", "greaterThanOrEquals", "lessThanOrEquals"] },
    { field: "targetAmount", label: "Target Amount", type: "number", operators: ["equals", "greaterThan", "lessThan"] },
  ],
};

// =============================================================================
// Condition Operators
// =============================================================================

/**
 * Available condition operators
 */
export type ConditionOperator =
  | "equals"
  | "notEquals"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "matches" // Regex
  | "greaterThan"
  | "lessThan"
  | "greaterThanOrEquals"
  | "lessThanOrEquals"
  | "between"
  | "in"
  | "inGroup" // For category hierarchy
  | "isNull"
  | "isEmpty"
  | "before" // Date
  | "after" // Date
  | "within" // Date
  | "dayOfWeek" // Date
  | "dayOfMonth"; // Date

/**
 * Operator metadata
 */
export interface OperatorInfo {
  operator: ConditionOperator;
  label: string;
  description: string;
  valueCount: 0 | 1 | 2; // How many values needed
  valueType?: "string" | "number" | "boolean" | "date" | "array";
}

export const operatorInfo: Record<ConditionOperator, OperatorInfo> = {
  equals: { operator: "equals", label: "equals", description: "Exactly matches value", valueCount: 1 },
  notEquals: { operator: "notEquals", label: "does not equal", description: "Does not match value", valueCount: 1 },
  contains: { operator: "contains", label: "contains", description: "Contains substring", valueCount: 1, valueType: "string" },
  startsWith: { operator: "startsWith", label: "starts with", description: "Starts with substring", valueCount: 1, valueType: "string" },
  endsWith: { operator: "endsWith", label: "ends with", description: "Ends with substring", valueCount: 1, valueType: "string" },
  matches: { operator: "matches", label: "matches regex", description: "Matches regular expression", valueCount: 1, valueType: "string" },
  greaterThan: { operator: "greaterThan", label: "greater than", description: "Greater than value", valueCount: 1, valueType: "number" },
  lessThan: { operator: "lessThan", label: "less than", description: "Less than value", valueCount: 1, valueType: "number" },
  greaterThanOrEquals: { operator: "greaterThanOrEquals", label: "greater than or equals", description: "Greater than or equal to value", valueCount: 1, valueType: "number" },
  lessThanOrEquals: { operator: "lessThanOrEquals", label: "less than or equals", description: "Less than or equal to value", valueCount: 1, valueType: "number" },
  between: { operator: "between", label: "between", description: "Between two values", valueCount: 2 },
  in: { operator: "in", label: "is one of", description: "Is one of the listed values", valueCount: 1, valueType: "array" },
  inGroup: { operator: "inGroup", label: "is in group", description: "Category is in group", valueCount: 1 },
  isNull: { operator: "isNull", label: "is empty", description: "Value is null/undefined", valueCount: 0 },
  isEmpty: { operator: "isEmpty", label: "is blank", description: "String is empty or whitespace", valueCount: 0 },
  before: { operator: "before", label: "before", description: "Date is before", valueCount: 1, valueType: "date" },
  after: { operator: "after", label: "after", description: "Date is after", valueCount: 1, valueType: "date" },
  within: { operator: "within", label: "within", description: "Date is within N days", valueCount: 1, valueType: "number" },
  dayOfWeek: { operator: "dayOfWeek", label: "day of week", description: "Day of week matches", valueCount: 1, valueType: "array" },
  dayOfMonth: { operator: "dayOfMonth", label: "day of month", description: "Day of month matches", valueCount: 1, valueType: "number" },
};

// =============================================================================
// Condition Structures
// =============================================================================

/**
 * A single condition
 */
export interface Condition {
  id: string; // Unique ID for the condition (for flow nodes)
  field: string; // e.g., "amount", "payee.name"
  operator: ConditionOperator;
  value: unknown; // Depends on operator
  value2?: unknown; // For "between" operator
  negate?: boolean; // NOT this condition
}

/**
 * Condition group with AND/OR logic
 */
export interface ConditionGroup {
  id: string; // Unique ID for the group (for flow nodes)
  operator: "AND" | "OR";
  conditions: (Condition | ConditionGroup)[];
}

/**
 * Type guard for Condition vs ConditionGroup
 */
export function isConditionGroup(
  item: Condition | ConditionGroup
): item is ConditionGroup {
  return "operator" in item && (item.operator === "AND" || item.operator === "OR");
}

// =============================================================================
// Actions
// =============================================================================

/**
 * Action definition
 */
export interface ActionDefinition {
  type: string;
  label: string;
  description: string;
  entityTypes: EntityType[]; // Which entities this action applies to
  params: ActionParam[];
}

/**
 * Action parameter definition
 */
export interface ActionParam {
  name: string;
  label: string;
  type: "string" | "number" | "boolean" | "reference" | "enum" | "text";
  required: boolean;
  referenceType?: string; // For reference type
  enumValues?: string[]; // For enum type
  default?: unknown;
  placeholder?: string; // Placeholder text for inputs
  description?: string; // Help text shown below the input
}

/**
 * Available actions by entity type
 */
export const actionDefinitions: ActionDefinition[] = [
  // Transaction actions
  { type: "setCategory", label: "Set Category", description: "Assign a specific category", entityTypes: ["transaction"], params: [{ name: "categoryId", label: "Category", type: "reference", required: true, referenceType: "category" }] },
  { type: "setPayee", label: "Set Payee", description: "Assign a specific payee", entityTypes: ["transaction"], params: [{ name: "payeeId", label: "Payee", type: "reference", required: true, referenceType: "payee" }] },
  { type: "setStatus", label: "Set Status", description: "Change transaction status", entityTypes: ["transaction"], params: [{ name: "status", label: "Status", type: "enum", required: true, enumValues: ["cleared", "pending", "scheduled"] }] },
  { type: "appendNotes", label: "Append to Notes", description: "Add text to notes field", entityTypes: ["transaction"], params: [{ name: "text", label: "Text", type: "string", required: true }] },
  { type: "setNotes", label: "Set Notes", description: "Replace notes field", entityTypes: ["transaction"], params: [{ name: "text", label: "Text", type: "string", required: true }] },
  { type: "markReviewed", label: "Mark Reviewed", description: "Flag as reviewed", entityTypes: ["transaction"], params: [] },
  { type: "assignToBudget", label: "Assign to Budget", description: "Allocate to specific budget", entityTypes: ["transaction"], params: [{ name: "budgetId", label: "Budget", type: "reference", required: true, referenceType: "budget" }] },
  { type: "createPayeeAlias", label: "Create Payee Alias", description: "Create payee alias mapping", entityTypes: ["transaction"], params: [{ name: "payeeId", label: "Payee", type: "reference", required: true, referenceType: "payee" }] },
  { type: "createCategoryAlias", label: "Create Category Alias", description: "Create category alias mapping", entityTypes: ["transaction"], params: [{ name: "categoryId", label: "Category", type: "reference", required: true, referenceType: "category" }] },

  // Account actions
  { type: "updateAccountNotes", label: "Update Notes", description: "Update account notes", entityTypes: ["account"], params: [{ name: "text", label: "Text", type: "string", required: true }] },
  { type: "setAccountDefaultCategory", label: "Set Default Category", description: "Set default transaction category", entityTypes: ["account"], params: [{ name: "categoryId", label: "Category", type: "reference", required: true, referenceType: "category" }] },
  { type: "closeAccount", label: "Close Account", description: "Mark account as closed", entityTypes: ["account"], params: [] },

  // Payee actions
  { type: "setPayeeDefaultCategory", label: "Set Default Category", description: "Set default category for payee", entityTypes: ["payee"], params: [{ name: "categoryId", label: "Category", type: "reference", required: true, referenceType: "category" }] },
  { type: "setIsSubscription", label: "Set Subscription", description: "Mark as subscription", entityTypes: ["payee"], params: [{ name: "isSubscription", label: "Is Subscription", type: "boolean", required: true }] },
  { type: "mergePayee", label: "Merge With", description: "Merge into another payee", entityTypes: ["payee"], params: [{ name: "targetPayeeId", label: "Target Payee", type: "reference", required: true, referenceType: "payee" }] },
  { type: "createPayeeAliasFromPayee", label: "Create Alias", description: "Add alias for this payee", entityTypes: ["payee"], params: [{ name: "aliasName", label: "Alias Name", type: "string", required: true }] },

  // Category actions
  { type: "setCategoryHidden", label: "Set Hidden", description: "Hide/unhide category", entityTypes: ["category"], params: [{ name: "isHidden", label: "Hidden", type: "boolean", required: true }] },
  { type: "setCategoryTaxDeductible", label: "Set Tax Deductible", description: "Mark as tax deductible", entityTypes: ["category"], params: [{ name: "isTaxDeductible", label: "Tax Deductible", type: "boolean", required: true }] },
  { type: "moveCategoryToGroup", label: "Move to Group", description: "Move to different group", entityTypes: ["category"], params: [{ name: "groupId", label: "Group", type: "reference", required: true, referenceType: "categoryGroup" }] },

  // Schedule actions
  { type: "enableScheduleAutoAdd", label: "Enable Auto Add", description: "Enable/disable auto-add", entityTypes: ["schedule"], params: [{ name: "autoAdd", label: "Auto Add", type: "boolean", required: true }] },
  { type: "skipSchedule", label: "Skip", description: "Skip next occurrence", entityTypes: ["schedule"], params: [{ name: "reason", label: "Reason", type: "string", required: false }] },
  { type: "adjustScheduleAmount", label: "Adjust Amount", description: "Update scheduled amount", entityTypes: ["schedule"], params: [{ name: "amount", label: "Amount", type: "number", required: true }] },
  { type: "pauseSchedule", label: "Pause", description: "Pause schedule", entityTypes: ["schedule"], params: [] },
  { type: "resumeSchedule", label: "Resume", description: "Resume paused schedule", entityTypes: ["schedule"], params: [] },

  // Budget actions
  { type: "adjustBudgetLimit", label: "Adjust Limit", description: "Change budget limit", entityTypes: ["budget"], params: [{ name: "amount", label: "Amount", type: "number", required: true }] },
  { type: "rolloverBudget", label: "Rollover Balance", description: "Carry unused to next period", entityTypes: ["budget"], params: [] },
  { type: "pauseBudget", label: "Pause Budget", description: "Pause budget tracking", entityTypes: ["budget"], params: [] },

  // Universal actions
  { type: "sendNotification", label: "Send Notification", description: "Send alert/notification", entityTypes: ["transaction", "account", "payee", "category", "schedule", "budget"], params: [{ name: "message", label: "Message", type: "string", required: true }] },
];

/**
 * Get actions available for a specific entity type
 */
export function getActionsForEntity(entityType: EntityType): ActionDefinition[] {
  return actionDefinitions.filter((action) =>
    action.entityTypes.includes(entityType)
  );
}

/**
 * Get the label for an action type
 */
export function getActionLabel(actionType: string): string {
  const action = actionDefinitions.find((a) => a.type === actionType);
  return action?.label || actionType;
}

/**
 * Action configuration stored in the rule
 */
export interface ActionConfig {
  id: string; // Unique ID for the action (for flow nodes)
  type: string; // e.g., "setCategory", "appendNotes"
  params: Record<string, unknown>;
  continueOnError?: boolean;
}

/**
 * Result of executing an action
 */
export interface ActionResult {
  actionId: string;
  actionType: string;
  success: boolean;
  error?: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
}

// =============================================================================
// SvelteFlow State
// =============================================================================

/**
 * SvelteFlow node types for the rule builder
 */
export type FlowNodeType = "trigger" | "condition" | "action" | "group";

/**
 * SvelteFlow node data types (for typed access)
 */
export type FlowNodeData =
  | { type: "trigger"; config: TriggerConfig }
  | { type: "condition"; config: Condition }
  | { type: "action"; config: ActionConfig }
  | { type: "group"; config: ConditionGroup };

/**
 * SvelteFlow node for storage (uses Record for flexibility with JSON serialization)
 * The data field stores flat properties that are used by the node components.
 */
export interface FlowNode {
  id: string;
  type: FlowNodeType;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

/**
 * SvelteFlow edge
 */
export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

/**
 * Complete flow state for persistence
 */
export interface FlowState {
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport?: { x: number; y: number; zoom: number };
}

// =============================================================================
// Rule Event
// =============================================================================

/**
 * Event emitted when a trigger occurs
 */
export interface RuleEvent<T = unknown> {
  entityType: EntityType;
  event: string;
  workspaceId: number;
  entity: T;
  entityId?: number;
  previousState?: T; // For update events
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

// =============================================================================
// Rule Execution Context
// =============================================================================

/**
 * Context available during rule execution
 */
export interface RuleExecutionContext {
  workspaceId: number;
  userId?: string;
  event: RuleEvent;
  dryRun?: boolean; // If true, don't actually execute actions
}
