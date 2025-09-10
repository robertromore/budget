# Claude Code Configuration

**ALWAYS use `bun` commands instead of `npm` in this project.** Command mappings: `npm install` → `bun install`, `npm run dev` → `bun run dev`, etc.

## Project Context

**Turbo monorepo** with SvelteKit budget app: Svelte 5, TypeScript, Tailwind, shadcn-svelte, tRPC, Drizzle ORM, Better Auth, SQLite.

## Monorepo Structure

**ALWAYS work within the correct workspace when making changes.**

### Directory Structure

```
├── apps/
│   └── budget/              # Main SvelteKit application
│       ├── src/             # Application source code
│       ├── tests/           # Application tests
│       ├── scripts/         # Development scripts
│       ├── drizzle/         # Database schema and migrations
│       └── *config.*        # App-specific configurations
├── packages/
│   ├── layerchart-wrapper/  # Chart components library (@layerchart-wrapper/charts)
│   └── configs/             # Shared configuration packages
│       ├── eslint/          # @budget-configs/eslint
│       ├── prettier/        # @budget-configs/prettier
│       ├── tailwind/        # @budget-configs/tailwind
│       └── typescript/      # @budget-configs/typescript
└── docs/                    # Documentation
```

### Package References

- Main app: `apps/budget/`
- Charts: `@layerchart-wrapper/charts` (not `src/lib/components/charts`)
- Configs: `@budget-configs/*`

## Import Preferences

**ALWAYS use the correct import patterns for the monorepo structure.**

### Application Code (within apps/budget/)

- **Use**: `$lib` alias when importing from `apps/budget/src/lib/`
- **Avoid**: Relative paths like `../../../lib/`

```typescript
// ✅ Correct
import { Component } from '$lib/components/ui/button'
import { db } from '$lib/server/db'
import type { Account } from '$lib/schema/accounts'

// ❌ Incorrect
import { Component } from '../../../lib/components/ui/button'
```

### Chart Components

- **Use**: `@layerchart-wrapper/charts` package imports
- **Avoid**: Direct `$lib/components/charts` imports (charts moved to package)

```typescript
// ✅ Correct
import { UnifiedChart } from '@layerchart-wrapper/charts'
import type { ChartType } from '@layerchart-wrapper/charts/config/chart-types'

// ❌ Incorrect (old location)
import { UnifiedChart } from '$lib/components/charts'
```

### Shared Configuration

- **Use**: `@budget-configs/*` package references in config files
- **Avoid**: Copying configuration between packages

```typescript
// ✅ Correct
export { default } from '@budget-configs/eslint'

// ❌ Incorrect
// Duplicating config in each package
```


## Comment and Documentation Standards

**NEVER reference previous work, changes, or transitions in comments or documentation.**

### Comment Principles

- ❌ `// Now uses the new validation system`
- ✅ `// Validates input using comprehensive sanitization`
- ❌ `// Changed from repository pattern to service layer`
- ✅ `// Service layer handles business logic and validation`
- ❌ `// TODO: Implement after refactoring is complete`
- ✅ `// TODO: Add transaction loading functionality`
- ❌ `// Updated to use the latest middleware`
- ✅ `// Uses tRPC middleware for authentication and rate limiting`

### Documentation Standards

- Document code and architecture as it currently exists
- Focus on what the code does, not what it replaced
- Avoid temporal references like "now", "updated", "changed from"
- Write comments as if this is the first implementation
- Use present tense to describe current functionality
- Remove transitional TODO comments that reference previous states


## Markdown Documentation Standards

**ALWAYS follow Google's documentation style guidelines and run markdownlint when creating or editing markdown content.**

### Style Guidelines

