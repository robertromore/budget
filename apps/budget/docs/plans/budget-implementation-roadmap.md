# Budget System Implementation Roadmap

This document outlines the complete plan for finishing and enhancing the budget management system.

## Current State Analysis

### Already Implemented

**Database Schema**
- All tables migrated and in production
- Tables: budget, budget_account, budget_category, budget_group, budget_period_template, budget_period_instance, budget_transaction
- Envelope tables: envelope_allocation, envelope_transfer, envelope_rollover_history

**Backend Services**
- `BudgetService` - Core budget CRUD and business logic
- `EnvelopeService` - YNAB-style envelope budgeting
- `PeriodManager` - Period template and instance management
- `RolloverCalculator` - Envelope rollover processing
- `DeficitRecovery` - Deficit management utilities
- `BudgetRepository` - Database access layer

**tRPC Routes**
- Complete CRUD operations (`/src/lib/trpc/routes/budgets.ts`)
- Envelope operations (allocations, transfers, rollovers)
- Transaction allocation endpoints
- Period management endpoints

**UI Components**
- 30+ budget components created
- Layout components (dashboard-first, executive, progressive-disclosure, split-view, timeline)
- Budget management dialogs and forms
- Envelope budget managers (simple, advanced, drag-drop)
- Progress visualizations
- Analytics dashboard (complete UI with charts, performance tracking, and alerts)
  - Gap: Spending trends use mock data instead of real historical transactions
  - Gap: Need backend endpoints for time-series analytics data

**Routes**
- `/budgets` - List page with server-side data loading
- `/budgets/[id]` - Detail page
- `/budgets/new` - Creation page
- `/budgets/[id]/edit` - Edit page

### Missing Critical Features

**Query Layer**
- Complete TanStack Query integration exists (`src/lib/query/budgets.ts`)
- Comprehensive query factories and mutations already implemented
- Real gap: UI pages still use server-side load functions instead of reactive queries
- Need to wire existing queries into budget list/detail pages

**Transaction Integration**
- Budget allocation not available in transaction forms
- No budget column in transaction tables
- No auto-assignment logic

**Test Data**
- Zero budgets exist in database
- Cannot test UI without manual data creation

**Period Management**
- Period template creation UI not connected to backend
- No automatic period generation
- Manual period operations not exposed in UI

**Real-time Calculations**
- Budget consumption not auto-updating
- Envelope available amounts not recalculated on transaction changes
- No reactive period instance updates

## Phase 1: Foundation & Query Layer

**Priority**: Critical
**Goal**: Connect existing query layer to UI pages for reactive data

### 1.1 Wire Queries into Budget Pages

**Status**: Query infrastructure complete in `src/lib/query/budgets.ts`
**Existing Queries**:
- `listBudgets(status?)` - Budget list with filtering
- `getBudgetDetail(id)` - Single budget with full relations
- `listPeriodInstances(templateId)` - Period instances for template
- `getEnvelopeAllocations(budgetId)` - Envelope data with spending calculations
- `validateAllocation()` - Transaction allocation validation

**Existing Mutations**:
- Budget CRUD: `createBudget`, `updateBudget`, `deleteBudget`
- Period management: `ensurePeriodInstance`
- Transaction allocations: `createAllocation`, `updateAllocation`, `clearAllocation`, `deleteAllocation`
- Envelope operations: `createEnvelopeAllocation`, `transferEnvelopeFunds`, `processEnvelopeRollover`

**File**: `src/routes/budgets/+page.svelte`

Replace server load with client-side query:

```svelte
<script lang="ts">
  import { listBudgets } from '$lib/query/budgets';

  let statusFilter = $state<'active' | 'inactive' | 'archived' | undefined>(undefined);

  const budgetsQuery = $derived(listBudgets(statusFilter));
</script>

{#if budgetsQuery.data}
  <!-- Use budgetsQuery.data instead of data.budgets from server -->
  {#each budgetsQuery.data as budget}
    <!-- Budget list items -->
  {/each}
{/if}
```

**File**: `src/routes/budgets/[id]/+page.svelte`

Replace server load with reactive detail query:

```svelte
<script lang="ts">
  import { getBudgetDetail, getEnvelopeAllocations } from '$lib/query/budgets';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const budgetQuery = $derived(getBudgetDetail(data.id));
  const envelopesQuery = $derived(getEnvelopeAllocations(data.id));
</script>

{#if budgetQuery.data}
  <!-- Use budgetQuery.data instead of data.budget from server -->
  <BudgetDetail budget={budgetQuery.data} />
{/if}

{#if envelopesQuery.data}
  <EnvelopeManager envelopes={envelopesQuery.data} />
{/if}
```

### 1.2 Test Data Generation

**Seeding Infrastructure**: The project uses JSON-based seeding via `src/lib/server/db/seeders/index.ts`
- Place `.json` files in `src/lib/server/db/seeders/`
- Seeder automatically loads files matching table names (e.g., `budget.json` → `budget` table)
- Run with `bun run src/lib/server/db/seeders/index.ts`

**File**: `src/lib/server/db/seeders/budget.json`

```json
[
  {
    "name": "Checking Account Budget",
    "description": "Monthly budget for checking account expenses",
    "type": "account-monthly",
    "scope": "account",
    "status": "active",
    "enforcement_level": "warning",
    "metadata": {
      "allocatedAmount": 2500,
      "defaultPeriod": { "type": "monthly", "startDay": 1 }
    }
  },
  {
    "name": "Monthly Envelopes",
    "description": "YNAB-style envelope budgeting for categories",
    "type": "category-envelope",
    "scope": "category",
    "status": "active",
    "enforcement_level": "warning",
    "metadata": {
      "allocatedAmount": 3000,
      "defaultPeriod": { "type": "monthly", "startDay": 1 }
    }
  },
  {
    "name": "Emergency Fund",
    "description": "Savings goal for emergency expenses",
    "type": "goal-based",
    "scope": "global",
    "status": "active",
    "enforcement_level": "none",
    "metadata": {
      "allocatedAmount": 10000,
      "target": 10000,
      "targetDate": "2025-12-31"
    }
  }
]
```

**Additional Seed Files Needed**:
- `src/lib/server/db/seeders/budget_account.json` - Link budgets to accounts
- `src/lib/server/db/seeders/budget_category.json` - Link budgets to categories
- `src/lib/server/db/seeders/budget_period_template.json` - Period templates
- `src/lib/server/db/seeders/budget_period_instance.json` - Initial period instances

**Note**: After creating seed files, run seeder to populate development database with realistic budget data.

### 1.3 Budget Calculation Service

**File**: `src/lib/server/domains/budgets/calculation-service.ts` (new)

Real-time budget consumption tracking:

```typescript
export class BudgetCalculationService {
  async recalculateBudgetPeriod(periodInstanceId: number) {
    // Get all budget_transactions for this period
    // Calculate sum of allocated_amount (consumed amount)
    // Update budget_period_instances.actualAmount
    // Update last_calculated timestamp
  }

  async recalculateEnvelope(envelopeId: number) {
    // Get envelope allocation
    // Calculate spent_amount from budget_transactions
    // Calculate available_amount = allocated + rollover - spent
    // Calculate deficit_amount if overspent
    // Update envelope status based on amounts
  }

  async onTransactionChange(transactionId: number) {
    // Get all budget allocations for transaction
    // Recalculate affected period instances
    // Recalculate affected envelopes
    // Trigger real-time updates
  }
}
```

**Integration Points**:
- Hook into transaction create/update/delete in TransactionService
- Add to budget allocation create/update/delete flows
- Consider caching strategy for performance

## Phase 2: Transaction Integration

**Priority**: High
**Goal**: Connect budgets to transaction workflow

### 2.1 Transaction Form Budget Allocation

**File**: `src/lib/components/forms/manage-transaction-form.svelte`

Add budget allocation section after category field:

```svelte
{#if applicableBudgets.length > 0}
  <div class="space-y-3">
    <Label>Budget Allocation</Label>

    <!-- Auto-assign toggle -->
    <div class="flex items-center gap-2">
      <Switch bind:checked={autoAssign} />
      <span class="text-sm">Auto-assign to applicable budgets</span>
    </div>

    {#if !autoAssign}
      <!-- Manual allocation interface -->
      <div class="space-y-2">
        {#each allocations as allocation, index}
          <div class="flex gap-2">
            <Select.Root bind:value={allocation.budgetId}>
              <Select.Trigger class="flex-1">
                {getBudgetName(allocation.budgetId)}
              </Select.Trigger>
              <Select.Content>
                {#each applicableBudgets as budget}
                  <Select.Item value={budget.id}>{budget.name}</Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>

            <NumericInput
              bind:value={allocation.amount}
              class="w-32"
            />

            <Button
              variant="ghost"
              size="icon"
              onclick={() => removeAllocation(index)}
            >
              <X class="h-4 w-4" />
            </Button>
          </div>
        {/each}

        <Button variant="outline" onclick={addAllocation}>
          <Plus class="h-4 w-4 mr-2" />
          Add Allocation
        </Button>

        <!-- Remaining amount indicator -->
        <div class="text-sm text-muted-foreground">
          Remaining: {formatCurrency(remainingAmount)}
        </div>
      </div>
    {/if}
  </div>
{/if}
```

**Logic**:
- `applicableBudgets` = budgets matching transaction's account/category
- Validate total allocation <= transaction amount
- Show error if over-allocated
- Support split allocations (one transaction, multiple budgets)

### 2.2 Transaction Table Budget Column

**File**: `src/lib/components/transactions/columns.svelte.ts`

Add budget column:

```typescript
{
  id: "budgets",
  accessorKey: "budgets",
  header: "Budgets",
  cell: ({ row }) => {
    const budgets = row.original.budgetAllocations || [];
    return budgets.length > 0
      ? budgets.map(b => `<Badge>${b.budgetName}</Badge>`).join(" ")
      : "<span class='text-muted-foreground'>Unallocated</span>";
  }
}
```

**Enhancements**:
- Click badge to quick-edit allocation
- Show amount allocated to each budget
- Visual indicator for partial allocations

### 2.3 Budget Impact Preview

**File**: `src/lib/components/budgets/budget-impact-preview.svelte` (new)

Show real-time impact when allocating:

```svelte
<Card.Root>
  <Card.Header>
    <Card.Title>Budget Impact</Card.Title>
  </Card.Header>
  <Card.Content>
    <div class="space-y-4">
      {#each selectedBudgets as budget}
        <div>
          <div class="flex justify-between mb-1">
            <span class="font-medium">{budget.name}</span>
            <span class="text-sm text-muted-foreground">
              {budget.periodEnd}
            </span>
          </div>

          <!-- Current state -->
          <div class="text-xs text-muted-foreground mb-2">
            Current: {formatCurrency(budget.consumed)} / {formatCurrency(budget.allocated)}
          </div>

          <!-- After allocation -->
          <div class="text-xs">
            After: {formatCurrency(budget.consumed + allocationAmount)} / {formatCurrency(budget.allocated)}
          </div>

          <!-- Progress bars -->
          <div class="space-y-1 mt-2">
            <Progress value={budget.currentPercentage} class="h-2" />
            <Progress value={budget.projectedPercentage} class="h-2 opacity-50" />
          </div>

          {#if budget.projectedPercentage > 100}
            <p class="text-destructive text-xs mt-1">
              ⚠️ This will exceed the budget by {formatCurrency(budget.overageAmount)}
            </p>
          {/if}
        </div>
      {/each}
    </div>
  </Card.Content>
</Card.Root>
```

## Phase 3: Period Management UI

**Priority**: High
**Goal**: Full period lifecycle management

### 3.1 Period Template Creation

**File**: `src/lib/components/budgets/budget-period-template-form.svelte` (new)

Interface for creating and managing period templates:

```svelte
<form onsubmit={handleSubmit}>
  <!-- Period type selector -->
  <div>
    <Label>Period Type</Label>
    <Select.Root bind:value={periodType}>
      <Select.Trigger>Select Period Type</Select.Trigger>
      <Select.Content>
        <Select.Item value="weekly">Weekly</Select.Item>
        <Select.Item value="monthly">Monthly</Select.Item>
        <Select.Item value="quarterly">Quarterly</Select.Item>
        <Select.Item value="yearly">Yearly</Select.Item>
        <Select.Item value="custom">Custom</Select.Item>
      </Select.Content>
    </Select.Root>
  </div>

  <!-- Interval -->
  <div>
    <Label>Every</Label>
    <div class="flex items-center gap-2">
      <Input type="number" bind:value={interval} min="1" />
      <span>{periodType}(s)</span>
    </div>
  </div>

  {#if periodType === "weekly"}
    <!-- Start day of week -->
    <div>
      <Label>Week Starts On</Label>
      <Select.Root bind:value={startDayOfWeek}>
        <Select.Trigger>Select Day</Select.Trigger>
        <Select.Content>
          <Select.Item value="1">Monday</Select.Item>
          <Select.Item value="2">Tuesday</Select.Item>
          <!-- ... all days ... -->
          <Select.Item value="7">Sunday</Select.Item>
        </Select.Content>
      </Select.Root>
    </div>
  {:else if periodType === "monthly"}
    <!-- Start day of month -->
    <div>
      <Label>Month Starts On</Label>
      <Input type="number" bind:value={startDayOfMonth} min="1" max="31" />
      <p class="text-xs text-muted-foreground">
        Day 1-31 (automatically handles months with fewer days)
      </p>
    </div>
  {:else if periodType === "yearly"}
    <!-- Start month and day -->
    <div class="grid grid-cols-2 gap-4">
      <div>
        <Label>Start Month</Label>
        <Select.Root bind:value={startMonth}>
          <Select.Trigger>Select Month</Select.Trigger>
          <Select.Content>
            <Select.Item value="1">January</Select.Item>
            <!-- ... all months ... -->
          </Select.Content>
        </Select.Root>
      </div>
      <div>
        <Label>Start Day</Label>
        <Input type="number" bind:value={startDayOfMonth} min="1" max="31" />
      </div>
    </div>
  {/if}

  <!-- Preview upcoming periods -->
  <div class="rounded-md border p-4">
    <p class="font-medium mb-2">Preview</p>
    <ul class="space-y-1 text-sm">
      {#each previewPeriods as period}
        <li>{period.start} → {period.end}</li>
      {/each}
    </ul>
  </div>

  <Button type="submit">Create Template</Button>
</form>
```

### 3.2 Period Instance Management

**File**: `src/lib/components/budgets/budget-period-manager.svelte` (enhance)

Enhanced period operations:

```svelte
<div class="space-y-4">
  <!-- Active template display -->
  <Card.Root>
    <Card.Header>
      <div class="flex justify-between items-center">
        <Card.Title>Period Template</Card.Title>
        <Button variant="outline" onclick={editTemplate}>Edit</Button>
      </div>
    </Card.Header>
    <Card.Content>
      <p>{formatTemplateDescription(template)}</p>
    </Card.Content>
  </Card.Root>

  <!-- Period instances list -->
  <div class="space-y-2">
    <div class="flex justify-between items-center">
      <h3 class="font-medium">Periods</h3>
      <Button onclick={generateNextPeriod}>
        <Plus class="h-4 w-4 mr-2" />
        Generate Next Period
      </Button>
    </div>

    {#each periods as period}
      <Card.Root>
        <Card.Content class="p-4">
          <div class="flex justify-between items-center">
            <div>
              <p class="font-medium">{formatPeriodRange(period)}</p>
              <p class="text-sm text-muted-foreground">
                {formatCurrency(period.actualAmount)} / {formatCurrency(period.allocatedAmount)}
              </p>
            </div>

            <div class="flex gap-2">
              <Button variant="outline" size="sm" onclick={() => editPeriod(period)}>
                Edit
              </Button>
              <Button variant="outline" size="sm" onclick={() => viewDetails(period)}>
                Details
              </Button>
            </div>
          </div>

          <Progress value={(period.actualAmount / period.allocatedAmount) * 100} class="mt-2" />
        </Card.Content>
      </Card.Root>
    {/each}
  </div>
</div>
```

### 3.3 Automatic Period Generation

**File**: `src/lib/server/domains/budgets/period-automation.ts` (new)

Background service for automatic period management:

```typescript
import { parseISOString, dateDifference, currentDate } from '$lib/utils/dates';

export class PeriodAutomationService {
  async checkAndGeneratePeriods() {
    // Find all active budget period templates
    const templates = await getActiveTemplates();

    for (const template of templates) {
      // Get latest period instance
      const latestPeriod = await getLatestPeriod(template.id);

      // Check if period ends within next 7 days
      const endDateValue = parseISOString(latestPeriod.endDate);
      const daysUntilEnd = dateDifference(currentDate, endDateValue, 'days');

      if (daysUntilEnd <= 7) {
        // Generate next period
        const nextPeriod = await periodService.ensureInstanceForDate(
          template.id,
          { referenceDate: endDateValue.add({ days: 1 }) }
        );

        // Process rollover if envelope budget
        if (template.budget.type === 'category-envelope') {
          await envelopeService.processRollover(
            latestPeriod.id,
            nextPeriod.id
          );
        }

        // Send notification (future feature)
        // await notificationService.sendPeriodGenerated(template.budget, nextPeriod);
      }
    }
  }
}

// Run via cron job or schedule
// Example: Every day at midnight
```

## Phase 4: Envelope Budget Refinements

**Priority**: Medium
**Goal**: Polish YNAB-style envelope budgeting

### 4.1 Enhanced Envelope Allocation Interface

**File**: `src/lib/components/budgets/envelope-budget-manager.svelte` (enhance)

Improvements to existing envelope manager:

**Drag-and-Drop Fund Transfer**:

```svelte
<!-- Source envelope (drag from) -->
<div
  draggable="true"
  ondragstart={(e) => handleDragStart(e, envelope)}
  class="cursor-move"
>
  <EnvelopeCard {envelope} />
</div>

<!-- Target envelope (drop to) -->
<div
  ondragover={(e) => e.preventDefault()}
  ondrop={(e) => handleDrop(e, targetEnvelope)}
>
  <EnvelopeCard envelope={targetEnvelope} />
</div>
```

**Quick Allocation from "To Be Budgeted"**:

```svelte
<div class="bg-primary/10 p-4 rounded-md mb-4">
  <p class="font-medium mb-2">To Be Budgeted</p>
  <p class="text-2xl font-bold">{formatCurrency(toBeBudgeted)}</p>

  <div class="mt-4 flex gap-2">
    <Input
      type="number"
      bind:value={quickAllocateAmount}
      placeholder="Amount"
      class="w-32"
    />
    <Select.Root bind:value={quickAllocateEnvelope}>
      <Select.Trigger>Select Envelope</Select.Trigger>
      <Select.Content>
        {#each envelopes as env}
          <Select.Item value={env.id}>{getCategoryName(env.categoryId)}</Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>
    <Button onclick={allocateQuick}>Allocate</Button>
  </div>
</div>
```

**Percentage-Based Allocation**:

```svelte
<Dialog.Root bind:open={percentageDialogOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Percentage Allocation</Dialog.Title>
    </Dialog.Header>

    <div class="space-y-4">
      {#each categories as category}
        <div class="flex items-center gap-2">
          <Label class="flex-1">{category.name}</Label>
          <Input
            type="number"
            bind:value={percentages[category.id]}
            placeholder="0"
            class="w-20"
          />
          <span>%</span>
        </div>
      {/each}

      <div class="text-sm text-muted-foreground">
        Total: {totalPercentage}% (must equal 100%)
      </div>

      <div class="text-sm font-medium">
        Amount to allocate: {formatCurrency(allocationPool)}
      </div>
    </div>

    <Dialog.Footer>
      <Button onclick={applyPercentages} disabled={totalPercentage !== 100}>
        Apply
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
```

**Envelope Templates**:

```svelte
<div class="mb-4">
  <Label>Quick Templates</Label>
  <div class="flex gap-2 mt-2">
    <Button variant="outline" onclick={() => loadTemplate('50-30-20')}>
      50/30/20 Rule
    </Button>
    <Button variant="outline" onclick={() => loadTemplate('last-month')}>
      Copy Last Month
    </Button>
    <Button variant="outline" onclick={() => loadTemplate('average-3')}>
      3-Month Average
    </Button>
    <Button variant="outline" onclick={saveCurrentAsTemplate}>
      Save as Template
    </Button>
  </div>
</div>
```

### 4.2 Rollover Processing UI

**File**: `src/lib/components/budgets/rollover-manager.svelte` (enhance)

Enhanced rollover interface:

```svelte
<Card.Root>
  <Card.Header>
    <Card.Title>Process Rollover</Card.Title>
    <Card.Description>
      Move unused funds from {formatPeriod(fromPeriod)} to {formatPeriod(toPeriod)}
    </Card.Description>
  </Card.Header>

  <Card.Content>
    <!-- Preview before executing -->
    <Button onclick={previewRollover} variant="outline" class="mb-4">
      Preview Rollover
    </Button>

    {#if rolloverPreview}
      <div class="space-y-3">
        {#each rolloverPreview.envelopes as env}
          <div class="p-3 border rounded-md">
            <div class="flex justify-between items-center mb-2">
              <span class="font-medium">{env.categoryName}</span>
              <Badge variant={env.rolloverMode === 'reset' ? 'secondary' : 'default'}>
                {env.rolloverMode}
              </Badge>
            </div>

            <div class="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p class="text-muted-foreground">Available</p>
                <p class="font-medium">{formatCurrency(env.availableAmount)}</p>
              </div>
              <div>
                <p class="text-muted-foreground">Will Roll</p>
                <p class="font-medium">{formatCurrency(env.rolloverAmount)}</p>
              </div>
              <div>
                <p class="text-muted-foreground">Will Reset</p>
                <p class="font-medium">{formatCurrency(env.resetAmount)}</p>
              </div>
            </div>

            <!-- Rollover mode selector -->
            {#if env.hasFlexibleMode}
              <div class="mt-2">
                <Select.Root bind:value={env.rolloverMode}>
                  <Select.Trigger>Select Rollover Mode</Select.Trigger>
                  <Select.Content>
                    <Select.Item value="unlimited">Rollover All</Select.Item>
                    <Select.Item value="reset">Reset to Zero</Select.Item>
                    <Select.Item value="limited">Limited Months</Select.Item>
                  </Select.Content>
                </Select.Root>
              </div>
            {/if}
          </div>
        {/each}

        <div class="p-3 bg-primary/10 rounded-md">
          <p class="font-medium">Summary</p>
          <p class="text-sm">
            Total rolling over: {formatCurrency(rolloverPreview.totalRolling)}
          </p>
          <p class="text-sm">
            Total resetting: {formatCurrency(rolloverPreview.totalResetting)}
          </p>
        </div>
      </div>

      <div class="flex gap-2 mt-4">
        <Button onclick={executeRollover}>
          Confirm Rollover
        </Button>
        <Button variant="outline" onclick={() => rolloverPreview = null}>
          Cancel
        </Button>
      </div>
    {/if}
  </Card.Content>
</Card.Root>
```

### 4.3 Envelope Analytics

**File**: `src/lib/components/budgets/envelope-analytics.svelte` (new)

Insights and trends:

```svelte
<Tabs.Root>
  <Tabs.List>
    <Tabs.Trigger value="trends">Trends</Tabs.Trigger>
    <Tabs.Trigger value="usage">Usage</Tabs.Trigger>
    <Tabs.Trigger value="suggestions">Suggestions</Tabs.Trigger>
  </Tabs.List>

  <Tabs.Content value="trends">
    <!-- Spending trends chart -->
    <ChartContainer>
      <Chart data={trendData}>
        <Svg>
          <Area {data} x="date" y="amount" />
        </Svg>
      </Chart>
    </ChartContainer>

    <!-- Period-over-period comparison -->
    <div class="grid grid-cols-3 gap-4 mt-4">
      {#each periodComparison as period}
        <Card.Root>
          <Card.Content class="p-4">
            <p class="text-sm text-muted-foreground">{period.name}</p>
            <p class="text-2xl font-bold">{formatCurrency(period.amount)}</p>
            <p class="text-xs text-muted-foreground">
              {period.change > 0 ? '+' : ''}{period.change}% vs previous
            </p>
          </Card.Content>
        </Card.Root>
      {/each}
    </div>
  </Tabs.Content>

  <Tabs.Content value="usage">
    <!-- Most/least used envelopes -->
    <div class="space-y-3">
      <div>
        <h3 class="font-medium mb-2">Most Used (Last 3 Months)</h3>
        {#each mostUsed as env}
          <div class="flex justify-between p-2 border-b">
            <span>{env.categoryName}</span>
            <span class="font-medium">{formatCurrency(env.totalSpent)}</span>
          </div>
        {/each}
      </div>

      <div>
        <h3 class="font-medium mb-2">Rarely Used</h3>
        {#each leastUsed as env}
          <div class="flex justify-between p-2 border-b">
            <span>{env.categoryName}</span>
            <span class="text-muted-foreground">{formatCurrency(env.totalSpent)}</span>
          </div>
        {/each}
      </div>

      <!-- Deficit frequency -->
      <div>
        <h3 class="font-medium mb-2">Deficit Frequency</h3>
        {#each deficitAnalysis as env}
          <div class="p-2 border-b">
            <div class="flex justify-between mb-1">
              <span>{env.categoryName}</span>
              <span class="text-destructive">{env.deficitMonths} months</span>
            </div>
            <Progress value={(env.deficitMonths / totalMonths) * 100} />
          </div>
        {/each}
      </div>
    </div>
  </Tabs.Content>

  <Tabs.Content value="suggestions">
    <!-- AI-powered suggestions (or rule-based) -->
    <div class="space-y-3">
      {#each suggestions as suggestion}
        <Card.Root>
          <Card.Content class="p-4">
            <div class="flex items-start gap-3">
              <LightBulb class="h-5 w-5 text-yellow-500 mt-0.5" />
              <div class="flex-1">
                <p class="font-medium">{suggestion.title}</p>
                <p class="text-sm text-muted-foreground mt-1">
                  {suggestion.description}
                </p>
                {#if suggestion.action}
                  <Button variant="outline" size="sm" class="mt-2" onclick={suggestion.action}>
                    {suggestion.actionLabel}
                  </Button>
                {/if}
              </div>
            </div>
          </Card.Content>
        </Card.Root>
      {/each}
    </div>
  </Tabs.Content>
</Tabs.Root>
```

## Phase 5: Goal-Based & Scheduled Budgets

**Priority**: Medium
**Goal**: Support remaining budget types

### 5.0 Query Layer Enhancements for Goals & Schedules

**File**: `src/lib/query/budgets.ts` (enhance)

Add goal and schedule-specific query definitions:

```typescript
// Add to budgetKeys
export const budgetKeys = createQueryKeys("budgets", {
  // ... existing keys ...
  goalProgress: (budgetId: number) =>
    ["budgets", "goal-progress", budgetId] as const,
  goalMilestones: (budgetId: number) =>
    ["budgets", "goal-milestones", budgetId] as const,
  scheduledCoverage: (budgetId: number, scheduleId: number) =>
    ["budgets", "scheduled-coverage", budgetId, scheduleId] as const,
});

// Goal tracking queries using defineQuery
export const getGoalProgress = (budgetId: number) =>
  defineQuery({
    queryKey: budgetKeys.goalProgress(budgetId),
    queryFn: () => trpc().budgetRoutes.getGoalProgress.query({ budgetId }),
    options: {
      staleTime: 60 * 1000,
    },
  });

export const getScheduledCoverage = (budgetId: number, scheduleId: number) =>
  defineQuery({
    queryKey: budgetKeys.scheduledCoverage(budgetId, scheduleId),
    queryFn: () => trpc().budgetRoutes.getScheduledCoverage.query({ budgetId, scheduleId }),
    options: {
      staleTime: 5 * 60 * 1000,
    },
  });

// Goal contribution mutation using defineMutation
export const contributeToGoal = defineMutation<
  { budgetId: number; amount: number; notes?: string },
  any
>({
  mutationFn: (input) => trpc().budgetRoutes.contributeToGoal.mutate(input),
  onSuccess: (_, variables) => {
    cachePatterns.invalidatePrefix(budgetKeys.goalProgress(variables.budgetId));
    cachePatterns.invalidatePrefix(budgetKeys.detail(variables.budgetId));
  },
  successMessage: "Contribution recorded",
  errorMessage: "Failed to record contribution",
});
```

**Note**: Requires corresponding tRPC routes in `src/lib/trpc/routes/budgets.ts`

### 5.1 Goal-Based Budget UI

**File**: `src/lib/components/budgets/goal-budget-manager.svelte` (new)

Comprehensive goal tracking interface using query layer:

```svelte
<script lang="ts">
  import { getGoalProgress, contributeToGoal } from '$lib/query/budgets';

  let { budgetId } = $props<{ budgetId: number }>();

  const goalQuery = $derived(getGoalProgress(budgetId));
  const contributeMutation = $derived(contributeToGoal.options());
</script>
```

```svelte
<Card.Root>
  <Card.Header>
    <div class="flex justify-between items-start">
      <div>
        <Card.Title>{budget.name}</Card.Title>
        <Card.Description>Target: {formatCurrency(goal.target)}</Card.Description>
      </div>
      <Badge variant={getGoalStatus(goal)}>
        {getGoalStatusLabel(goal)}
      </Badge>
    </div>
  </Card.Header>

  <Card.Content class="space-y-4">
    <!-- Progress visualization -->
    <div>
      <div class="flex justify-between mb-2">
        <span class="text-sm font-medium">Progress</span>
        <span class="text-sm text-muted-foreground">
          {formatCurrency(goal.current)} / {formatCurrency(goal.target)}
          ({getPercentage(goal.current, goal.target)}%)
        </span>
      </div>
      <Progress value={getPercentage(goal.current, goal.target)} class="h-3" />
    </div>

    <!-- Timeline visualization -->
    <div>
      <div class="flex justify-between mb-2">
        <span class="text-sm font-medium">Timeline</span>
        <span class="text-sm text-muted-foreground">
          {daysRemaining} days remaining
        </span>
      </div>
      <Progress value={getTimeElapsedPercentage(goal)} class="h-2" />
    </div>

    <!-- Milestone markers -->
    <div class="relative h-12 bg-muted/30 rounded-md overflow-hidden">
      {#each milestones as milestone}
        <div
          class="absolute top-0 bottom-0 w-1 bg-primary/50"
          style="left: {(milestone.amount / goal.target) * 100}%"
        >
          <div class="absolute -top-6 left-0 text-xs whitespace-nowrap">
            {milestone.label}
          </div>
        </div>
      {/each}

      <!-- Current position marker -->
      <div
        class="absolute top-0 bottom-0 w-2 bg-primary"
        style="left: {(goal.current / goal.target) * 100}%"
      >
        <div class="absolute -top-8 left-0 text-sm font-medium">
          You are here
        </div>
      </div>
    </div>

    <!-- Contribution calculator -->
    <div class="p-4 border rounded-md">
      <p class="font-medium mb-2">To reach your goal on time:</p>

      <div class="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p class="text-muted-foreground">Per Day</p>
          <p class="font-medium">{formatCurrency(contributionPerDay)}</p>
        </div>
        <div>
          <p class="text-muted-foreground">Per Week</p>
          <p class="font-medium">{formatCurrency(contributionPerWeek)}</p>
        </div>
        <div>
          <p class="text-muted-foreground">Per Month</p>
          <p class="font-medium">{formatCurrency(contributionPerMonth)}</p>
        </div>
      </div>

      {#if isOnTrack}
        <p class="text-green-600 text-sm mt-2">
          ✓ You're on track to reach your goal!
        </p>
      {:else}
        <p class="text-destructive text-sm mt-2">
          ⚠️ You need to increase contributions by {formatCurrency(additionalNeeded)} per month
        </p>
      {/if}
    </div>

    <!-- Quick contribute -->
    <div class="flex gap-2">
      <Input
        type="number"
        bind:value={contributeAmount}
        placeholder="Amount to contribute"
        class="flex-1"
      />
      <Button onclick={contribute}>
        Contribute
      </Button>
    </div>
  </Card.Content>
</Card.Root>
```

### 5.2 Scheduled Expense Integration

**File**: `src/lib/components/budgets/scheduled-budget-manager.svelte` (new)

Link budgets to recurring schedules:

