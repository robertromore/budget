# Budget Group Recommendations & Automation System

**Status:** Planning
**Created:** 2025-10-24
**Priority:** High

## Overview

Create a comprehensive system for intelligent budget group recommendations and configurable automation. This will help users organize budgets hierarchically and automate common grouping operations based on spending patterns, categories, and accounts.

## Goals

1. **Intelligent Grouping Recommendations**: Analyze budgets and suggest logical groupings
2. **Configurable Automation**: Allow users to control what gets automated
3. **User Control**: All automations can be reviewed/approved before execution
4. **Audit Trail**: Track all automated actions with rollback capability
5. **Smart Pattern Detection**: Use multiple signals for grouping suggestions

## Phase 1: Schema & Foundation

### 1.1 New Recommendation Types

Add to `recommendationTypes` in `lib/schema/recommendations.ts`:

```typescript
export const recommendationTypes = [
  // ... existing types
  "create_budget_group",     // Recommend creating a new group
  "add_to_budget_group",     // Recommend adding budgets to existing group
  "merge_budget_groups",     // Recommend merging similar groups
  "adjust_group_limit",      // Recommend changing group spending limit
] as const;
```

### 1.2 Automation Settings Schema

Create new table `budget_automation_settings`:

```typescript
// lib/schema/budget-automation-settings.ts
export const budgetAutomationSettings = sqliteTable("budget_automation_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  // Automation toggles
  autoCreateGroups: integer("auto_create_groups", { mode: "boolean" })
    .notNull()
    .default(false),
  autoAssignToGroups: integer("auto_assign_to_groups", { mode: "boolean" })
    .notNull()
    .default(false),
  autoAdjustGroupLimits: integer("auto_adjust_group_limits", { mode: "boolean" })
    .notNull()
    .default(false),

  // Control settings
  requireConfirmationThreshold: text("require_confirmation_threshold", {
    enum: ["high", "medium", "low"]
  }).notNull().default("medium"),

  enableSmartGrouping: integer("enable_smart_grouping", { mode: "boolean" })
    .notNull()
    .default(true),

  groupingStrategy: text("grouping_strategy", {
    enum: ["category-based", "account-based", "spending-pattern", "hybrid"]
  }).notNull().default("hybrid"),

  // Thresholds
  minSimilarityScore: real("min_similarity_score").notNull().default(70),
  minGroupSize: integer("min_group_size").notNull().default(2),

  // Timestamps
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
```

### 1.3 Automation Activity Log Schema

Track all automated actions:

```typescript
export const budgetAutomationActivity = sqliteTable("budget_automation_activity", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  // Action details
  actionType: text("action_type", {
    enum: ["create_group", "assign_to_group", "adjust_limit", "merge_groups"]
  }).notNull(),

  // References
  recommendationId: integer("recommendation_id")
    .references(() => budgetRecommendations.id, { onDelete: "set null" }),
  groupId: integer("group_id")
    .references(() => budgetGroups.id, { onDelete: "set null" }),

  // Affected entities (JSON arrays)
  budgetIds: text("budget_ids", { mode: "json" }).$type<number[]>(),

  // Status
  status: text("status", { enum: ["pending", "success", "failed", "rolled_back"] })
    .notNull()
    .default("pending"),
  errorMessage: text("error_message"),

  // Audit data
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  rolledBackAt: text("rolled_back_at"),
});
```

### 1.4 Extend Recommendation Metadata

Add group-related fields to `RecommendationMetadata` interface:

```typescript
export interface RecommendationMetadata {
  // ... existing fields

  // Group-specific metadata
  suggestedGroupName?: string;
  suggestedGroupMembers?: number[]; // budget IDs
  suggestedGroupColor?: string;
  groupSimilarityScore?: number; // 0-100
  groupSpendingLimit?: number;
  parentGroupId?: number;

  // Pattern matching
  budgetIdsToGroup?: number[];
  categoryPatternMatch?: string[];
  accountPatternMatch?: number[];
  spendingPatternSimilarity?: number;

  // Grouping rationale
  groupingReason?: "category_hierarchy" | "account_clustering" | "spending_pattern" | "name_similarity" | "manual";
  confidenceFactors?: {
    categoryMatch: number;
    accountMatch: number;
    amountSimilarity: number;
    nameSimilarity: number;
  };
}
```

