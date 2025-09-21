# Claude Code Configuration

This file contains configuration and preferences for Claude Code agents working on this project.

## Package Manager Preference

**ALWAYS use `bun` commands instead of `npm` commands in this project.**

### Command Mappings

- `npm install` → `bun install`
- `npm run dev` → `bun run dev`
- `npm run build` → `bun run build`
- `npm run test` → `bun run test`
- `npm add package` → `bun add package`
- `npm remove package` → `bun remove package`

### Benefits

- Faster package installation and script execution
- Better performance for development workflows
- Consistent with project setup and team preferences

## Project Context

This is a SvelteKit budget management application with:

- **Frontend**: SvelteKit with Svelte 5, TypeScript, Tailwind CSS, shadcn-svelte
- **Backend**: tRPC, Drizzle ORM, Better Auth, domain-driven architecture
- **Database**: SQLite (with migrations via Drizzle)
- **Architecture**: Domain-separated frontend and backend with comprehensive error handling

## Import Preferences

**ALWAYS use the `$lib` alias when importing from the `src/lib` folder.**

### Import Mappings

- **Avoid**: `import { Component } from '../../../lib/components/ui/button'`
- **Use**: `import { Component } from '$lib/components/ui/button'`
- **Avoid**: `import { db } from '../../lib/server/db'`
- **Use**: `import { db } from '$lib/server/db'`
- **Avoid**: `import type { Account } from '../lib/schema/accounts'`
- **Use**: `import type { Account } from '$lib/schema/accounts'`

### Import Benefits

- Cleaner, more readable imports
- Consistent with SvelteKit conventions
- Easier refactoring and maintenance
- Avoids relative path complexity

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

### Documentation Benefits

- Creates timeless documentation that doesn't become outdated
- Focuses on current architecture rather than historical changes
- Improves code readability for new developers
- Maintains professional documentation standards
- Prevents confusion about what is "old" vs "new" code

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

### Markdown Benefits

- Ensures consistent, professional documentation quality
- Improves readability and maintainability of documentation
- Follows industry-standard documentation practices
- Enables automated quality checking and validation

## Development Commands

- **Dev server**: `bun run dev`
- **Build**: `bun run build`
- **Test**: `bun run test` (if available)
- **Lint**: `bun run lint` (if available)
- **Type check**: `bun run typecheck` (if available)

## Documentation and Research Standards

**ALWAYS use the Context7 MCP server for up-to-date library documentation and code examples.**

### When to Use Context7

- When working with unfamiliar libraries or frameworks
- When debugging implementation issues with third-party packages
- When looking for code examples or best practices
- When checking for breaking changes between library versions
- When exploring new features or APIs

### Context7 Usage Pattern

1. **Resolve Library ID**: Use `mcp__context7__resolve-library-id` to find the correct library identifier
2. **Get Documentation**: Use `mcp__context7__get-library-docs` with specific topics for targeted information
3. **Apply Knowledge**: Use the retrieved documentation to implement solutions following current best practices

### Context7 Benefits

- Access to up-to-date library documentation and examples
- Comprehensive code snippets showing real-world usage
- Version-specific information and migration guides
- Reduces guesswork and ensures current best practices

## Form Handling Standards

**ALWAYS use SvelteKit Superforms for form handling and validation.**

### SvelteKit Superforms Best Practices

- Use `superForm()` for client-side form management with proper validation adapters
- Implement server-side validation with Zod schemas in form actions
- Handle form errors gracefully with proper error display
- Use `enhance` for progressive enhancement of forms
- Implement proper loading states and form submission feedback
- Follow the validation flow: client validation → server validation → success/error handling

### Form Implementation Pattern

```typescript
// Client-side form setup
const form = superForm(data.form, {
  validators: zod4Client(validationSchema),
  onResult: ({ result }) => {
    if (result.type === 'success') {
      // Handle success
    }
  }
});

// Server-side action
const formSchema = z.object({
  field: z.string().min(1)
});

export const actions = {
  default: async ({ request }) => {
    const form = await superValidate(request, zod4Server(formSchema));
    if (!form.valid) return fail(400, { form });
    // Process valid form data
    return { form };
  }
};
```