```svelte
<Card.Root>
  <Card.Header>
    <Card.Title>Scheduled Expense Budget</Card.Title>
    <Card.Description>
      Automatically allocate funds for recurring expenses
    </Card.Description>
  </Card.Header>

  <Card.Content class="space-y-4">
    <!-- Link to schedule -->
    <div>
      <Label>Linked Schedule</Label>
      <Select.Root bind:value={linkedScheduleId}>
        <Select.Trigger>
          {linkedSchedule?.name || 'Select a schedule'}
        </Select.Trigger>
        <Select.Content>
          {#each schedules as schedule}
            <Select.Item value={schedule.id}>{schedule.name}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>

    {#if linkedSchedule}
      <!-- Schedule details -->
      <div class="p-3 border rounded-md">
        <div class="flex justify-between mb-2">
          <span class="font-medium">{linkedSchedule.name}</span>
          <span class="text-sm text-muted-foreground">
            {formatRecurringPattern(linkedSchedule)}
          </span>
        </div>
        <div class="text-sm">
          Next occurrence: {formatDate(linkedSchedule.nextOccurrence)}
        </div>
        <div class="text-sm font-medium">
          Amount: {formatCurrency(linkedSchedule.amount)}
        </div>
      </div>

      <!-- Upcoming occurrences -->
      <div>
        <p class="font-medium mb-2">Upcoming in This Period</p>
        <div class="space-y-2">
          {#each upcomingOccurrences as occurrence}
            <div class="flex justify-between p-2 border rounded-md">
              <span class="text-sm">{formatDate(occurrence.date)}</span>
              <span class="text-sm font-medium">
                {formatCurrency(occurrence.amount)}
              </span>
            </div>
          {/each}

          <div class="flex justify-between p-2 bg-primary/10 rounded-md font-medium">
            <span>Total This Period</span>
            <span>{formatCurrency(totalUpcoming)}</span>
          </div>
        </div>
      </div>

      <!-- Auto-allocation settings -->
      <div class="flex items-center justify-between p-3 border rounded-md">
        <div>
          <p class="font-medium">Auto-allocate funds</p>
          <p class="text-sm text-muted-foreground">
            Automatically set aside money when periods start
          </p>
        </div>
        <Switch bind:checked={autoAllocate} />
      </div>

      <!-- Allocation status -->
      <div class="p-3 border rounded-md">
        <div class="flex justify-between items-center">
          <div>
            <p class="font-medium">Current Period Allocation</p>
            <p class="text-sm text-muted-foreground">
              {formatCurrency(allocated)} / {formatCurrency(totalUpcoming)} needed
            </p>
          </div>
          <Button
            variant="outline"
            onclick={allocateNow}
            disabled={allocated >= totalUpcoming}
          >
            {allocated >= totalUpcoming ? 'Fully Allocated' : 'Allocate Now'}
          </Button>
        </div>
        <Progress value={(allocated / totalUpcoming) * 100} class="mt-2" />
      </div>
    {/if}
  </Card.Content>
</Card.Root>
```

### 5.3 Schedule Detail Budget Display

**File**: `src/routes/schedules/[slug]/(components)/overview-tab.svelte` (enhance)

Show linked budget on schedule detail page:

```svelte
{#if linkedBudget}
  <Card.Root>
    <Card.Header>
      <Card.Title class="flex items-center gap-2 text-sm">
        <Wallet class="h-4 w-4" />
        Linked Budget
      </Card.Title>
    </Card.Header>
    <Card.Content class="space-y-2 pt-2">
      <div class="flex justify-between items-center">
        <span class="text-xs text-muted-foreground">Budget</span>
        <a href="/budgets/{linkedBudget.id}" class="text-sm font-medium hover:underline">
          {linkedBudget.name}
        </a>
      </div>
      <Separator />
      <div class="flex justify-between items-center">
        <span class="text-xs text-muted-foreground">Current Period</span>
        <span class="text-sm font-medium">
          {formatCurrency(linkedBudget.currentPeriod.allocatedAmount)}
        </span>
      </div>
      <Separator />
      <div class="flex justify-between items-center">
        <span class="text-xs text-muted-foreground">Coverage</span>
        <Badge variant={getCoverageVariant(linkedBudget.coverage)}>
          {linkedBudget.coverage}%
        </Badge>
      </div>

      {#if linkedBudget.coverage < 100}
        <p class="text-xs text-destructive mt-2">
          ⚠️ Budget may not cover all scheduled expenses this period
        </p>
      {/if}
    </Card.Content>
  </Card.Root>
{/if}
```

## Phase 6: Analytics & Reporting

**Priority**: Medium
**Goal**: Connect analytics UI to real data and add reporting features

**Current Status**: Analytics dashboard UI is complete (`budget-analytics-dashboard.svelte`) with:
- ✅ Overview cards (Total Allocated, Total Spent, Remaining, Budget Health)
- ✅ Three-tab interface (Trends, Breakdown, Performance)
- ✅ LayerChart integration with Area, Spline, and Arc charts
- ✅ Budget performance tracking and status indicators
- ✅ Alert system for overdraft and paused budgets
- ❌ Spending trends use mock random data (lines 92-100)
- ❌ No historical time-series data from backend

### 6.0 Backend Analytics Endpoints

**File**: `src/lib/trpc/routes/budgets.ts` (enhance)

Add analytics endpoints to provide real historical data:

```typescript
// Add to budgetRouter
getAnalytics: publicProcedure
  .input(z.object({
    userId: z.number(),
    dateRange: z.object({ start: z.string(), end: z.string() }).optional()
  }))
  .query(async ({ input }) => {
    // Aggregate spending data across all budgets
    // Return totals, trends, and category breakdowns
  }),

getSpendingTrends: publicProcedure
  .input(z.object({ budgetId: z.number(), months: z.number().default(6) }))
  .query(async ({ input }) => {
    // Get historical period instances for budget
    // Return time-series data: allocated vs actual by month
    // Include trend analysis and projections
  }),

getCategoryBreakdown: publicProcedure
  .input(z.object({ budgetId: z.number(), periodId: z.number() }))
  .query(async ({ input }) => {
    // For envelope budgets, break down by category
    // For other types, show transaction category distribution
    // Return with percentages and comparisons
  }),
```

### 6.1 Query Layer Enhancements for Analytics

**File**: `src/lib/query/budgets.ts` (enhance)

Add new query definitions following the established `defineQuery` pattern:

```typescript
// Add to budgetKeys
export const budgetKeys = createQueryKeys("budgets", {
  // ... existing keys ...
  analytics: (userId: number, dateRange?: { start: string; end: string }) =>
    ["budgets", "analytics", userId, dateRange] as const,
  spendingTrends: (budgetId: number, months: number) =>
    ["budgets", "trends", budgetId, months] as const,
  categoryBreakdown: (budgetId: number, periodId: number) =>
    ["budgets", "category-breakdown", budgetId, periodId] as const,
});

// New analytics queries using defineQuery
export const getBudgetAnalytics = (userId: number, dateRange?: { start: string; end: string }) =>
  defineQuery({
    queryKey: budgetKeys.analytics(userId, dateRange),
    queryFn: () => trpc().budgetRoutes.getAnalytics.query({ userId, dateRange }),
    options: {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  });

export const getSpendingTrends = (budgetId: number, months: number = 6) =>
  defineQuery({
    queryKey: budgetKeys.spendingTrends(budgetId, months),
    queryFn: () => trpc().budgetRoutes.getSpendingTrends.query({ budgetId, months }),
    options: {
      staleTime: 5 * 60 * 1000,
    },
  });

export const getCategoryBreakdown = (budgetId: number, periodId: number) =>
  defineQuery({
    queryKey: budgetKeys.categoryBreakdown(budgetId, periodId),
    queryFn: () => trpc().budgetRoutes.getCategoryBreakdown.query({ budgetId, periodId }),
    options: {
      staleTime: 2 * 60 * 1000,
    },
  });
```

### 6.2 Connect Analytics UI to Real Data

**File**: `src/lib/components/budgets/budget-analytics-dashboard.svelte` (enhance)

**Current Issue**: Lines 92-100 use mock random data for spending trends
**Goal**: Replace mock data with real historical period instances

Replace the mock spending trend calculation:

```typescript
// REMOVE: Mock data generation (lines 92-100)
const spendingTrendData = $derived.by(() => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  return months.map((month, index) => ({
    month,
    allocated: totalAllocated * (0.8 + Math.random() * 0.4),
    spent: totalSpent * (0.6 + Math.random() * 0.6),
    date: new Date(2024, index, 1)
  }));
});

// ADD: Real data from query
const trendsQuery = $derived(getSpendingTrends(budgetId, 6));
const spendingTrendData = $derived.by(() => {
  return trendsQuery.data?.trends ?? [];
});
```

**Result**: Analytics dashboard will display:
- Real historical spending patterns from period instances
- Accurate allocated vs actual comparisons over time
- True trend analysis instead of random data