## Phase 2: Backend Analysis Service

### 2.1 Create `budget-group-analysis-service.ts`

Location: `lib/server/domains/budgets/budget-group-analysis-service.ts`

#### Core Methods

**Pattern Detection:**

```typescript
class BudgetGroupAnalysisService {
  /**
   * Detect grouping patterns across all budgets
   */
  async detectGroupingPatterns(params?: AnalysisParams): Promise<GroupingPattern[]> {
    // 1. Get all active budgets without groups (or with incomplete grouping)
    // 2. Analyze patterns:
    //    - Category hierarchy (same parent category)
    //    - Account clustering (same accounts)
    //    - Spending patterns (similar amounts/frequency)
    //    - Name keywords (extract common themes)
    // 3. Score each potential grouping
    // 4. Return patterns above threshold
  }

  /**
   * Calculate similarity score between two budgets
   */
  private calculateBudgetSimilarity(
    budget1: BudgetWithRelations,
    budget2: BudgetWithRelations
  ): SimilarityScore {
    // Score based on:
    // - Category overlap (0-40 points)
    // - Account overlap (0-30 points)
    // - Spending amount similarity (0-20 points)
    // - Name keyword similarity (0-10 points)
    // Total: 0-100 points
  }
}
```

**Recommendation Generation:**

```typescript
/**
 * Generate recommendation to create a new budget group
 */
async generateGroupCreationRecommendation(
  pattern: GroupingPattern
): Promise<BudgetRecommendationDraft> {
  // 1. Analyze the pattern
  // 2. Suggest group name based on common theme
  // 3. Calculate confidence based on similarity scores
  // 4. Set priority based on:
  //    - Number of budgets that would benefit
  //    - Similarity strength
  //    - User's current grouping state
  // 5. Generate description with reasoning

  return {
    type: "create_budget_group",
    priority: calculatePriority(pattern),
    title: `Create "${suggestedName}" group`,
    description: `Group ${pattern.budgets.length} related budgets together.\n${reasoning}`,
    confidence: calculateConfidence(pattern),
    metadata: {
      suggestedGroupName: suggestedName,
      suggestedGroupMembers: pattern.budgetIds,
      groupSimilarityScore: pattern.averageSimilarity,
      categoryPatternMatch: pattern.commonCategories,
      // ...
    }
  };
}

/**
 * Generate recommendation to add budget to existing group
 */
async generateGroupAssignmentRecommendation(
  budget: BudgetWithRelations,
  group: BudgetGroup
): Promise<BudgetRecommendationDraft> {
  // 1. Find best matching existing group
  // 2. Check compatibility (spending limit, theme)
  // 3. Generate recommendation
}

/**
 * Generate recommendation to merge similar groups
 */
async generateGroupMergeRecommendation(
  group1: BudgetGroup,
  group2: BudgetGroup
): Promise<BudgetRecommendationDraft> {
  // 1. Find groups with overlapping purposes
  // 2. Analyze member budget similarity
  // 3. Suggest merged name and structure
}

/**
 * Generate recommendation to adjust group spending limit
 */
async generateGroupLimitRecommendation(
  group: BudgetGroup
): Promise<BudgetRecommendationDraft> {
  // 1. Calculate combined spending of member budgets
  // 2. Compare to current group limit
  // 3. Suggest increase if limit exceeded frequently
  // 4. Suggest decrease if significantly underutilized
}
```

#### Similarity Algorithms

**Category Similarity:**