### Form Benefits

- Provides comprehensive form validation and error handling
- Ensures consistent form behavior across the application  
- Integrates seamlessly with SvelteKit's form handling
- Reduces boilerplate code for common form patterns

## Code Style Standards

**ALWAYS use object method shorthand syntax when defining object methods.**

### Method Definition Style

- ✅ `const obj = { method() { return 'value'; } }`
- ❌ `const obj = { method: function() { return 'value'; } }`
- ✅ `const obj = { async method() { return await promise; } }`
- ❌ `const obj = { method: async function() { return await promise; } }`

### Style Benefits

- More concise and readable code
- Consistent with modern JavaScript/TypeScript standards
- Better performance characteristics
- Cleaner syntax for method definitions

## Svelte 5 Standards

**ALWAYS use Svelte 5 runes mode patterns and avoid deprecated features.**

### Component Usage

- ✅ `<MyComponent class="styles"></MyComponent>` - Use proper opening/closing tags
- ❌ `<MyComponent class="styles" />` - Avoid self-closing syntax for components
- ✅ `<dynamicComponent class="styles"></dynamicComponent>` - Components are dynamic by default
- ❌ `<svelte:component this={dynamicComponent} />` - Deprecated in Svelte 5

### Dynamic Component Patterns

- ✅ `<analytic.icon class="h-4 w-4"></analytic.icon>` - Direct component access
- ✅ `<icon class="h-12 w-12"></icon>` - Variable component usage
- ❌ `<svelte:component this={analytic.icon} />` - Deprecated pattern

### Svelte 5 Benefits

- Components are dynamic by default, no need for `svelte:component`
- Cleaner syntax with proper component closing tags
- Better TypeScript integration and type safety
- Improved performance with runes mode

## Error Handling and Validation

**ALWAYS implement comprehensive error handling with proper user feedback.**

### Error Handling Patterns

- Use proper error boundaries and fallback UI components
- Implement graceful degradation for failed network requests
- Provide meaningful error messages to users
- Log errors appropriately for debugging while protecting sensitive data
- Handle edge cases and unexpected input gracefully

### Validation Strategy

- Validate data at multiple layers: client, server, and database
- Use TypeScript for compile-time type safety
- Implement runtime validation for user inputs and API responses
- Sanitize user inputs to prevent security vulnerabilities

## Performance and Accessibility

**ALWAYS prioritize performance and accessibility in component design.**

### Performance Guidelines

- Use Svelte's reactive features efficiently with proper state management
- Implement lazy loading for large datasets and images
- Optimize bundle size with proper code splitting
- Use appropriate caching strategies for API calls

### Accessibility Standards

- Ensure proper semantic HTML structure
- Include appropriate ARIA labels and descriptions
- Implement keyboard navigation support
- Maintain proper color contrast and focus indicators
- Test with screen readers and accessibility tools

## Testing Standards

**ALWAYS write comprehensive tests for new functionality and bug fixes.**

### Testing Strategy

- Write unit tests for business logic and utility functions
- Create integration tests for API endpoints and database operations
- Implement component tests for UI functionality
- Add end-to-end tests for critical user workflows
- Test error conditions and edge cases thoroughly

### Test Organization

- Unit tests: `tests/unit/` - Fast, isolated tests for pure functions
- Integration tests: `tests/integration/` - Database and API testing
- Component tests: `tests/components/` - UI component behavior
- E2E tests: `tests/e2e/` - Full user journey testing

## Security Practices

**ALWAYS implement security best practices at every layer.**

### Input Validation

- Validate all user inputs on both client and server sides
- Use type-safe validation schemas (Zod) for API endpoints
- Sanitize HTML content to prevent XSS attacks
- Implement proper CSRF protection for forms
- Rate limit API endpoints to prevent abuse