### 6.3 Budget Reports

**File**: `src/lib/components/budgets/budget-reports.svelte` (new)

Exportable reports interface:

```svelte
<Card.Root>
  <Card.Header>
    <Card.Title>Budget Reports</Card.Title>
    <Card.Description>Generate and export budget reports</Card.Description>
  </Card.Header>

  <Card.Content class="space-y-4">
    <!-- Report type selector -->
    <div>
      <Label>Report Type</Label>
      <Select.Root bind:value={reportType}>
        <Select.Trigger>Select Report Type</Select.Trigger>
        <Select.Content>
          <Select.Item value="monthly-summary">Monthly Summary</Select.Item>
          <Select.Item value="variance">Variance Analysis</Select.Item>
          <Select.Item value="envelope-utilization">Envelope Utilization</Select.Item>
          <Select.Item value="goal-progress">Goal Progress</Select.Item>
          <Select.Item value="custom">Custom Report</Select.Item>
        </Select.Content>
      </Select.Root>
    </div>

    <!-- Date range -->
    <div class="grid grid-cols-2 gap-4">
      <div>
        <Label>Start Date</Label>
        <DatePicker bind:value={startDate} />
      </div>
      <div>
        <Label>End Date</Label>
        <DatePicker bind:value={endDate} />
      </div>
    </div>

    <!-- Budget filter -->
    <div>
      <Label>Budgets to Include</Label>
      <MultiSelect bind:value={selectedBudgets} options={budgets} />
    </div>

    <!-- Export format -->
    <div>
      <Label>Export Format</Label>
      <div class="flex gap-2">
        <Button variant="outline" onclick={() => exportReport('pdf')}>
          <FileText class="h-4 w-4 mr-2" />
          PDF
        </Button>
        <Button variant="outline" onclick={() => exportReport('csv')}>
          <FileSpreadsheet class="h-4 w-4 mr-2" />
          CSV
        </Button>
        <Button variant="outline" onclick={() => exportReport('excel')}>
          <FileSpreadsheet class="h-4 w-4 mr-2" />
          Excel
        </Button>
      </div>
    </div>

    <!-- Report preview -->
    {#if reportPreview}
      <div class="border rounded-md p-4 max-h-96 overflow-auto">
        <h3 class="font-medium mb-2">{reportPreview.title}</h3>
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b">
              {#each reportPreview.headers as header}
                <th class="text-left p-2">{header}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each reportPreview.rows as row}
              <tr class="border-b">
                {#each row as cell}
                  <td class="p-2">{cell}</td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Card.Content>
</Card.Root>
```

### 6.4 Budget Forecasting

**File**: `src/lib/components/budgets/budget-forecast.svelte` (new)

Predictive budget analysis:

```svelte
<Tabs.Root>
  <Tabs.List>
    <Tabs.Trigger value="projection">Projection</Tabs.Trigger>
    <Tabs.Trigger value="scenarios">What-If Scenarios</Tabs.Trigger>
    <Tabs.Trigger value="runway">Runway Calculator</Tabs.Trigger>
  </Tabs.List>

  <Tabs.Content value="projection">
    <!-- Future period projections based on trends -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Next 6 Months Projection</Card.Title>
        <Card.Description>Based on your spending patterns</Card.Description>
      </Card.Header>
      <Card.Content>
        <ChartContainer>
          <Chart data={projectionData} x="month" y="amount">
            <Svg>
              <!-- Historical data (solid line) -->
              <Area {data} y="historical" color="hsl(var(--primary))" />
              <!-- Projected data (dashed line) -->
              <Area {data} y="projected" color="hsl(var(--primary) / 0.5)" strokeDasharray="4 4" />
            </Svg>
          </Chart>
        </ChartContainer>

        <div class="mt-4 space-y-2">
          {#each projectionSummary as month}
            <div class="flex justify-between p-2 border-b">
              <span class="text-sm">{month.name}</span>
              <span class="text-sm font-medium">{formatCurrency(month.projected)}</span>
            </div>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>
  </Tabs.Content>

  <Tabs.Content value="scenarios">
    <!-- What-if scenario modeling -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Scenario Modeling</Card.Title>
      </Card.Header>
      <Card.Content class="space-y-4">
        <!-- Scenario builder -->
        <div class="p-4 border rounded-md">
          <Label>Adjust Allocations</Label>
          {#each budgets as budget}
            <div class="flex items-center gap-2 mt-2">
              <span class="text-sm flex-1">{budget.name}</span>
              <Input
                type="number"
                bind:value={scenarioAllocations[budget.id]}
                class="w-32"
              />
              <span class="text-sm text-muted-foreground">
                ({getChangePercentage(budget.id)}%)
              </span>
            </div>
          {/each}
        </div>

        <!-- Impact analysis -->
        <div class="p-4 bg-muted/30 rounded-md">
          <p class="font-medium mb-2">Impact</p>
          <div class="space-y-1 text-sm">
            <div class="flex justify-between">
              <span>Total Monthly Budget:</span>
              <span class="font-medium">
                {formatCurrency(currentTotal)} → {formatCurrency(scenarioTotal)}
              </span>
            </div>
            <div class="flex justify-between">
              <span>Change:</span>
              <span class={scenarioTotal > currentTotal ? 'text-destructive' : 'text-green-600'}>
                {scenarioTotal > currentTotal ? '+' : ''}{formatCurrency(scenarioTotal - currentTotal)}
              </span>
            </div>
          </div>
        </div>

        <Button onclick={applyScenario}>Apply This Scenario</Button>
      </Card.Content>
    </Card.Root>
  </Tabs.Content>

  <Tabs.Content value="runway">
    <!-- Financial runway calculator -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Budget Runway</Card.Title>
        <Card.Description>How long will your budget last?</Card.Description>
      </Card.Header>
      <Card.Content class="space-y-4">
        {#each goals as goal}
          <div class="p-4 border rounded-md">
            <div class="flex justify-between mb-2">
              <span class="font-medium">{goal.name}</span>
              <Badge>{goal.type}</Badge>
            </div>

            <div class="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p class="text-muted-foreground">Current</p>
                <p class="font-medium">{formatCurrency(goal.current)}</p>
              </div>
              <div>
                <p class="text-muted-foreground">Monthly Rate</p>
                <p class="font-medium">{formatCurrency(goal.monthlyRate)}</p>
              </div>
              <div>
                <p class="text-muted-foreground">Runway</p>
                <p class="font-medium">{goal.monthsRemaining} months</p>
              </div>
            </div>

            <Progress value={(goal.current / goal.target) * 100} class="mt-2" />
          </div>
        {/each}

        <!-- Seasonal adjustments -->
        <div class="p-4 bg-muted/30 rounded-md">
          <p class="font-medium mb-2">Seasonal Adjustments</p>
          <p class="text-sm text-muted-foreground">
            Based on historical data, consider increasing allocations in:
          </p>
          <ul class="text-sm mt-2 space-y-1">
            {#each seasonalSuggestions as suggestion}
              <li>• {suggestion.month}: +{formatCurrency(suggestion.increase)} ({suggestion.reason})</li>
            {/each}
          </ul>
        </div>
      </Card.Content>
    </Card.Root>
  </Tabs.Content>
</Tabs.Root>
```

## Phase 7: User Experience Enhancements

**Priority**: Low
**Goal**: Polish and improve usability

### 7.1 Budget Templates

**File**: `src/lib/components/budgets/budget-template-manager.svelte` (new)

Template system for quick budget creation:

```svelte
<div class="space-y-4">
  <!-- Template library -->
  <div>
    <h3 class="font-medium mb-2">Starter Templates</h3>
    <div class="grid grid-cols-3 gap-4">
      {#each starterTemplates as template}
        <Card.Root class="cursor-pointer hover:border-primary" onclick={() => selectTemplate(template)}>
          <Card.Content class="p-4">
            <p class="font-medium">{template.name}</p>
            <p class="text-xs text-muted-foreground mt-1">{template.description}</p>
            <div class="mt-2 text-xs">
              {template.budgetCount} budgets
            </div>
          </Card.Content>
        </Card.Root>
      {/each}
    </div>
  </div>

  <!-- Save current as template -->
  <Card.Root>
    <Card.Header>
      <Card.Title>Save Current Configuration</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-4">
      <div>
        <Label>Template Name</Label>
        <Input bind:value={templateName} placeholder="e.g., My Monthly Budget" />
      </div>

      <div>
        <Label>Description</Label>
        <Textarea bind:value={templateDescription} placeholder="What makes this budget unique?" />
      </div>

      <!-- Budget preview -->
      <div class="p-3 border rounded-md">
        <p class="text-sm font-medium mb-2">Will include:</p>
        <ul class="text-sm space-y-1">
          {#each currentBudgets as budget}
            <li>• {budget.name} ({budget.type})</li>
          {/each}
        </ul>
      </div>

      <Button onclick={saveAsTemplate}>
        <Save class="h-4 w-4 mr-2" />
        Save as Template
      </Button>
    </Card.Content>
  </Card.Root>

  <!-- Export/Import -->
  <div class="grid grid-cols-2 gap-4">
    <Card.Root>
      <Card.Content class="p-4">
        <Button variant="outline" class="w-full" onclick={exportTemplate}>
          <Download class="h-4 w-4 mr-2" />
          Export Template
        </Button>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Content class="p-4">
        <Button variant="outline" class="w-full" onclick={importTemplate}>
          <Upload class="h-4 w-4 mr-2" />
          Import Template
        </Button>
      </Card.Content>
    </Card.Root>
  </div>
</div>
```

### 7.2 Bulk Operations

**File**: `src/lib/components/budgets/budget-bulk-operations.svelte` (new)

Batch processing for efficiency:

```svelte
<Dialog.Root bind:open={bulkDialogOpen}>
  <Dialog.Content class="max-w-2xl">
    <Dialog.Header>
      <Dialog.Title>Bulk Operations</Dialog.Title>
    </Dialog.Header>

    <Tabs.Root>
      <Tabs.List>
        <Tabs.Trigger value="allocate">Allocate Transactions</Tabs.Trigger>
        <Tabs.Trigger value="fund">Fund Envelopes</Tabs.Trigger>
        <Tabs.Trigger value="status">Change Status</Tabs.Trigger>
        <Tabs.Trigger value="periods">Generate Periods</Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="allocate">
        <!-- Bulk transaction allocation -->
        <div class="space-y-4">
          <div>
            <Label>Select Unallocated Transactions</Label>
            <DataTable
              data={unallocatedTransactions}
              columns={transactionColumns}
              selectionMode="multiple"
              bind:selected={selectedTransactions}
            />
          </div>

          <div>
            <Label>Assign to Budget</Label>
            <Select.Root bind:value={bulkBudgetId}>
              <Select.Trigger>Select Budget</Select.Trigger>
              <Select.Content>
                {#each budgets as budget}
                  <Select.Item value={budget.id}>{budget.name}</Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
          </div>

          <div class="p-3 bg-muted/30 rounded-md">
            <p class="text-sm">
              {selectedTransactions.length} transactions selected
            </p>
            <p class="text-sm font-medium">
              Total amount: {formatCurrency(selectedTotal)}
            </p>
          </div>

          <Button onclick={bulkAllocate}>
            Allocate {selectedTransactions.length} Transactions
          </Button>
        </div>
      </Tabs.Content>

      <Tabs.Content value="fund">
        <!-- Bulk envelope funding -->
        <div class="space-y-4">
          <div>
            <Label>Funding Amount</Label>
            <Input type="number" bind:value={bulkFundAmount} />
          </div>

          <div>
            <Label>Distribution Method</Label>
            <Select.Root bind:value={distributionMethod}>
              <Select.Trigger>Select Method</Select.Trigger>
              <Select.Content>
                <Select.Item value="equal">Equal Distribution</Select.Item>
                <Select.Item value="proportional">Proportional to Allocations</Select.Item>
                <Select.Item value="deficit-first">Fill Deficits First</Select.Item>
                <Select.Item value="custom">Custom Percentages</Select.Item>
              </Select.Content>
            </Select.Root>
          </div>

          <!-- Preview -->
          <div class="border rounded-md p-4 max-h-64 overflow-auto">
            <p class="font-medium mb-2">Distribution Preview</p>
            {#each fundingPreview as envelope}
              <div class="flex justify-between text-sm p-1">
                <span>{envelope.categoryName}</span>
                <span class="font-medium">{formatCurrency(envelope.amount)}</span>
              </div>
            {/each}
          </div>

          <Button onclick={bulkFund}>
            Fund {fundingPreview.length} Envelopes
          </Button>
        </div>
      </Tabs.Content>

      <Tabs.Content value="status">
        <!-- Bulk status changes -->
        <div class="space-y-4">
          <div>
            <Label>Select Budgets</Label>
            <div class="max-h-64 overflow-auto border rounded-md p-2">
              {#each budgets as budget}
                <label class="flex items-center gap-2 p-2 hover:bg-muted/30 rounded">
                  <Checkbox bind:checked={selectedBudgets[budget.id]} />
                  <span>{budget.name}</span>
                  <Badge variant="outline" class="ml-auto">{budget.status}</Badge>
                </label>
              {/each}
            </div>
          </div>

          <div>
            <Label>New Status</Label>
            <Select.Root bind:value={newStatus}>
              <Select.Trigger>Select Status</Select.Trigger>
              <Select.Content>
                <Select.Item value="active">Active</Select.Item>
                <Select.Item value="inactive">Inactive</Select.Item>
                <Select.Item value="archived">Archived</Select.Item>
              </Select.Content>
            </Select.Root>
          </div>

          <Button onclick={bulkStatusChange}>
            Update {Object.keys(selectedBudgets).filter(id => selectedBudgets[id]).length} Budgets
          </Button>
        </div>
      </Tabs.Content>

      <Tabs.Content value="periods">
        <!-- Bulk period generation -->
        <div class="space-y-4">
          <div>
            <Label>Select Budgets</Label>
            <MultiSelect bind:value={selectedBudgetsForPeriods} options={activeBudgets} />
          </div>

          <div>
            <Label>Number of Periods to Generate</Label>
            <Input type="number" bind:value={periodsToGenerate} min="1" max="12" />
          </div>

          <div class="p-3 border rounded-md">
            <p class="text-sm font-medium mb-2">Preview</p>
            <p class="text-sm">
              Will create {periodsToGenerate} period(s) for {selectedBudgetsForPeriods.length} budget(s)
            </p>
            <p class="text-sm text-muted-foreground">
              Total: {periodsToGenerate * selectedBudgetsForPeriods.length} new periods
            </p>
          </div>

          <Button onclick={bulkGeneratePeriods}>
            Generate Periods
          </Button>
        </div>
      </Tabs.Content>
    </Tabs.Root>
  </Dialog.Content>
</Dialog.Root>
```

### 7.3 Mobile Responsiveness

Apply responsive design patterns across all budget components:

**Breakpoint Strategy**:
- Mobile: < 640px (single column, stacked cards)
- Tablet: 640px - 1024px (2 columns, compact controls)
- Desktop: > 1024px (3-4 columns, full features)

**Key Responsive Patterns**:

```svelte
<!-- Responsive grid -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <!-- Cards -->
</div>

<!-- Responsive tables to cards -->
<div class="hidden md:block">
  <DataTable {data} {columns} />
</div>
<div class="md:hidden space-y-2">
  {#each data as item}
    <Card.Root>
      <!-- Mobile card layout -->
    </Card.Root>
  {/each}
</div>

<!-- Responsive dialogs -->
<ResponsiveSheet bind:open={dialogOpen}>
  <!-- Content adapts to screen size -->
</ResponsiveSheet>

<!-- Touch-friendly controls -->
<Button size="lg" class="min-h-12 md:min-h-10">
  <!-- Larger on mobile -->
</Button>
```

### 7.4 Accessibility Enhancements

Ensure WCAG 2.1 AA compliance:

**ARIA Labels**:

```svelte
<Button aria-label="Allocate funds to envelope" onclick={allocate}>
  Allocate
</Button>

<Progress
  value={percentage}
  aria-valuemin="0"
  aria-valuemax="100"
  aria-valuenow={percentage}
  aria-label="Budget consumption progress"
/>

<div role="status" aria-live="polite" aria-atomic="true">
  {#if saving}
    <span class="sr-only">Saving budget...</span>
  {/if}
</div>
```

**Keyboard Navigation**:

```svelte
<div
  role="button"
  tabindex="0"
  onkeydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleAction();
    }
  }}
>
  <!-- Interactive element -->
</div>
```