```typescript
private calculateCategorySimilarity(
  categories1: Category[],
  categories2: Category[]
): number {
  // Score: 0-100
  let score = 0;

  // Same category: 100
  const exactMatches = intersection(
    categories1.map(c => c.id),
    categories2.map(c => c.id)
  );
  if (exactMatches.length > 0) return 100;

  // Same parent category: 70
  const parentMatches = intersection(
    categories1.map(c => c.parentId),
    categories2.map(c => c.parentId)
  );
  if (parentMatches.length > 0) return 70;

  // Same grandparent category: 40
  // ... hierarchical matching

  // Related keywords: 20
  const keywords1 = extractKeywords(categories1.map(c => c.name));
  const keywords2 = extractKeywords(categories2.map(c => c.name));
  if (hasOverlap(keywords1, keywords2)) return 20;

  return score;
}
```

**Account Clustering:**

```typescript
private calculateAccountSimilarity(
  accounts1: Account[],
  accounts2: Account[]
): number {
  // 100 if same account, 50 if same account type, 0 otherwise
  const accountIds1 = accounts1.map(a => a.id);
  const accountIds2 = accounts2.map(a => a.id);

  if (intersection(accountIds1, accountIds2).length > 0) return 100;

  const types1 = accounts1.map(a => a.type);
  const types2 = accounts2.map(a => a.type);

  if (intersection(types1, types2).length > 0) return 50;

  return 0;
}
```

**Spending Pattern Similarity:**

```typescript
private calculateSpendingPatternSimilarity(
  budget1: BudgetWithRelations,
  budget2: BudgetWithRelations
): number {
  // Compare:
  // - Amount ranges (0-40 points)
  // - Frequency (0-30 points)
  // - Trend (0-30 points)

  const amount1 = getBudgetAllocatedAmount(budget1);
  const amount2 = getBudgetAllocatedAmount(budget2);

  const amountScore = calculateAmountSimilarity(amount1, amount2);
  const frequencyScore = compareFrequencies(budget1, budget2);
  const trendScore = compareTrends(budget1, budget2);

  return amountScore + frequencyScore + trendScore;
}
```

**Name-Based Keyword Matching:**

```typescript
private calculateNameSimilarity(name1: string, name2: string): number {
  // Extract keywords
  const keywords1 = extractKeywords(name1);
  const keywords2 = extractKeywords(name2);

  // Common budget themes
  const themes = [
    ["home", "house", "rent", "mortgage", "utilities"],
    ["car", "auto", "vehicle", "gas", "insurance"],
    ["health", "medical", "doctor", "dental"],
    ["food", "grocery", "groceries", "dining"],
    ["entertainment", "fun", "hobby", "recreation"],
    // ... more themes
  ];

  // Check if both names belong to same theme
  for (const theme of themes) {
    const matches1 = keywords1.filter(k => theme.includes(k.toLowerCase()));
    const matches2 = keywords2.filter(k => theme.includes(k.toLowerCase()));
    if (matches1.length > 0 && matches2.length > 0) return 80;
  }

  // Check for exact keyword overlap
  const overlap = intersection(keywords1, keywords2);
  if (overlap.length > 0) return 60;

  return 0;
}
```

### 2.2 Extend `budget-analysis-service.ts`

Integrate group analysis into existing spending analysis:

```typescript
class BudgetAnalysisService {
  // ... existing methods

  async analyzeSpending(params: AnalysisParams): Promise<BudgetRecommendationDraft[]> {
    const recommendations: BudgetRecommendationDraft[] = [];

    // ... existing budget recommendations

    // Add group recommendations
    const groupAnalysis = new BudgetGroupAnalysisService();
    const groupRecommendations = await groupAnalysis.generateAllGroupRecommendations(params);

    recommendations.push(...groupRecommendations);

    return recommendations;
  }
}
```

## Phase 3: Automation Engine

### 3.1 Create `budget-group-automation-service.ts`

Location: `lib/server/domains/budgets/budget-group-automation-service.ts`