### Authentication & Authorization

- Use secure session management with Better Auth
- Implement proper role-based access control
- Validate permissions on every protected route
- Use HTTPS in production environments
- Implement secure password policies

## Git and Development Workflow

**ALWAYS follow consistent Git practices for clean project history.**

### Commit Standards

- Use conventional commit format: `type(scope): description`
- Write clear, concise commit messages
- Keep commits focused on single changes
- Include issue references where applicable
- Use present tense in commit messages

### Branch Strategy

- Create feature branches for new functionality
- Use descriptive branch names (e.g., `feature/user-authentication`)
- Keep branches small and focused
- Delete branches after merging
- Use pull requests for code review

## Code Review Guidelines

**ALWAYS conduct thorough code reviews before merging.**

### Review Checklist

- Verify code follows project standards and conventions
- Check for proper error handling and edge cases
- Ensure tests cover new functionality
- Validate security considerations
- Confirm documentation is updated
- Test functionality manually if needed

### Review Feedback

- Provide constructive, specific feedback
- Explain the reasoning behind suggestions
- Focus on code quality and maintainability
- Be respectful and collaborative
- Address all feedback before approving

## Development Workflow Best Practices

**ALWAYS follow incremental development patterns for complex changes to ensure reliability and maintainability.**

### Planning and Implementation Strategy

#### Break Down Complex Changes

- **❌ Don't ask for**: "Implement a complete authentication system with all features"
- **✅ Do ask for**: "Create a plan for authentication, then implement it step by step"
- Request a detailed plan first, then implement each step incrementally
- Test each step thoroughly before proceeding to the next
- Validate functionality at each milestone before adding complexity

**Example Incremental Workflow:**

```text
Plan → Implement Step 1 → Test → Implement Step 2 → Test → Continue...
```

### Complex Problem Solving

#### Visualization for Complex Logic

For intricate algorithms, data transformations, or architectural decisions:

- **Request code to visualize the problem**: Create debugging utilities, data loggers, or visual representations
- **Generate comprehensive test data**: Build datasets that expose edge cases and boundary conditions
- **Create debugging tools**: Implement logging, state snapshots, or step-by-step execution traces
- **Document decision trees**: Map out conditional logic and data flow patterns

#### Systematic Debugging Process

When implementations fail or behave unexpectedly:

1. **Add Comprehensive Logging**
   - Request detailed logging at each step of the failing process
   - Log input parameters, intermediate values, and output results
   - Include timing information and execution paths

2. **Capture and Save Logs**
   - Run the failing code with logging enabled
   - Save logs to files for systematic analysis
   - Create reproducible test cases that trigger the issue

3. **Iterative Analysis**
   - Review logs systematically to identify failure points
   - Compare expected vs actual values at each step
   - Repeat the logging and analysis cycle until root cause is found

### Architecture-Aware Development

#### Respect Existing Code Patterns

Before implementing new features:

- **Analyze existing codebase**: Understand current architecture and design patterns
- **Follow established conventions**: Match existing file organization, naming patterns, and separation of concerns
- **Avoid monolithic solutions**: Don't put all changes in one file if the codebase uses distributed architecture
- **Maintain consistency**: Use the same state management, error handling, and data flow patterns

**Example Analysis Request:**

```text
"Before adding this feature, examine how similar functionality is implemented. 
Show me the patterns for file organization, state management, and error handling, 
then implement following these same patterns."
```

### Implementation Guidelines

- Request detailed plans for any change involving 2+ files
- Ask for visualization tools when dealing with complex data transformations
- Implement systematic logging for any failing functionality
- Always analyze existing code patterns before implementing new features
- Test each step independently before proceeding

### Workflow Benefits

- **Reduced Risk**: Small, tested increments minimize breaking changes
- **Better Debugging**: Issues are isolated and easier to diagnose
- **Improved Quality**: Each step can be thoroughly reviewed and optimized
- **Maintainable Code**: Solutions follow established patterns and are easier to understand