- Follow [Google's documentation style guide](https://google.github.io/styleguide/docguide/style.html)
- Use markdownlint to validate markdown syntax and formatting
- Ensure proper heading hierarchy (H1 → H2 → H3)
- Add language specifications to fenced code blocks
- Include proper blank lines around headings and lists
- End files with a single trailing newline

### Markdown Quality Standards

- Use language tags: ```typescript, ```bash, ```text
- Proper heading structure with blank lines
- Consistent list formatting with proper spacing
- Professional tone following Google's style principles
- **Never use emoticons or symbols** (like checkmarks, X marks, arrows) in documentation
- No bare URLs without proper link formatting
- No missing language specifications in code blocks
- No inconsistent heading spacing


## Development Commands

**Root commands:** `bun run dev/build/test/lint/format` for all workspaces
**App-specific:** `bun run dev:budget` or `turbo run dev --filter=budget`
**In workspace:** `cd apps/budget && bun run dev/db:migrate/db:seed`

## Documentation and Research Standards

**ALWAYS use Context7 MCP server** for up-to-date library docs. Pattern: resolve library ID → get docs with topics → apply knowledge.


## Form Handling Standards

**ALWAYS use SvelteKit Superforms** with `superForm()`, Zod validation, error handling, and `enhance` for progressive enhancement. Flow: client validation → server validation → success/error handling.

```typescript
// Client: superForm(data.form, {validators: zod4Client(schema), onResult: ...})
// Server: superValidate(request, zod4Server(schema)) → fail(400, {form}) or {form}
```


## Code Style Standards

**Object method shorthand:** ✅ `{method() {}}` ❌ `{method: function() {}}`


## Svelte 5 Standards

**Proper tags:** ✅ `<MyComponent></MyComponent>` ❌ `<MyComponent />` or `<svelte:component>`
**Dynamic components:** ✅ `<icon></icon>` or `<analytic.icon></analytic.icon>`


## Error Handling and Validation

**Comprehensive error handling:** Error boundaries, graceful degradation, meaningful messages, secure logging.
**Multi-layer validation:** Client, server, database with TypeScript and runtime validation.

## Performance and Accessibility

**Performance:** Efficient reactivity, lazy loading, code splitting, caching.
**Accessibility:** Semantic HTML, ARIA labels, keyboard navigation, color contrast.

## Testing Standards

**Test types:** Unit (`tests/unit/`), Integration (`tests/integration/`), Component (`tests/components/`), E2E (`tests/e2e/`).
**Coverage:** Business logic, APIs, UI, workflows, error conditions, edge cases.

## Security Practices

**Input validation:** Client/server validation, Zod schemas, HTML sanitization, CSRF protection, rate limiting.
**Auth:** Better Auth sessions, RBAC, route permissions, HTTPS, secure passwords.

## Git Workflow

**Commits:** Conventional format `type(scope): description`, focused changes, present tense.
**Branches:** Feature branches with descriptive names, small scope, PR review, delete after merge.

## Code Review Guidelines

**Checklist:** Standards compliance, error handling, test coverage, security, documentation.
**Feedback:** Constructive, specific, reasoned, respectful, collaborative.

## Monorepo Workflow

**Workspace-aware development:** Main app uses `$lib` imports, charts export as package, configs are consumed via extends/imports.

### Import Rules
1. Within `apps/budget/`: Use `$lib/`
2. Charts: `@layerchart-wrapper/charts`  
3. Configs: `@budget-configs/*`
4. Never cross workspace boundaries with relative paths

## Development Workflow Best Practices

**Incremental development:** Plan → Step 1 → Test → Step 2 → Test...
**Complex problems:** Visualization tools, comprehensive logging, test data, systematic debugging.
**Architecture-aware:** Analyze existing patterns, follow conventions, maintain consistency.


## Always Works™ Implementation Standards

**Core principle:** "Should work" ≠ "does work" - ALWAYS verify by running/testing actual functionality.

**30-Second Reality Check:** Did I run/build? Trigger exact feature? See expected result? Check errors? Would I bet $100?

**Test Requirements:** UI (click/visual), API (requests/responses), Data (DB queries), Logic (scenarios), Config (restart services).

**Quality:** Zero tolerance for unverified claims. Test before "this is fixed" statements.

## Architecture

**Monorepo:** Main app (`apps/budget/`), Charts (`packages/layerchart-wrapper/`), Configs (`packages/configs/`), Docs (`docs/`)
**Frontend:** States (`entities/`, `ui/`, `views/`), Components (domain-organized), Hooks (`ui/`), Constants
**Backend:** Domains (repository → service → routes), Shared utilities, Config, Security (multi-layer validation)

## CSS and Styling Standards

**Use theme variables:** ✅ `hsl(var(--primary))` ❌ `#3b82f6`
**Examples:** `hsl(var(--accent) / 0.15)`, `hsl(var(--primary-foreground))`, `hsl(var(--primary) / 0.3)`


## Drag-and-Drop Implementation Patterns

**ALWAYS implement drag-and-drop with proper event handling and state management to prevent conflicts.**

### Key Anti-Patterns to Avoid

- **❌ Competing event handlers**: Multiple dragover handlers updating the same state
- **❌ Rapid state toggling**: Frequent updates causing visual flickering
- **❌ Missing event propagation control**: Events bubbling uncontrolled
- **❌ Hardcoded positioning logic**: Complex conditionals for insertion points

### Best Practices for Drag-and-Drop

#### Event Handler Management

```typescript
// Prevent competing handlers
function handleDragOver(widget: WidgetConfig, e: DragEvent) {
  e.preventDefault();
  // Only handle if not over an overlay
  if (draggedWidget && dragOverDropZone === -1) {
    // Update state
  }
}

// Stop propagation for overlays
function handleOverlayDragOver(index: number, e: DragEvent) {
  e.preventDefault();
  e.stopPropagation(); // Prevent bubbling to parent
  // Update overlay state
}
```

#### State Management

```typescript
// Prevent redundant updates
if (draggedWidget && dragOverDropZone !== index) {
  dragOverDropZone = index;
  dragInsertIndex = index;
}
```

#### CSS Grid Integration

```css
/* Maintain widget sizes during drag */
.widget-grid {
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

/* Avoid grid-column: 1 / -1 which breaks sizing */
.drop-zone {
  /* Don't span full width */
}
```

### Visual Feedback Standards

- **Overlay drop zones**: Position absolutely over existing elements
- **Theme-consistent colors**: Use CSS variables for consistency  
- **Subtle effects**: Minimal blur (1px) and appropriate opacity (0.7+)
- **Clear messaging**: "Drop here" vs "Add widget here" for different actions
- **Smooth animations**: CSS transitions with cubic-bezier easing

### Drag-and-Drop Debugging

When experiencing rapid movement or conflicts:

1. **Check event propagation**: Ensure `stopPropagation()` on overlay events
2. **Verify state conditions**: Add guards to prevent redundant updates
3. **Test both directions**: Ensure left-to-right and right-to-left movement work
4. **Monitor competing handlers**: Only one handler should update state at a time


## Widget System Architecture

**ALWAYS follow the established widget patterns for dashboard functionality and data visualization.**

### Widget System Components

The widget system provides a configurable dashboard with comprehensive financial data visualization:

#### Core Architecture

- **Widget Store** (`apps/budget/src/lib/stores/widgets.svelte.ts`): Svelte 5 reactive store managing widget configuration and data calculation
- **Widget Registry** (`apps/budget/src/lib/components/widgets/widget-registry.ts`): Dynamic component loading system
- **Widget Types** (`apps/budget/src/lib/types/widgets.ts`): TypeScript definitions and widget catalog
- **Individual Widgets**: Specialized components for different data visualizations

#### Widget Implementation Pattern

```typescript
// Widget component structure
export interface WidgetProps {
  config: WidgetConfig;
  data: WidgetData;
  onUpdate?: (config: Partial<WidgetConfig>) => void;
  onRemove?: () => void;
  editMode?: boolean;
}
```

#### Data Flow Architecture

```text
Database → Widget Store → calculateWidgetData() → Individual Widgets → UI
```

### Chart Widget Standards

**ALWAYS use shadcn ChartContainer and layerchart for data visualization.**

#### Chart Implementation Pattern

```svelte
<ChartContainer config={chartConfig} class="h-full w-full">
  <Chart data={chartData} x="x" y="value" yNice>
    <Svg>
      <!-- Chart components: Area, Spline, Bars, Arc -->
    </Svg>
  </Chart>
</ChartContainer>
```

#### Supported Chart Types

- **Line/Spline Charts**: Balance trends, spending over time
- **Area Charts**: Spending patterns with filled regions  
- **Bar Charts**: Income vs expenses, monthly comparisons
- **Pie Charts**: Category breakdowns with legends

### Widget Data Calculation

**ALWAYS implement comprehensive data transformation in the widget store's `calculateWidgetData()` method.**

#### Required Data Structures

```typescript
// Widget store must provide:
{
  // Basic metrics
  balance: number;
  transactionCount: number;
  monthlyCashFlow: number;
  pendingBalance: number;
  recentActivity: number;

  // Chart data
  spendingTrend: Array<{label: string, amount: number}>;
  incomeExpenses: Array<{period: string, income: number, expenses: number}>;
  categoryBreakdown: Array<{name: string, amount: number, color: string}>;
  balanceHistory: Array<{date: string, balance: number}>;
  
  // Advanced metrics
  accountHealth: {score: number, factors: Array<{type: string, description: string}>};
  quickStats: {avgTransaction: number, totalIncome: number, totalExpenses: number};
  monthlyComparison: Array<{name: string, spending: number}>;
}
```

### Widget Configuration Standards

#### Widget Definitions

- **Default widgets**: Balance, transaction count, monthly cash flow, recent activity, pending balance
- **Chart widgets**: Spending trend, income/expenses, category pie chart, balance trend
- **Advanced widgets**: Account health, quick stats, monthly comparison
- **Size options**: Small, medium, large with responsive content
- **Settings**: Configurable periods, limits, and display options

#### Storage and Persistence

- **LocalStorage**: Widget configurations persisted with `account-dashboard-widgets` key
- **Default merging**: New widgets added when definitions expand
- **Graceful degradation**: Fallbacks for missing or invalid configurations

### Test Data Management

**ALWAYS create comprehensive test data for meaningful widget demonstrations.**

#### Test Data Categories

- **Financial Categories**: Groceries, Transportation, Dining Out, Utilities, Entertainment, Shopping, Healthcare, Salary, Freelance, Investment
- **Transaction Variety**: Multiple months, mixed statuses, diverse amounts
- **Realistic Patterns**: Monthly salary, recurring expenses, variable spending

#### Test Data Structure

```sql
-- Example realistic transaction data
INSERT INTO "transaction" (account_id, amount, category_id, status, date, notes) VALUES 
  (1, 4500.00, 8, 'cleared', '2025-01-01', 'January salary'),
  (1, -89.45, 1, 'cleared', '2025-01-02', 'Weekly grocery shopping'),
  -- Additional varied transactions across time periods
```

### Widget Development Guidelines

#### Creating New Widgets

1. **Add widget type** to `WidgetType` union in `apps/budget/src/lib/types/widgets.ts`
2. **Define widget definition** in `WIDGET_DEFINITIONS` with proper metadata
3. **Create widget component** following `WidgetProps` interface
4. **Register component** in `apps/budget/src/lib/components/widgets/widget-registry.ts`
5. **Update data calculation** in widget store's `calculateWidgetData()` method

#### Widget Responsiveness

- **Small widgets**: Single metric with minimal chrome
- **Medium widgets**: Multiple metrics with moderate detail
- **Large widgets**: Full data display with charts and comprehensive information
- **Responsive grids**: CSS Grid with `minmax(300px, 1fr)` for optimal layouts

#### Chart Configuration

- **Theme integration**: Use `hsl(var(--primary))` color variables
- **Data preparation**: Transform database results into chart-ready formats
- **Error handling**: Show "No data available" states gracefully
- **Performance**: Limit data points for smooth rendering


## Chart System Architecture

**Global types:** Import `ALL_CHART_TYPES` from `chart-types.ts` - never define locally (icons missing).
**Period filtering:** Dynamic generation based on data span (`generatePeriodOptions`, `filterDataByPeriod`).
**Components:** ChartWrapper (container), ChartRenderer (LayerChart), TypeSelector (icons), PeriodControls.
**Date handling:** Use `@internationalized/date` library consistently.


**Guidelines:** Global types, `$derived.by()` filtering, complete controls, empty states, theme variables.

## Request Quality and Accountability

**Challenge broad requests:** Pause, clarify, suggest planning for 3+ file changes.
**Enforce standards:** Ask for specifics, recommend incremental approaches, challenge anti-patterns.
**Good requests:** ✅ Specific errors/files ❌ "Fix all errors" or "Make it better"
**Goal:** Focused, well-planned, properly scoped development.

## Specialized Agents

**Available in `.claude/agents/`:** backend-api-architect (tRPC/Drizzle/Auth), code-review-specialist, documentation-specialist (markdown), frontend-ui-specialist (shadcn-svelte), layerchart-specialist (charts), query-layer-specialist (defineQuery/mutations).
**Usage:** Automatically used when tasks match expertise areas.

---

*This configuration ensures consistent tooling and accountability across all Claude Code sessions.*