```typescript
class BudgetGroupAutomationService {
  /**
   * Check if recommendation should be auto-applied
   */
  async shouldAutoApply(
    recommendation: BudgetRecommendation,
    settings: AutomationSettings
  ): Promise<boolean> {
    // Check settings
    const typeEnabled = this.isTypeEnabled(recommendation.type, settings);
    if (!typeEnabled) return false;

    // Check confidence threshold
    const meetsThreshold = this.meetsConfidenceThreshold(
      recommendation.confidence,
      recommendation.priority,
      settings.requireConfirmationThreshold
    );

    // Check for conflicts
    const hasConflicts = await this.checkForConflicts(recommendation);

    return typeEnabled && meetsThreshold && !hasConflicts;
  }

  /**
   * Auto-apply a group recommendation
   */
  async autoApplyGroupRecommendation(
    recommendation: BudgetRecommendation
  ): Promise<AutomationResult> {
    const activity = await this.logActivityStart(recommendation);

    try {
      switch (recommendation.type) {
        case "create_budget_group":
          await this.autoCreateGroup(recommendation);
          break;
        case "add_to_budget_group":
          await this.autoAssignToGroup(recommendation);
          break;
        case "adjust_group_limit":
          await this.autoAdjustLimit(recommendation);
          break;
        case "merge_budget_groups":
          await this.autoMergeGroups(recommendation);
          break;
      }

      await this.logActivitySuccess(activity.id);
      return { success: true, activityId: activity.id };
    } catch (error) {
      await this.logActivityFailure(activity.id, error);
      return { success: false, error, activityId: activity.id };
    }
  }

  /**
   * Auto-assign new budget to best matching group
   */
  async autoAssignBudgetToGroups(budgetId: number): Promise<void> {
    const settings = await this.getSettings();
    if (!settings.autoAssignToGroups) return;

    const budget = await this.budgetRepo.findById(budgetId);
    const groups = await this.budgetRepo.listBudgetGroups();

    // Find best match
    const bestMatch = await this.findBestMatchingGroup(budget, groups);

    if (bestMatch && bestMatch.score >= settings.minSimilarityScore) {
      if (await this.shouldAutoApply(bestMatch.recommendation, settings)) {
        await this.autoApplyGroupRecommendation(bestMatch.recommendation);
      }
    }
  }

  /**
   * Rollback an automated action
   */
  async rollbackAutomation(activityId: number): Promise<void> {
    const activity = await this.getActivity(activityId);

    switch (activity.actionType) {
      case "create_group":
        await this.rollbackGroupCreation(activity);
        break;
      case "assign_to_group":
        await this.rollbackGroupAssignment(activity);
        break;
      // ... other types
    }

    await this.markActivityRolledBack(activityId);
  }
}
```

### 3.2 Integration Points

**Budget Creation Hook:**

```typescript
// In budget creation flow
async function createBudget(input: CreateBudgetInput): Promise<Budget> {
  const budget = await repository.createBudget(input);

  // Trigger auto-assignment check
  const automation = new BudgetGroupAutomationService();
  await automation.autoAssignBudgetToGroups(budget.id);

  return budget;
}
```

**Scheduled Job:**

```typescript
// Periodic group analysis
async function runScheduledGroupAnalysis() {
  const settings = await getAutomationSettings();
  if (!settings.enableSmartGrouping) return;

  const analysis = new BudgetGroupAnalysisService();
  const recommendations = await analysis.generateAllGroupRecommendations();

  const automation = new BudgetGroupAutomationService();
  for (const rec of recommendations) {
    if (await automation.shouldAutoApply(rec, settings)) {
      await automation.autoApplyGroupRecommendation(rec);
    }
  }
}
```

## Phase 4: UI Components

### 4.1 Settings UI

Create `lib/components/budgets/budget-automation-settings.svelte`:

```svelte
<script lang="ts">
  import { Switch } from "$lib/components/ui/switch";
  import { Label } from "$lib/components/ui/label";
  import * as Select from "$lib/components/ui/select";
  import { Slider } from "$lib/components/ui/slider";

  let settings = $state({
    autoCreateGroups: false,
    autoAssignToGroups: false,
    autoAdjustGroupLimits: false,
    requireConfirmationThreshold: "medium",
    enableSmartGrouping: true,
    groupingStrategy: "hybrid",
    minSimilarityScore: 70,
  });
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>Budget Group Automation</Card.Title>
    <Card.Description>
      Configure how budget groups are automatically managed
    </Card.Description>
  </Card.Header>

  <Card.Content class="space-y-6">
    <!-- Auto-create groups -->
    <div class="flex items-center justify-between">
      <div class="space-y-0.5">
        <Label>Auto-create groups</Label>
        <div class="text-sm text-muted-foreground">
          Automatically create groups when patterns are detected
        </div>
      </div>
      <Switch bind:checked={settings.autoCreateGroups} />
    </div>

    <!-- Auto-assign to groups -->
    <div class="flex items-center justify-between">
      <div class="space-y-0.5">
        <Label>Auto-assign budgets</Label>
        <div class="text-sm text-muted-foreground">
          Automatically add new budgets to matching groups
        </div>
      </div>
      <Switch bind:checked={settings.autoAssignToGroups} />
    </div>

    <!-- Confidence threshold -->
    <div class="space-y-2">
      <Label>Minimum confidence: {settings.minSimilarityScore}%</Label>
      <Slider
        bind:value={settings.minSimilarityScore}
        min={50}
        max={95}
        step={5}
      />
      <div class="text-sm text-muted-foreground">
        Higher values mean fewer but more accurate automations
      </div>
    </div>

    <!-- Grouping strategy -->
    <div class="space-y-2">
      <Label>Grouping strategy</Label>
      <Select.Root bind:value={settings.groupingStrategy}>
        <Select.Trigger>
          <Select.Value />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="category-based">Category-based</Select.Item>
          <Select.Item value="account-based">Account-based</Select.Item>
          <Select.Item value="spending-pattern">Spending pattern</Select.Item>
          <Select.Item value="hybrid">Hybrid (recommended)</Select.Item>
        </Select.Content>
      </Select.Root>
    </div>
  </Card.Content>
</Card.Root>
```

### 4.2 Automation Activity Log

Create `lib/components/budgets/automation-activity-log.svelte`:

```svelte
<script lang="ts">
  import { DataTable } from "$lib/components/ui/data-table";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";

  const activities = getAutomationActivity().options();

  const columns = [
    { accessorKey: "createdAt", header: "Date" },
    { accessorKey: "actionType", header: "Action" },
    { accessorKey: "status", header: "Status" },
    { accessorKey: "metadata", header: "Details" },
    {
      id: "actions",
      cell: ({ row }) => ({
        #snippet: () => (
          {#if row.status === "success" && !row.rolledBackAt}
            <Button
              size="sm"
              variant="ghost"
              onclick={() => rollback(row.id)}
            >
              Undo
            </Button>
          {/if}
        )
      })
    }
  ];
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>Automation Activity</Card.Title>
    <Card.Description>
      History of automated budget group actions
    </Card.Description>
  </Card.Header>

  <Card.Content>
    <DataTable {columns} data={activities.data ?? []} />
  </Card.Content>
</Card.Root>
```

### 4.3 Group Recommendation Preview Modal

Create `lib/components/budgets/recommendations/group-recommendation-preview-modal.svelte`:

Shows preview of what will happen when group recommendation is applied.

### 4.4 Enhanced Recommendations Panel

Modify `lib/components/budgets/budget-recommendations-panel.svelte`:

- Add filter to show only group recommendations
- Add filter to show only budget recommendations
- Show automation status (auto vs manual)

## Phase 5: API Layer

### 5.1 tRPC Routes

Add to `lib/trpc/routes/budgets.ts`:

```typescript
export const budgetRouter = router({
  // ... existing routes

  // Group analysis
  analyzeGrouping: protectedProcedure
    .input(z.object({
      accountIds: z.array(z.number()).optional(),
      months: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const service = new BudgetGroupAnalysisService();
      return await service.generateAllGroupRecommendations(input);
    }),

  // Group recommendations
  getGroupRecommendations: protectedProcedure
    .query(async ({ ctx }) => {
      const repo = new RecommendationRepository();
      return await repo.listRecommendations({
        types: ["create_budget_group", "add_to_budget_group", "merge_budget_groups", "adjust_group_limit"]
      });
    }),

  applyGroupRecommendation: protectedProcedure
    .input(z.object({ recommendationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const service = new BudgetGroupAutomationService();
      const rec = await repo.findRecommendationById(input.recommendationId);
      return await service.autoApplyGroupRecommendation(rec);
    }),

  // Automation settings
  getAutomationSettings: protectedProcedure
    .query(async ({ ctx }) => {
      return await getAutomationSettings();
    }),

  updateAutomationSettings: protectedProcedure
    .input(automationSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      return await updateAutomationSettings(input);
    }),

  // Automation activity
  getAutomationActivity: protectedProcedure
    .input(z.object({
      limit: z.number().optional(),
      offset: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return await getAutomationActivity(input);
    }),

  rollbackAutomation: protectedProcedure
    .input(z.object({ activityId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const service = new BudgetGroupAutomationService();
      return await service.rollbackAutomation(input.activityId);
    }),
});
```

### 5.2 Query Factories

Add to `lib/query/budgets.ts`:

```typescript
export const listGroupRecommendations = defineQuery(
  () => ["budgets", "recommendations", "groups"] as const,
  () => ({
    queryFn: () => trpc.budgets.getGroupRecommendations.query()
  })
);

export const getAutomationSettings = defineQuery(
  () => ["budgets", "automation", "settings"] as const,
  () => ({
    queryFn: () => trpc.budgets.getAutomationSettings.query()
  })
);

export const updateAutomationSettings = defineMutation(
  () => ({
    mutationFn: (input: AutomationSettings) =>
      trpc.budgets.updateAutomationSettings.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets", "automation", "settings"] });
    }
  })
);

export const getAutomationActivity = defineQuery(
  (params?: { limit?: number; offset?: number }) =>
    ["budgets", "automation", "activity", params] as const,
  (params) => ({
    queryFn: () => trpc.budgets.getAutomationActivity.query(params)
  })
);

export const rollbackAutomation = defineMutation(
  () => ({
    mutationFn: (activityId: number) =>
      trpc.budgets.rollbackAutomation.mutate({ activityId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets", "automation", "activity"] });
      queryClient.invalidateQueries({ queryKey: ["budgets", "groups"] });
    }
  })
);
```

## Phase 6: Testing & Refinement

### 6.1 Example Scenarios

**Scenario 1: User with ungrouped budgets**
- Create 10 budgets across different categories
- Run analysis
- Should suggest 2-3 logical groups

**Scenario 2: Category-based grouping**
- Create budgets for: Car Insurance, Gas, Car Maintenance
- Should suggest "Auto/Transportation" group

**Scenario 3: Account-based grouping**
- Create multiple budgets all tied to Credit Card account
- Should suggest "Credit Card Spending" group

**Scenario 4: Spending pattern grouping**
- Create budgets with similar amounts ($50-75 range)
- Should suggest "Monthly Subscriptions" group

### 6.2 Algorithm Tuning

Initial thresholds to test and adjust:

- **Category similarity**: Same category: 100, Same parent: 70, Same grandparent: 40
- **Account similarity**: Same account: 100, Same type: 50
- **Amount similarity**: Within 20%: 80, Within 50%: 50
- **Name similarity**: Theme match: 80, Keyword match: 60
- **Overall confidence**: >85: High priority, 70-85: Medium, <70: Low or don't recommend