## Always Works™ Implementation Standards

**ALWAYS ensure implementations are thoroughly tested and verified before claiming completion.**

### Core Philosophy

- **"Should work" ≠ "does work"** - Pattern matching and theoretical correctness aren't sufficient
- **Problem-solving focus** - The goal is solving problems, not just writing code
- **Verification requirement** - Untested code is just a guess, not a solution
- **User trust priority** - Every failed implementation erodes confidence and wastes time

### The 30-Second Reality Check

**Must answer YES to ALL before claiming completion:**

- ✅ **Did I run/build the code?** - Actual execution, not theoretical analysis
- ✅ **Did I trigger the exact feature I changed?** - Test the specific functionality modified
- ✅ **Did I see the expected result with my own observation?** - Visual/GUI confirmation included
- ✅ **Did I check for error messages?** - Console, logs, and user-facing errors reviewed
- ✅ **Would I bet $100 this works?** - Personal confidence test for thoroughness

### Phrases to Avoid

These phrases indicate insufficient verification:

- ❌ "This should work now"
- ❌ "I've fixed the issue" (especially on 2nd+ attempt)
- ❌ "Try it now" (without testing it first)
- ❌ "The logic is correct so..."
- ❌ "Based on the code, it appears to..."

### Specific Test Requirements

#### UI Changes

- Actually click buttons, links, and submit forms
- Verify visual changes appear correctly
- Test responsive behavior across screen sizes
- Check accessibility features (keyboard navigation, screen readers)

#### API Changes

- Make actual HTTP requests to modified endpoints
- Test both success and error scenarios
- Verify request/response data structures
- Check authentication and authorization

#### Data Changes

- Query the database directly to confirm changes
- Verify data integrity and constraints
- Test edge cases and boundary conditions
- Check for unintended side effects

#### Logic Changes

- Run the specific scenarios that were modified
- Test both expected and unexpected inputs
- Verify error handling paths
- Check performance implications

#### Configuration Changes

- Restart services and verify they load correctly
- Test configuration in target environments
- Validate environment variables and settings
- Check for breaking changes in dependent systems

### The Embarrassment Test

**Ask yourself:** "If the user records themselves trying this feature and it fails, will I feel embarrassed watching their frustration?"

This test ensures you're considering the user experience and the impact of failed implementations.

### Time Reality Check

- **Time saved by skipping tests**: 30 seconds
- **Time wasted when it doesn't work**: 30+ minutes
- **User trust lost**: Immeasurable and difficult to rebuild

### User Perspective

A user encountering the same bug for the third time isn't thinking:

- ❌ "This AI is trying hard and learning"

They're thinking:

- ✅ "Why am I wasting time with this unreliable tool?"

### Implementation Verification Checklist

Before marking any task as complete:

1. **Execute the code** in the actual environment
2. **Test the specific feature** that was modified
3. **Verify expected behavior** through direct observation
4. **Check for errors** in all relevant logs and outputs
5. **Test edge cases** that could break the implementation
6. **Confirm user experience** meets expectations

### Quality Standards

- **Zero tolerance** for claiming completion without verification
- **Thorough testing** before any "this is fixed" statements
- **Honest communication** about what was tested vs. assumed
- **User-first mentality** in all implementation decisions

## Architecture Notes

### Frontend Organization

- States: `entities/`, `ui/`, `views/`
- Components: Domain-organized with index.ts exports
- Hooks: UI-focused in `hooks/ui/`
- Constants: Centralized in `constants/`

### Backend Organization  

- Domains: `server/domains/` with repository → service → routes pattern
- Shared: Common utilities in `server/shared/`
- Config: Centralized configuration in `server/config/`
- Security: Multi-layer validation and error handling

## CSS and Styling Standards

**ALWAYS use predefined CSS variables from the theme instead of hardcoded colors.**

### Color Usage Guidelines