**Focus Indicators**:

```css
/* Ensure visible focus rings */
.focus-visible:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}
```

**Screen Reader Announcements**:

```svelte
<div role="status" aria-live="assertive">
  {#if budgetExceeded}
    <span class="sr-only">
      Warning: Budget exceeded by {formatCurrency(excessAmount)}
    </span>
  {/if}
</div>
```

## Optional Advanced Features

### Option 1: AI-Powered Budget Suggestions

**File**: `src/lib/server/domains/budgets/ai-suggestions.ts` (new)

Machine learning-based budget optimization:

```typescript
export class BudgetAIService {
  async analyzeSpendingPatterns(userId: number) {
    // Analyze last 6 months of transactions
    // Identify spending patterns by category
    // Detect anomalies and trends
    // Return insights
  }

  async suggestBudgetAdjustments(budgetId: number) {
    // Compare allocated vs actual for past periods
    // Identify consistently over/under-allocated categories
    // Suggest percentage increases/decreases
    // Provide confidence scores
  }

  async predictFutureSpending(categoryId: number, months: number) {
    // Time series analysis of category spending
    // Account for seasonality
    // Return monthly predictions with confidence intervals
  }

  async identifyUnnecessaryCategories(userId: number) {
    // Find categories with minimal or zero spending
    // Calculate opportunity cost
    // Suggest consolidation or removal
  }

  async recommendEnvelopePercentages(income: number) {
    // Apply 50/30/20 rule or custom ratios
    // Adjust based on user's actual spending patterns
    // Return optimized allocation percentages
  }
}
```

### Option 2: Multi-Currency Support

**Schema Changes**:

```typescript
// Add currency field to budgets table
export const budgets = sqliteTable("budget", {
  // ... existing fields
  currency: text("currency").default("USD").notNull(),
});

// Exchange rate tracking
export const exchangeRates = sqliteTable("exchange_rate", {
  id: integer("id").primaryKey({autoIncrement: true}),
  fromCurrency: text("from_currency").notNull(),
  toCurrency: text("to_currency").notNull(),
  rate: real("rate").notNull(),
  effectiveDate: text("effective_date").notNull(),
  source: text("source").default("manual"),
});
```

**Features**:
- Per-budget currency selection
- Automatic exchange rate fetching
- Multi-currency reporting with consolidated view
- Currency conversion for cross-currency allocations

### Option 3: Shared/Household Budgets

**Schema**:

```typescript
export const budgetPermissions = sqliteTable("budget_permission", {
  id: integer("id").primaryKey({autoIncrement: true}),
  budgetId: integer("budget_id").references(() => budgets.id),
  userId: text("user_id").notNull(), // From auth system
  role: text("role", {enum: ["owner", "editor", "viewer"]}).notNull(),
  canAllocate: integer("can_allocate", {mode: "boolean"}).default(false),
  canViewTransactions: integer("can_view_transactions", {mode: "boolean"}).default(true),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const budgetActivityLog = sqliteTable("budget_activity_log", {
  id: integer("id").primaryKey({autoIncrement: true}),
  budgetId: integer("budget_id").references(() => budgets.id),
  userId: text("user_id").notNull(),
  action: text("action").notNull(), // "allocated", "transferred", "updated", etc.
  details: text("details", {mode: "json"}),
  timestamp: text("timestamp").default(sql`CURRENT_TIMESTAMP`),
});
```

**Features**:
- User invitation system
- Role-based permissions
- Approval workflows for large transfers
- Activity log per user
- Shared envelope management

### Option 4: Budget Alerts & Notifications

**File**: `src/lib/server/domains/budgets/notifications.ts` (new)

```typescript
export class BudgetNotificationService {
  async checkBudgetThresholds() {
    // Check all active budgets
    // Identify those approaching limits (80%, 90%, 100%)
    // Send notifications based on user preferences
  }

  async notifyPeriodEnding(budgetId: number) {
    // Alert when period ends in 3 days
    // Include rollover preview
    // Suggest actions
  }

  async notifyGoalMilestone(goalId: number, milestone: number) {
    // Celebrate goal achievements
    // 25%, 50%, 75%, 100% milestones
  }

  async notifyDeficitDetected(envelopeId: number) {
    // Immediate alert for overspending
    // Suggest fund transfer sources
  }
}

export const notificationPreferences = sqliteTable("notification_preference", {
  userId: text("user_id").primaryKey(),
  approachingLimit: integer("approaching_limit", {mode: "boolean"}).default(true),
  limitReached: integer("limit_reached", {mode: "boolean"}).default(true),
  periodEnding: integer("period_ending", {mode: "boolean"}).default(true),
  goalMilestone: integer("goal_milestone", {mode: "boolean"}).default(true),
  deficitAlert: integer("deficit_alert", {mode: "boolean"}).default(true),
  deliveryMethod: text("delivery_method", {enum: ["in-app", "email", "both"]}).default("in-app"),
});
```

### Option 5: External Integrations

**File**: `src/lib/server/integrations/budget-sync.ts` (new)

```typescript
export class BudgetIntegrationService {
  // Export to common formats
  async exportToYNAB(budgetId: number) {
    // Convert budget structure to YNAB format
    // Generate .ynab4 file
  }

  async exportToCSV(budgetId: number, periodId: number) {
    // Transaction-level export
    // Include allocations and budget info
  }

  // Import from other tools
  async importFromCSV(file: File) {
    // Parse CSV with budget data
    // Map to internal structure
    // Create budgets and periods
  }

  async importFromMint(file: File) {
    // Parse Mint export format
    // Create corresponding budgets
  }

  // Bank integration (via Plaid or similar)
  async syncBankBalance(accountId: number) {
    // Fetch current balance
    // Compare to budget expectations
    // Alert if discrepancies
  }
}
```

## Implementation Priority Summary

### Must-Have (Complete First)
1. **Wire queries into UI pages** - Connect existing reactive data layer ✓ (Query layer already built)
2. **Test data generation** - Enable UI testing and development
3. **Transaction budget allocation** - Core integration
4. **Real-time budget calculations** - Accurate consumption tracking

### Should-Have (High Value)
5. **Period management UI** - User control over periods
6. **Period auto-generation** - Reduce manual work
7. **Enhanced envelope allocation** - YNAB-style improvements
8. **Rollover processing UI** - Envelope lifecycle management

### Nice-to-Have (Polish & Features)
9. **Goal-based budgets** - Savings goals support
10. **Scheduled expense integration** - Schedule-aware budgeting
11. **Analytics data feeds** - Connect dashboard UI to real historical data (UI already complete)
12. **Budget reports** - Exportable summaries

### Polish (User Experience)
13. **Budget templates** - Quick setup
14. **Bulk operations** - Efficiency improvements
15. **Mobile responsiveness** - All devices support
16. **Accessibility** - WCAG compliance

### Optional Advanced (Future Enhancements)
17. **AI suggestions** - Machine learning insights
18. **Multi-currency** - International support
19. **Shared budgets** - Household collaboration
20. **Alerts & notifications** - Proactive warnings
21. **External integrations** - Import/export/sync

## Estimated Implementation Time

- **Phase 1 (Foundation)**: 3-5 hours (Query layer already complete, just wire into pages)
- **Phase 2 (Transaction Integration)**: 6-8 hours
- **Phase 3 (Period Management)**: 6-8 hours
- **Phase 4 (Envelope Refinements)**: 8-10 hours
- **Phase 5 (Goal & Scheduled)**: 8-10 hours
- **Phase 6 (Analytics & Reporting)**: 10-12 hours
- **Phase 7 (UX Enhancements)**: 8-12 hours

**Total Core Features**: 49-65 hours (5-7 hours saved due to existing query infrastructure)

**With Optional Features**: +30-50 hours per advanced feature

## Next Steps

1. Wire existing query layer into budget UI pages (Phase 1.1)
2. Generate test data for development (Phase 1.2)
3. Implement real-time budget calculations (Phase 1.3)
4. Add transaction budget allocation to forms (Phase 2)
5. Build out period management UI (Phase 3)
6. Polish envelope budgeting for YNAB-style experience (Phase 4)
7. Add goal and scheduled budget support (Phase 5)
8. Enhance with analytics and reporting (Phase 6)
9. Final polish with UX improvements (Phase 7)
10. Optional: Add advanced features based on user feedback