## Migration SQL

```sql
-- Automation settings table
CREATE TABLE budget_automation_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  auto_create_groups BOOLEAN NOT NULL DEFAULT 0,
  auto_assign_to_groups BOOLEAN NOT NULL DEFAULT 0,
  auto_adjust_group_limits BOOLEAN NOT NULL DEFAULT 0,
  require_confirmation_threshold TEXT NOT NULL DEFAULT 'medium',
  enable_smart_grouping BOOLEAN NOT NULL DEFAULT 1,
  grouping_strategy TEXT NOT NULL DEFAULT 'hybrid',
  min_similarity_score REAL NOT NULL DEFAULT 70,
  min_group_size INTEGER NOT NULL DEFAULT 2,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Automation activity log table
CREATE TABLE budget_automation_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action_type TEXT NOT NULL,
  recommendation_id INTEGER,
  group_id INTEGER,
  budget_ids TEXT, -- JSON array
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  metadata TEXT, -- JSON
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  rolled_back_at TEXT,
  FOREIGN KEY (recommendation_id) REFERENCES budget_recommendation(id) ON DELETE SET NULL,
  FOREIGN KEY (group_id) REFERENCES budget_group(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX budget_automation_activity_status_idx ON budget_automation_activity(status);
CREATE INDEX budget_automation_activity_created_at_idx ON budget_automation_activity(created_at);
CREATE INDEX budget_automation_activity_action_type_idx ON budget_automation_activity(action_type);
```

## User Experience Flow

### First-time User Flow

1. User has created several budgets but no groups
2. System analyzes spending patterns
3. User sees group recommendations in Recommendations tab
4. User clicks "Preview" to see what would be grouped
5. User applies recommendation → Group created with budgets assigned
6. User sees notification: "Created 'Transportation' group with 3 budgets"

### Enabling Automation

1. User goes to Settings → Automation
2. Enables "Auto-assign budgets"
3. Sets confidence threshold to 75%
4. Creates new budget for "Gym Membership"
5. System automatically adds it to "Health & Fitness" group
6. User receives notification with "Undo" option

### Reviewing Automation

1. User navigates to Automation Activity tab
2. Sees log of automated actions
3. Notices "Auto-assigned 'Netflix' to 'Entertainment'" from yesterday
4. Clicks "Undo" → Budget removed from group
5. System offers to create new group or reassign

## Success Metrics

1. **Adoption Rate**: % of users who enable at least one automation feature
2. **Accuracy**: % of automated groupings that are not rolled back
3. **Time Savings**: Reduction in manual group management time
4. **Group Coverage**: % of budgets that belong to at least one group
5. **User Satisfaction**: Feedback on recommendation quality

## Future Enhancements

1. **Machine Learning**: Train model on user acceptance/rejection patterns
2. **Natural Language**: Allow users to describe grouping preferences in plain text
3. **Smart Scheduling**: Auto-adjust group limits based on predicted future spending
4. **Group Templates**: Pre-built group structures for common scenarios
5. **Multi-level Hierarchy**: Support for sub-groups within groups
6. **Budget Splitting**: Recommend splitting budgets across multiple groups

## Implementation Order

**Phase 1 - Foundation (Week 1)**
1. Schema changes (new tables, extend recommendations)
2. Database migration
3. Basic repository methods

**Phase 2 - Analysis (Week 2)**
4. Budget group analysis service
5. Pattern detection algorithms
6. Similarity scoring

**Phase 3 - Recommendations (Week 3)**
7. Group recommendation generation
8. Integration with existing analysis
9. Testing recommendation quality

**Phase 4 - Automation (Week 4)**
10. Automation service
11. Auto-apply logic
12. Activity logging

**Phase 5 - UI (Week 5)**
13. Settings component
14. Activity log component
15. Enhanced recommendations display

**Phase 6 - Polish (Week 6)**
16. Preview modals
17. Rollback functionality
18. Testing & refinement