- **✅ Use theme variables**: `hsl(var(--primary))`, `hsl(var(--accent) / 0.15)`
- **❌ Avoid hardcoded colors**: `rgba(99, 102, 241, 0.9)`, `#3b82f6`
- **✅ Support dark mode**: Theme variables automatically adapt
- **✅ Maintain consistency**: Colors match the design system

### Theme Variable Examples

```css
/* Background colors */
background: hsl(var(--accent) / 0.15);
color: hsl(var(--primary-foreground));

/* Borders and shadows */
border: 2px solid hsl(var(--primary) / 0.3);
box-shadow: 0 4px 12px hsl(var(--foreground) / 0.1);
```

### Styling Benefits

- **Automatic theme support**: Works in both light and dark modes
- **Design system consistency**: Maintains brand coherence
- **Maintainable code**: Easy to update colors centrally
- **Accessible contrast**: Theme colors designed for proper accessibility

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

### Implementation Benefits

- **Smooth user experience**: No rapid movement or visual glitches
- **Bidirectional support**: Works for all movement directions
- **Professional appearance**: Uses design system colors and effects
- **Maintainable code**: Clear separation of concerns between handlers

## Widget System Architecture

**ALWAYS follow the established widget patterns for dashboard functionality and data visualization.**

### Widget System Components

The widget system provides a configurable dashboard with comprehensive financial data visualization:

#### Core Architecture

- **Widget Store** (`src/lib/stores/widgets.svelte.ts`): Svelte 5 reactive store managing widget configuration and data calculation
- **Widget Registry** (`src/lib/components/widgets/widget-registry.ts`): Dynamic component loading system
- **Widget Types** (`src/lib/types/widgets.ts`): TypeScript definitions and widget catalog
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

1. **Add widget type** to `WidgetType` union in `src/lib/types/widgets.ts`
2. **Define widget definition** in `WIDGET_DEFINITIONS` with proper metadata
3. **Create widget component** following `WidgetProps` interface
4. **Register component** in `src/lib/components/widgets/widget-registry.ts`
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

### Widget System Benefits

- **Modular architecture**: Easy to add new widget types
- **User customization**: Drag-and-drop reordering and show/hide controls
- **Rich visualizations**: Professional charts with theme support
- **Responsive design**: Works across device sizes
- **Data-driven**: Comprehensive financial metrics and trends

## Chart System Architecture

**ALWAYS use global chart type definitions and implement proper period filtering for dynamic, user-friendly chart interfaces.**

### Core Chart Components

The chart system provides a flexible, reusable architecture for data visualization:

#### Component Structure

- **ChartWrapper** (`src/lib/components/charts/chart-wrapper.svelte`): Main container with controls and period filtering
- **ChartRenderer** (`src/lib/components/charts/chart-renderer.svelte`): LayerChart integration and visualization logic
- **ChartTypeSelector** (`src/lib/components/charts/chart-type-selector.svelte`): Dropdown for switching chart types with icons
- **ChartPeriodControls** (`src/lib/components/charts/chart-period-controls.svelte`): Time period filtering buttons

#### Global Chart Type System

```typescript
// All chart types defined globally in chart-types.ts
export const ALL_CHART_TYPES: ChartTypeGroup[] = [
  {
    label: 'Line & Area',
    options: [
      { value: 'line', label: 'Line Chart', icon: LineChart, description: 'Connected points showing trends' },
      { value: 'area', label: 'Area Chart', icon: TrendingUp, description: 'Filled area under the line' }
    ]
  },
  // Additional groups...
];
```

### Chart Implementation Patterns

#### Using Global Chart Types

**✅ Always use global definitions:**

```typescript
import { ALL_CHART_TYPES } from '$lib/components/charts/chart-types';

// Filter for supported chart types
const availableChartTypes = $derived(() => {
  const supportedTypes = ['bar', 'line', 'area'];
  return ALL_CHART_TYPES.flatMap(group => 
    group.options.filter(option => supportedTypes.includes(option.value))
  );
});
```

**❌ Never define chart types locally:**

```typescript
// DON'T DO THIS - icons will be missing
const availableChartTypes = [
  { value: 'bar', label: 'Bar Chart', icon: null, description: '...' }
];
```

#### Period Filtering Implementation

**✅ Use dynamic period generation:**

```typescript
import { generatePeriodOptions, filterDataByPeriod } from '$lib/utils/chart-periods';

// Generate periods based on actual data
const availablePeriods = $derived.by(() => {
  if (!enablePeriodFiltering) return [];
  return generatePeriodOptions(data, dateField);
});

// Filter data reactively
const filteredData = $derived.by(() => {
  if (!enablePeriodFiltering) return data;
  return filterDataByPeriod(data, dateField, currentPeriod);
});
```

### Period Filtering System

The period filtering system provides intelligent time-based data filtering:

#### Key Utilities (`src/lib/utils/chart-periods.ts`)

- **`generatePeriodOptions()`**: Analyzes data to create appropriate time periods
- **`filterDataByPeriod()`**: Filters arrays based on date fields and period keys
- **`getPeriodStartDate()`**: Converts period keys to DateValue objects

#### Automatic Period Generation

The system automatically generates meaningful periods based on data span:

- **Datasets < 6 months**: All Time only
- **Datasets 6+ months**: All Time, Last 3 Months
- **Datasets 12+ months**: All Time, Last 3/6 Months  
- **Datasets 18+ months**: All Time, Last 3/6/12 Months
- **Current year data**: Adds "Year to Date" option

### Chart Type Selector with Icons

#### Icon Integration

**✅ Proper icon display in both trigger and dropdown:**

```svelte
<!-- Trigger button shows selected chart type with icon -->
<Select.Trigger>
  <div class="flex items-center gap-2">
    {#if selectedChartTypeOption()}
      {@const option = selectedChartTypeOption()!}
      <option.icon class="h-4 w-4" />
      <span>{option.label}</span>
    {/if}
  </div>
</Select.Trigger>

<!-- Dropdown options show all available types with icons -->
<Select.Item>
  <div class="flex items-center gap-2">
    <option.icon class="h-4 w-4" />
    <div class="flex flex-col">
      <span>{option.label}</span>
      <span class="text-xs text-muted-foreground">{option.description}</span>
    </div>
  </div>
</Select.Item>
```

### Date Handling Standards

**ALWAYS use @internationalized/date library for all date operations:**

```typescript
import { CalendarDate, type DateValue } from "@internationalized/date";
import { parseDateValue, currentDate } from "$lib/utils/dates";

// Parse dates consistently
const itemDate = parseDateValue(item[dateField]);
if (itemDate && itemDate.compare(startDate) >= 0) {
  // Process filtered data
}
```

### Chart System Benefits

- **Consistent UX**: All charts use the same controls and visual patterns
- **Global Icon System**: Icons defined once, used everywhere with full type safety
- **Intelligent Period Filtering**: Automatically generates appropriate time periods based on data
- **LayerChart Integration**: Professional visualizations with comprehensive chart type support
- **Reactive Data Flow**: Real-time updates when users change chart types or time periods
- **Accessibility**: Full keyboard navigation and screen reader support

### Chart Development Guidelines

1. **Always import global chart types** - Never define chart icons locally
2. **Use derived values for period filtering** - Reactive data filtering with $derived.by()
3. **Implement both chart and period controls** - Complete user control over visualization
4. **Handle empty states gracefully** - Show appropriate messages when no data available
5. **Use consistent styling** - Follow theme variables and design system patterns

## Request Quality and Accountability Standards

**ALWAYS hold the user accountable to follow best practices and challenge requests that don't meet quality standards.**

### When User Requests Are Too Broad

Instead of immediately implementing broad requests, Claude should:

- **Pause and clarify**: "This request is quite broad. Let me break it down into specific steps first. Would you like me to create a plan for [specific task], or did you have a particular aspect in mind?"
- **Suggest planning**: "This involves multiple files/components. Should I create a plan first so you can review the approach before I start implementing?"
- **Ask for specifics**: "Can you share the specific error message or file you're referring to? This will help me give you a more targeted solution."

### When User Skips Planning for Complex Tasks

For multi-step changes involving 3+ files or significant architecture changes:

- **Recommend incremental approach**: "This is a substantial change. Would you prefer I implement this in steps so we can test each part, or do you want the full implementation at once?"
- **Suggest breaking down**: "I notice you're asking me to modify multiple unrelated files. Based on your guidelines, would you prefer I tackle these as separate, focused tasks instead?"

### Accountability Enforcement

Claude must:

✅ **Pause and ask** before diving into broad requests  
✅ **Suggest planning** for complex multi-step tasks  
✅ **Ask for specifics** when requests are vague  
✅ **Recommend incremental approaches** for large changes  
✅ **Follow established patterns** and remind user when something might break them  
✅ **Challenge anti-patterns** and suggest better approaches

### Examples of Good vs Bad Requests

**Good (Specific and Focused):**
- ✅ "Fix the TypeScript error on line 45 in chart-wrapper.svelte"
- ✅ "Add a delete button to the transaction card component"
- ✅ "Create a plan for implementing user authentication"

**Bad (Too Broad):**
- ❌ "Fix all the errors"
- ❌ "Add authentication to the app"
- ❌ "Make the dashboard better"

### Goal

Keep development focused, effective, and aligned with project best practices by ensuring all requests are specific, well-planned, and properly scoped.

## Specialized Agents

**Specialized agent definitions are stored in `.claude/agents/` directory.**

Available specialized agents:

- **backend-api-architect** (`.claude/agents/backend-api-architect.md`) - Expert in tRPC backend, API routes, Drizzle ORM database operations, Better Auth authentication, and backend service integration. Specializes in `src/lib/schema`, `src/lib/server/db`, and `src/lib/trpc` folders.

- **code-review-specialist** (`.claude/agents/code-review-specialist.md`) - Expert in conducting thorough code reviews, analyzing code quality, identifying potential issues, and ensuring adherence to project standards. Provides comprehensive feedback on architecture, performance, security, and maintainability.

- **documentation-specialist** (`.claude/agents/documentation-specialist.md`) - Expert in creating, editing, and maintaining markdown documentation files including README files, technical documentation, API docs, and project guides. Follows Google's documentation style guide and markdown best practices.

- **frontend-ui-specialist** (`.claude/agents/frontend-ui-specialist.md`) - Expert in building user interfaces using Shadcn Svelte, Shadcn Svelte Extras, Tailwind CSS, and the packages/ui folder structure. Handles UI components, design patterns, styling, and frontend-specific challenges.

- **layerchart-specialist** (`.claude/agents/layerchart-specialist.md`) - Expert in LayerChart components, data visualization, chart system architecture, performance optimization, and chart debugging. Use for all chart-related tasks.

- **query-layer-specialist** (`.claude/agents/query-layer-specialist.md`) - Expert in the query layer including defineQuery/defineMutation, error transformations from service errors to TRPCError, RPC namespace patterns, reactive/imperative interfaces, cache updates, and optimistic UI patterns.

**Usage:** Claude Code automatically uses specialized agents when tasks match their expertise areas. Agent definitions contain comprehensive knowledge areas, implementation patterns, and architectural understanding specific to each domain.

## Scheduled Transactions Feature

**Upcoming scheduled transactions are now displayed in the accounts transactions tab with visual indicators.**

### Feature Overview

The scheduled transactions feature shows upcoming transactions that are about to be created automatically based on schedule configurations. This provides users with visibility into their financial future without cluttering the view with infinite upcoming transactions.

### Implementation Architecture

#### Core Components

- **ScheduleService** (`src/lib/server/domains/schedules/services.ts`): Calculates upcoming transactions based on schedule frequency
- **TransactionService** (`src/lib/server/domains/transactions/services.ts`): Combines real and upcoming transactions
- **tRPC Endpoint** (`src/lib/trpc/routes/transactions.ts`): `forAccountWithUpcoming` endpoint for unified data access
- **Query Layer** (`src/lib/query/transactions.ts`): `getAllAccountTransactionsWithUpcoming` with client-side filtering

#### Data Flow Architecture

```text
Schedule Database → ScheduleService.getUpcomingScheduledTransactionsForAccount()
→ TransactionService.getAccountTransactionsWithUpcoming()
→ tRPC forAccountWithUpcoming
→ Query Layer filtering/sorting
→ UI Display
```

### Key Features

#### Upcoming Transaction Generation

- **Time Window**: Shows transactions for the next 30 days only
- **Deduplication**: Automatically excludes dates that already have transactions
- **Smart Amount Calculation**: Handles range amounts by using average of min/max
- **Frequency Support**: Daily, weekly, monthly, and yearly schedules

#### Visual Indicators

- **Status Column**: Blue calendar icon distinguishes scheduled transactions
- **ID Column**: Shows em dash (—) instead of long composite IDs for cleaner display
- **Transaction Status**: Uses "scheduled" status for semantic correctness

#### Data Structure

```typescript
export interface UpcomingScheduledTransaction {
  id: string; // Format: "schedule-{scheduleId}-{date}"
  scheduleId: number;
  scheduleName: string;
  accountId: number;
  amount: number;
  date: string;
  payeeId: number | null;
  categoryId: number | null;
  notes: string; // Format: "Scheduled: {scheduleName}"
  status: "scheduled";
  createdAt: string;
  updatedAt: string;
  deletedAt: null;
  balance: null; // No balance calculation for future transactions
}
```

### UI Integration

#### Status Cell Component

The status cell (`data-table-editable-status-cell.svelte`) displays different icons based on transaction status:

- **Cleared**: Green checkmark (SquareCheck)
- **Pending**: Empty square (Square)
- **Scheduled**: Blue calendar icon (Calendar)

#### Columns Configuration

The ID column in `columns.svelte.ts` shows a dash for scheduled transactions with string IDs to avoid displaying long composite identifiers.

### Technical Implementation Details

#### Schedule Date Calculation

The system uses the existing schedule date configuration to calculate when upcoming transactions should appear:

- **Start Date**: When the schedule begins
- **End Date**: Optional schedule termination
- **Frequency**: daily, weekly, monthly, yearly
- **Interval**: How often (every 1 week, every 2 months, etc.)

#### Error Handling

- **Missing Schedule Data**: Gracefully skips schedules without date configuration
- **Invalid Frequencies**: Safely handles unknown frequency types
- **Database Issues**: Console warnings for debugging without breaking the UI

#### Performance Considerations

- **30-Day Limit**: Prevents infinite upcoming transactions from impacting performance
- **Client-Side Filtering**: Combined data is filtered and sorted in the query layer
- **Efficient Queries**: Only fetches active auto-add schedules for the specific account

### Database Dependencies

The feature requires proper database relationships:

- **Schedules Table**: Must have valid `schedule_date_id` foreign key
- **Schedule Dates Table**: Must contain frequency and date range information
- **Auto-Add Enabled**: Schedules must have `auto_add = 1` and `status = 'active'`

### Usage Benefits

- **Financial Planning**: Users can see upcoming transactions before they're created
- **Cash Flow Visibility**: Better understanding of future account balance changes
- **Schedule Verification**: Visual confirmation that schedules are configured correctly
- **Seamless Integration**: Upcoming transactions appear alongside real transactions with clear visual distinction

### Development Guidelines

When working with scheduled transactions:

1. **Use proper type guards** for differentiating real vs scheduled transactions
2. **Maintain visual consistency** with status indicators and formatting
3. **Handle edge cases** like missing schedule data gracefully
4. **Test with various schedule frequencies** to ensure accurate date calculations
5. **Verify database relationships** are correct for schedule date functionality

---

*This configuration ensures consistent tooling and accountability across all Claude Code sessions.*
