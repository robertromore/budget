# Claude Code Configuration

This file contains configuration and preferences for Claude Code agents working
on this project.

## Package Manager Preference

**ALWAYS use `bun` commands instead of `npm` commands in this project.**

### Command Mappings

- `npm install` → `bun install`
- `npm run dev` → `bun run dev`
- `npm run build` → `bun run build`
- `npm run test` → `bun run test`
- `npm add package` → `bun add package`
- `npm remove package` → `bun remove package`

## Project Context

This is a SvelteKit budget management application with:

- **Frontend**: SvelteKit with Svelte 5, TypeScript, Tailwind CSS, shadcn-svelte
- **Backend**: tRPC, Drizzle ORM, Better Auth, domain-driven architecture
- **Database**: SQLite (with migrations via Drizzle)
- **Architecture**: Domain-separated frontend and backend with comprehensive
  error handling

## Import Preferences

**ALWAYS use the `$lib` alias when importing from the `src/lib` folder.**

### Import Mappings

- **Avoid**: `import { Component } from '../../../lib/components/ui/button'`
- **Use**: `import { Component } from '$lib/components/ui/button'`
- **Avoid**: `import { db } from '../../lib/server/db'`
- **Use**: `import { db } from '$lib/server/db'`
- **Avoid**: `import type { Account } from '../lib/schema/accounts'`
- **Use**: `import type { Account } from '$lib/schema/accounts'`

## Comment and Documentation Standards

**NEVER reference previous work, changes, or transitions in comments or
documentation.**

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

**ALWAYS follow Google's documentation style guidelines and run markdownlint
when creating or editing markdown content.**

### Style Guidelines

- Follow
  [Google's documentation style guide](https://google.github.io/styleguide/docguide/style.html)
- Use markdownlint to validate markdown syntax and formatting
- Ensure proper heading hierarchy (H1 → H2 → H3)
- Add language specifications to fenced code blocks
- Include proper blank lines around headings and lists
- End files with a single trailing newline

### Markdown Quality Standards

- Use language tags: `typescript, `bash, ```text
- Proper heading structure with blank lines
- Consistent list formatting with proper spacing
- Professional tone following Google's style principles
- **Never use emoticons or symbols** (like checkmarks, X marks, arrows) in
  documentation
- No bare URLs without proper link formatting
- No missing language specifications in code blocks
- No inconsistent heading spacing

## Development Commands

- **Dev server**: `bun run dev`
- **Build**: `bun run build`
- **Test**: `bun run test`
- **Lint**: `bun run lint`
- **Type check**: `bun run check`
- **DB migrate**: `bun run db:migrate`
- **DB studio**: `bun run db:studio`

## Svelte MCP Server

**You are able to use the Svelte MCP server, where you have access to
comprehensive Svelte 5 and SvelteKit documentation.**

### Available MCP Tools

1. **list-sections**: Use FIRST to discover all available documentation sections
2. **get-documentation**: Retrieves full documentation content for specific
   sections
3. **svelte-autofixer**: Analyzes Svelte code and returns issues and suggestions
   (MUST use before sending code to user)
4. **playground-link**: Generates a Svelte Playground link (ask user first,
   never use if code written to files)

### Svelte MCP Usage Pattern

1. **Discover Sections**: Use `mcp__svelte-llm__list_sections` to see all
   available documentation
2. **Analyze Relevance**: Review the use_cases field to identify which sections
   are needed
3. **Fetch Documentation**: Use `mcp__svelte-llm__get_documentation` to retrieve
   all relevant sections
4. **Validate Code**: Use `svelte-autofixer` to check Svelte code before
   delivery
5. **Share Playground**: Optionally generate playground links for user
   experimentation

## Form Handling Standards

**ALWAYS use SvelteKit Superforms for form handling and validation.**

### SvelteKit Superforms Best Practices

- Use `superForm()` for client-side form management with proper validation
  adapters
- Implement server-side validation with Zod schemas in form actions
- Handle form errors gracefully with proper error display
- Use `enhance` for progressive enhancement of forms
- Implement proper loading states and form submission feedback
- Follow the validation flow: client validation → server validation →
  success/error handling

## Code Style Standards

**ALWAYS use object method shorthand syntax when defining object methods.**

### Method Definition Style

- ✅ `const obj = { method() { return 'value'; } }`
- ❌ `const obj = { method: function() { return 'value'; } }`
- ✅ `const obj = { async method() { return await promise; } }`
- ❌ `const obj = { method: async function() { return await promise; } }`

## Svelte 5 Standards

**ALWAYS use Svelte 5 runes mode patterns and avoid deprecated features.**

### Component Usage

- ✅ `<MyComponent class="styles"></MyComponent>` - Use proper opening/closing
  tags
- ❌ `<MyComponent class="styles" />` - Avoid self-closing syntax for components
- ✅ `<dynamicComponent class="styles"></dynamicComponent>` - Components are
  dynamic by default
- ❌ `<svelte:component this={dynamicComponent} />` - Deprecated in Svelte 5

### Dynamic Component Patterns

- ✅ `<analytic.icon class="h-4 w-4"></analytic.icon>` - Direct component access
- ✅ `<icon class="h-12 w-12"></icon>` - Variable component usage
- ❌ `<svelte:component this={analytic.icon} />` - Deprecated pattern

### Binding with Getter/Setter Pairs

**Svelte 5 supports `bind:value={get, set}` syntax for components that need
bidirectional binding.**

Available utility functions in `$lib/utils/bind-helpers.ts`:

#### createRecordAccessors

Use when binding to a field in a Record that might be undefined:

```svelte
<script lang="ts">
  import { createRecordAccessors } from '$lib/utils/bind-helpers';

  let formData = $state<Record<string, string>>({});
  const nameAccessors = createRecordAccessors(formData, 'name', '');
</script>

<Input bind:value={nameAccessors.get, nameAccessors.set} />
```

#### createMapAccessors

Use when binding to a Map entry:

```svelte
<script lang="ts">
  import { createMapAccessors } from '$lib/utils/bind-helpers';

  let myMap = $state(new Map<string, number>());
  const countAccessors = createMapAccessors(myMap, 'count', 0);
</script>

<Input bind:value={countAccessors.get, countAccessors.set} />
```

#### createNumericRecordAccessors

Use when binding to numeric Record values:

```svelte
<script lang="ts">
  import { createNumericRecordAccessors } from '$lib/utils/bind-helpers';

  let allocations = $state<Record<number, number>>({});
  const accessors = createNumericRecordAccessors(allocations, categoryId, 0);
</script>

<NumericInput bind:value={accessors.get, accessors.set} />
```

#### createTransformAccessors

Use when binding to local state with type transformations or simple
getter/setter logic:

```svelte
<script lang="ts">
  import { createTransformAccessors } from '$lib/utils/bind-helpers';

  let periodType = $state<'monthly' | 'yearly'>('monthly');
  const accessors = createTransformAccessors(
    () => periodType,
    (value: string) => {
      periodType = value as 'monthly' | 'yearly';
    }
  );
</script>

<Select.Root bind:value={accessors.get, accessors.set}>
  <!-- options -->
</Select.Root>
```

#### When to Use Each Pattern

**Use createRecordAccessors when:**

- Binding to Record fields that might be undefined
- Need default values for missing Record keys

**Use createMapAccessors when:**

- Binding to Map entries
- Need default values for missing Map keys

**Use createNumericRecordAccessors when:**

- Binding to numeric Record values
- Need default numeric values for missing keys

**Use createTransformAccessors when:**

- Binding to local `$state` variables with simple type transformations
- Need basic getter/setter pairs without complex logic
- Want cleaner syntax for simple transformations

**Use inline accessors when:**

- Need custom setter logic with side effects (e.g., updating related fields)
- Binding requires validation or business logic
- Want maximum flexibility and control
- The logic is specific to one component and won't be reused

##### Example: Inline Accessor with Side Effects

```svelte
<script lang="ts">
  let accountType = $state('checking');

  function handleAccountTypeChange(newType: string) {
    accountType = newType;
    // Perform side effects
    updateIcon(newType);
    updateDefaults(newType);
  }

  const typeAccessors = {
    get: () => accountType,
    set: (value: string) => handleAccountTypeChange(value),
  };
</script>

<Select.Root bind:value={typeAccessors.get, typeAccessors.set}>
  <!-- options -->
</Select.Root>
```

#### Never Use $derived for Accessors

Do NOT wrap accessor objects in `$derived` unless the object itself needs to be
recreated when dependencies change (very rare):

```svelte
<!-- ❌ WRONG - Unnecessary overhead -->
const accessors = $derived({
  get: () => value,
  set: (v) => { value = v; }
});

<!-- ✅ CORRECT - Simple object -->
const accessors = {
  get: () => value,
  set: (v) => { value = v; }
};
```

The getter function is already reactive because it reads from reactive `$state`.
The accessor object doesn't need to be reactive.

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

**ALWAYS follow incremental development patterns for complex changes to ensure
reliability and maintainability.**

### Planning and Implementation Strategy

#### Break Down Complex Changes

- **❌ Don't ask for**: "Implement a complete authentication system with all
  features"
- **✅ Do ask for**: "Create a plan for authentication, then implement it step
  by step"
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

- **Request code to visualize the problem**: Create debugging utilities, data
  loggers, or visual representations
- **Generate comprehensive test data**: Build datasets that expose edge cases
  and boundary conditions
- **Create debugging tools**: Implement logging, state snapshots, or
  step-by-step execution traces
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

- **Analyze existing codebase**: Understand current architecture and design
  patterns
- **Follow established conventions**: Match existing file organization, naming
  patterns, and separation of concerns
- **Avoid monolithic solutions**: Don't put all changes in one file if the
  codebase uses distributed architecture
- **Maintain consistency**: Use the same state management, error handling, and
  data flow patterns

## Always Works™ Implementation Standards

**ALWAYS ensure implementations are thoroughly tested and verified before
claiming completion.**

### Core Philosophy

- **"Should work" ≠ "does work"** - Pattern matching and theoretical correctness
  aren't sufficient
- **Problem-solving focus** - The goal is solving problems, not just writing
  code
- **Verification requirement** - Untested code is just a guess, not a solution
- **User trust priority** - Every failed implementation erodes confidence and
  wastes time

### The 30-Second Reality Check

**Must answer YES to ALL before claiming completion:**

- ✅ **Did I run/build the code?** - Actual execution, not theoretical analysis
- ✅ **Did I trigger the exact feature I changed?** - Test the specific
  functionality modified
- ✅ **Did I see the expected result with my own observation?** - Visual/GUI
  confirmation included
- ✅ **Did I check for error messages?** - Console, logs, and user-facing errors
  reviewed
- ✅ **Would I bet $100 this works?** - Personal confidence test for
  thoroughness

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

**Ask yourself:** "If the user records themselves trying this feature and it
fails, will I feel embarrassed watching their frustration?"

This test ensures you're considering the user experience and the impact of
failed implementations.

### Time Reality Check

- **Time saved by skipping tests**: 30 seconds
- **Time wasted when it doesn't work**: 30+ minutes
- **User trust lost**: Immeasurable and difficult to rebuild

### Implementation Verification Checklist

Before marking any task as complete:

1. **Execute the code** in the actual environment
2. **Test the specific feature** that was modified
3. **Verify expected behavior** through direct observation
4. **Check for errors** in all relevant logs and outputs
5. **Test edge cases** that could break the implementation
6. **Confirm user experience** meets expectations

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

**ALWAYS use predefined CSS variables from the theme instead of hardcoded
colors.**

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

## Drag-and-Drop Implementation Patterns

**ALWAYS implement drag-and-drop with proper event handling and state management
to prevent conflicts.**

### Key Anti-Patterns to Avoid

- **❌ Competing event handlers**: Multiple dragover handlers updating the same
  state
- **❌ Rapid state toggling**: Frequent updates causing visual flickering
- **❌ Missing event propagation control**: Events bubbling uncontrolled
- **❌ Hardcoded positioning logic**: Complex conditionals for insertion points

### Best Practices for Drag-and-Drop

#### Event Handler Management

```typescript
// Prevent competing handlers
function handleDragOver(widget: WidgetConfig, e: DragEvent) {
  e.preventDefault();
  if (draggedWidget && dragOverDropZone === -1) {
    // Update state
  }
}

// Stop propagation for overlays
function handleOverlayDragOver(index: number, e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();
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

## Widget System Architecture

**ALWAYS follow the established widget patterns for dashboard functionality and
data visualization.**

### Widget System Components

- **Widget Store** (`src/lib/stores/widgets.svelte.ts`): Svelte 5 reactive store
  managing widget configuration and data calculation
- **Widget Registry** (`src/lib/components/widgets/widget-registry.ts`): Dynamic
  component loading system
- **Widget Types** (`src/lib/types/widgets.ts`): TypeScript definitions and
  widget catalog
- **Individual Widgets**: Specialized components for different data
  visualizations

### Widget Configuration Standards

#### Widget Definitions

- **Default widgets**: Balance, transaction count, monthly cash flow, recent
  activity, pending balance
- **Chart widgets**: Spending trend, income/expenses, category pie chart,
  balance trend
- **Advanced widgets**: Account health, quick stats, monthly comparison
- **Size options**: Small, medium, large with responsive content
- **Settings**: Configurable periods, limits, and display options

#### Storage and Persistence

- **LocalStorage**: Widget configurations persisted with
  `account-dashboard-widgets` key
- **Default merging**: New widgets added when definitions expand
- **Graceful degradation**: Fallbacks for missing or invalid configurations

## Chart System Architecture

**ALWAYS use global chart type definitions and implement proper period filtering
for dynamic, user-friendly chart interfaces.**

### Core Chart Components

- **ChartWrapper**: Main container with controls and period filtering
- **ChartRenderer**: LayerChart integration and visualization logic
- **ChartTypeSelector**: Dropdown for switching chart types with icons
- **ChartPeriodControls**: Time period filtering buttons

### Chart Implementation Patterns

#### Using Global Chart Types

**✅ Always use global definitions:**

```typescript
import { ALL_CHART_TYPES } from '$lib/components/charts/chart-types';

const availableChartTypes = $derived(() => {
  const supportedTypes = ['bar', 'line', 'area'];
  return ALL_CHART_TYPES.flatMap((group) =>
    group.options.filter((option) => supportedTypes.includes(option.value))
  );
});
```

**❌ Never define chart types locally** - icons will be missing

#### Period Filtering Implementation

**✅ Use dynamic period generation:**

```typescript
import {
  generatePeriodOptions,
  filterDataByPeriod,
} from '$lib/utils/chart-periods';

const availablePeriods = $derived.by(() => {
  if (!enablePeriodFiltering) return [];
  return generatePeriodOptions(data, dateField);
});

const filteredData = $derived.by(() => {
  if (!enablePeriodFiltering) return data;
  return filterDataByPeriod(data, dateField, currentPeriod);
});
```

### Date Handling Standards

**ALWAYS use @internationalized/date as the primary date library for all date
operations.**

#### Consolidated Date Library Architecture

- **Primary Library**: `@internationalized/date` for all date operations
- **Chart Integration**: Native Date objects only for LayerChart/D3
  compatibility
- **Database**: ISO string storage with @internationalized/date parsing
- **Removed Libraries**: `date-fns` has been completely eliminated (~30KB bundle
  reduction)

#### Core Date Utilities (`$lib/utils/dates.ts`)

```typescript
import { CalendarDate, type DateValue } from '@internationalized/date';
import {
  parseDateValue,
  parseISOString,
  toISOString,
  formatDateDisplay,
  dateDifference,
  isSamePeriod,
  currentDate,
} from '$lib/utils/dates';

// Parse various date formats to DateValue
const dateValue = parseDateValue(someDate) || currentDate;

// Parse ISO strings from database
const dbDate = parseISOString('2024-01-15');

// Convert DateValue to ISO string for storage
const isoString = toISOString(dateValue);

// Format dates for display
const formatted = formatDateDisplay(dateValue, 'short'); // "01/15/2024"

// Date comparisons (replaces date-fns)
const daysDiff = dateDifference(date1, date2, 'days');
const sameMonth = isSamePeriod(date1, date2, 'month');
```

#### Chart Library Integration

```typescript
// LayerChart and D3 require native Date objects
const jsDate = dateValue.toDate(timezone);

// Use in chart data processing
const chartData = data.map((item) => ({
  date: parseISOString(item.date)?.toDate(timezone),
  value: item.amount,
}));
```

## Request Quality and Accountability Standards

**ALWAYS hold the user accountable to follow best practices and challenge
requests that don't meet quality standards.**

### When User Requests Are Too Broad

Instead of immediately implementing broad requests, Claude should:

- **Pause and clarify**: "This request is quite broad. Let me break it down into
  specific steps first. Would you like me to create a plan for [specific task],
  or did you have a particular aspect in mind?"
- **Suggest planning**: "This involves multiple files/components. Should I
  create a plan first so you can review the approach before I start
  implementing?"
- **Ask for specifics**: "Can you share the specific error message or file
  you're referring to? This will help me give you a more targeted solution."

### When User Skips Planning for Complex Tasks

For multi-step changes involving 3+ files or significant architecture changes:

- **Recommend incremental approach**: "This is a substantial change. Would you
  prefer I implement this in steps so we can test each part, or do you want the
  full implementation at once?"
- **Suggest breaking down**: "I notice you're asking me to modify multiple
  unrelated files. Based on your guidelines, would you prefer I tackle these as
  separate, focused tasks instead?"

### Accountability Enforcement

Claude must:

✅ **Pause and ask** before diving into broad requests ✅ **Suggest planning**
for complex multi-step tasks ✅ **Ask for specifics** when requests are vague ✅
**Recommend incremental approaches** for large changes ✅ **Follow established
patterns** and remind user when something might break them ✅ **Challenge
anti-patterns** and suggest better approaches

## Custom Claude Commands

**Custom slash commands are defined in `.claude/commands/` directory.**

### Available Commands

- **/fix** - Analyze and fix issues in the codebase with systematic debugging
- **/new-domain** - Create a new domain following the established architecture
  (repository, service, routes)
- **/new-query** - Create new query/mutation definitions following the query
  layer patterns
- **/review** - Conduct comprehensive code review with architecture analysis
- **/help-docs** - Manage and create help documentation content
- **/create_plan** - Create implementation plans for project-specific tasks
- **/create_plan_generic** - Create implementation plans for general tasks

### Command Usage

Invoke commands using the slash prefix:

```bash
/fix src/lib/components/broken-component.svelte
/new-domain invoices
/review src/routes/accounts/
```

## Specialized Agents

**Specialized agent definitions are stored in `.claude/agents/` directory.**

Available specialized agents:

- **backend-api-architect** - Expert in tRPC backend, API routes, Drizzle ORM
  database operations, Better Auth authentication, and backend service
  integration
- **code-review-specialist** - Expert in conducting thorough code reviews,
  analyzing code quality, and ensuring adherence to project standards
- **documentation-specialist** - Expert in creating, editing, and maintaining
  markdown documentation files following Google's style guide
- **frontend-ui-specialist** - Expert in building user interfaces using Shadcn
  Svelte, Tailwind CSS, and UI components
- **layerchart-specialist** - Expert in LayerChart components, data
  visualization, and chart system architecture
- **query-layer-specialist** - Expert in the query layer including
  defineQuery/defineMutation, error transformations, and cache updates

**Usage:** Claude Code automatically uses specialized agents when tasks match
their expertise areas.

## Project Structure Overview

**The budget application follows a monorepo architecture with clear separation
between application and shared packages.**

### Monorepo Structure

- **apps/budget**: Main SvelteKit budget application
- **packages/ui**: Shared UI components library (shadcn-svelte components)
- **Root Configuration**: Shared tooling configuration (TypeScript, ESLint,
  Tailwind)

### Main Application Directories

```text
apps/budget/
├── src/
│   ├── lib/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── ai-elements/  # AI chat interface components
│   │   │   ├── help/         # Contextual help system
│   │   │   ├── intelligence-input/  # AI-powered form assistance
│   │   │   └── ...           # Domain-specific components
│   │   ├── content/
│   │   │   └── help/         # Help documentation markdown files
│   │   ├── server/           # Backend domain logic
│   │   │   ├── ai/           # AI services and tools
│   │   │   │   ├── commands/ # Chat command handlers
│   │   │   │   ├── tools/    # AI tool definitions
│   │   │   │   ├── prompts/  # System prompts
│   │   │   │   └── providers/# LLM provider integrations
│   │   │   ├── domains/      # Domain-driven service modules
│   │   │   ├── config/       # Server configuration
│   │   │   └── shared/       # Shared utilities
│   │   ├── schema/           # Database schema definitions
│   │   ├── trpc/             # tRPC routers and middleware
│   │   ├── query/            # Query layer (TanStack Query)
│   │   ├── states/           # Frontend state management
│   │   │   └── ui/           # UI state (ai-chat, help, intelligence-input)
│   │   ├── types/            # TypeScript type definitions
│   │   ├── utils/            # Utility functions
│   │   └── constants/        # Application constants
│   ├── routes/               # SvelteKit file-based routing
│   │   ├── settings/intelligence/  # AI settings pages
│   │   └── payees/cleanup/   # Payee cleanup utilities
│   └── tests/
│       ├── unit/             # Unit tests
│       ├── integration/      # Integration tests
│       └── e2e/              # End-to-end tests
├── drizzle/                  # Database migrations
├── training-data/            # AI fine-tuning data and scripts
└── static/                   # Static assets
```

### Key Architectural Patterns

#### Domain-Driven Design

- **Clear boundaries**: Each domain encapsulates its own data and logic
- **Service-oriented**: Business logic separated from data access
- **Type safety**: Strong TypeScript types throughout the stack

#### Repository Pattern

- **Data access layer**: All database queries through repository modules
- **Query optimization**: Efficient joins and aggregations using Drizzle
- **Reusability**: Common queries extracted and shared

#### Service Layer

- **Business logic**: Validation, transformation, and orchestration
- **Cross-domain coordination**: Services can call other domain services
- **Error handling**: Custom error types (ValidationError, NotFoundError,
  ConflictError)

#### Query Layer

- **Client-side data fetching**: TanStack Query for reactive data management
- **Cache management**: Automatic invalidation and optimistic updates
- **Imperative/reactive**: Both `.execute()` and `.options()` patterns supported

## Technology Stack Reference

**Complete technology stack with versions and usage patterns for the budget
application.**

### Framework and Runtime

- **SvelteKit 2.47.0**: Full-stack framework with file-based routing
- **Svelte 5.40.1**: Frontend framework with runes mode
- **TypeScript 5.8.3**: Type-safe development across the stack
- **Bun 1.2.23**: Package manager and runtime
- **Vite 7.1.10**: Build tool and development server
- **svelte-adapter-bun 1.0.0**: Production deployment adapter

### Database and ORM

- **SQLite**: Embedded database for local-first architecture
- **Drizzle ORM 0.44.6**: Type-safe database queries and migrations
- **drizzle-kit 0.38.5**: Schema management and migration tooling

### Backend Stack

- **tRPC 11.6.0**: End-to-end type-safe API layer
- **Zod 4.1.12**: Schema validation and parsing
- **Better Auth**: Authentication and session management
- **Rate Limiting**: API endpoint protection

### UI Component Libraries

- **shadcn-svelte 1.0.8**: Core design system components
- **bits-ui 2.11.7**: Headless UI primitives
- **Tailwind CSS 4.1.14**: Utility-first styling
- **tailwindcss-animate 1.0.7**: Animation utilities
- **clsx 2.1.1**: Class name utilities
- **tailwind-merge 2.7.2**: Tailwind class merging
- **tailwind-variants 0.4.0**: Component variant management

### Data Visualization

- **LayerChart 2.0.0-next.42**: Professional chart components
- **D3 Libraries**: d3-scale, d3-shape, d3-array, d3-format, d3-time

### State Management

- **TanStack Query 6.0.2**: Server state and cache management
- **Svelte 5 Runes**: Built-in reactive state ($state, $derived, $effect)
- **Context API**: Component-level state sharing

### Form Handling

- **sveltekit-superforms 2.27.4**: Form validation and submission
- **zod-form-data 2.0.2**: Form data parsing with Zod schemas

### Date Handling

- **@internationalized/date 3.10.0**: Primary date library for all operations
- **Date Utilities**: Custom utilities in `$lib/utils/dates.ts`

### Import and Parsing

- **papaparse 5.5.3**: CSV file parsing
- **fast-xml-parser 5.3.0**: XML/OFX/QFX file parsing

### Testing Infrastructure

- **Vitest 3.2.4**: Unit and integration testing
- **Playwright 1.56.0**: End-to-end testing
- **@testing-library/svelte 6.0.1**: Component testing utilities
- **@faker-js/faker 9.4.0**: Test data generation

### Development Tools

- **ESLint**: Code linting with Svelte and TypeScript support
- **Prettier**: Code formatting with Svelte plugin
- **svelte-check**: Type checking and validation
- **Turborepo**: Monorepo task orchestration

### Icons and Assets

- **lucide-svelte 0.469.0**: Icon library

### Utility Libraries

- **mode-watcher 0.5.1**: Dark mode management
- **fuzzysort 3.2.1**: Fuzzy string matching for search
- **nanoid 5.1.0**: Unique ID generation

## Core Domain Models

**Comprehensive entity descriptions and database relationships for the budget
application.**

### Database Architecture

#### Accounts

Primary entity for financial account management.

**Core Fields:**

- `id`, `name`, `type` (checking, savings, credit_card, investment, hsa,
  debt_account)
- `balance`, `initial_balance`, `is_budget`, `currency`, `notes`

**HSA-Specific:** `is_hsa`, `hsa_contribution_limit`,
`hsa_employer_contribution`

**Debt-Specific:** `debt_type`, `debt_interest_rate`, `debt_minimum_payment`,
`debt_payoff_goal_date`

**Metadata:** `created_at`, `updated_at`, `deleted_at`

#### Transactions

Financial transaction records with import support.

**Core Fields:**

- `id`, `account_id`, `amount`, `date`, `status` (cleared, pending, scheduled,
  reconciled), `notes`

**Relationships:**

- `payee_id`, `category_id`, `transfer_id` (foreign keys, nullable)

**Import Metadata:**

- `imported` (boolean), `rawImportData` (JSON field)

**Split Transaction Support:**

- `parent_transaction_id`, `is_split`

**Timestamps:** `created_at`, `updated_at`, `deleted_at`

#### Categories

Hierarchical category organization with tax tracking.

**Core Fields:**

- `id`, `name`, `parent_category_id`, `is_income`, `is_tax_related`, `color`,
  `icon`

**Analytics:** `average_spending`, `total_spending`, `transaction_count`

**Metadata:** `notes`, `created_at`, `updated_at`, `deleted_at`

#### Payees

Entity representing transaction payees with normalization support.

**Core Fields:**

- `id`, `name`, `normalized_name`

**Default Associations:**

- `default_category_id` (nullable)

**Analytics:** `transaction_count`, `total_amount`

**Metadata:** `notes`, `created_at`, `updated_at`, `deleted_at`

#### Schedules

Recurring transaction templates.

**Core Fields:**

- `id`, `name`, `account_id`, `amount`, `amount_min`, `amount_max`, `status`
  (active, paused, completed)

**Relationships:**

- `payee_id`, `category_id`, `schedule_date_id`

**Automation:** `auto_add` (boolean)

**Metadata:** `notes`, `created_at`, `updated_at`, `deleted_at`

#### Schedule Dates

Frequency configuration for recurring schedules.

**Core Fields:**

- `id`, `start_date`, `end_date`, `frequency` (daily, weekly, monthly, yearly),
  `interval`

**Weekly Configuration:** `days_of_week` (JSON array)

**Monthly Configuration:** `day_of_month`

**Yearly Configuration:** `month_of_year`, `day_of_month`

**Metadata:** `created_at`, `updated_at`, `deleted_at`

#### Budgets

Budget tracking with multiple types (in design phase).

**Core Fields:**

- `id`, `name`, `type` (account_monthly, category_envelope, goal_based,
  scheduled_expense)
- `enforcement` (none, warning, strict), `metadata` (JSON)

**Period Configuration:** `budget_period_template_id`

**Junction Tables:** `budget_accounts`, `budget_categories`,
`budget_transactions`, `budget_group_memberships`

**Metadata:** `created_at`, `updated_at`, `deleted_at`

#### Views

Saved table configurations with filters and sorting.

**Core Fields:**

- `id`, `name`, `entity_type`, `is_default`, `is_global`

**Configuration:**

- `filters` (JSON), `sort_column`, `sort_direction`, `visible_columns` (JSON),
  `grouping` (JSON)

**Metadata:** `created_at`, `updated_at`, `deleted_at`

#### Medical Expenses / HSA Claims

HSA-specific expense tracking.

**Core Fields:**

- `id`, `transaction_id`, `amount`, `date`, `provider`, `description`
- `claim_status` (pending, submitted, approved, denied, paid)

**Receipt Management:** `receipt_url`

**Metadata:** `created_at`, `updated_at`, `deleted_at`

### Database Relationship Diagram

```text
Accounts (1) ----< (N) Transactions
Accounts (1) ----< (N) Schedules
Accounts (1) ----< (N) Medical Expenses (HSA)

Categories (1) ----< (N) Transactions
Categories (1) ----< (N) Schedules
Categories (1) ----< (N) Payees (default)
Categories (1) ----< (N) Categories (parent-child)

Payees (1) ----< (N) Transactions
Payees (1) ----< (N) Schedules

Schedule Dates (1) ----< (N) Schedules

Transactions (1) ----< (1) Transactions (transfers)
Transactions (1) ----< (N) Transactions (splits)
Transactions (1) ----< (N) Medical Expenses

Budgets (1) ----< (N) Budget Period Instances
Budgets (N) ----< (N) Accounts (via budget_accounts)
Budgets (N) ----< (N) Categories (via budget_categories)
Budgets (N) ----< (N) Transactions (via budget_transactions)

Views (scoped to entity types)
```

### Key Design Patterns

- **Soft Deletes**: All entities support `deleted_at` for reversible deletions
- **Normalized Payees**: Fuzzy matching on `normalized_name` for import
  intelligence
- **Hierarchical Categories**: Unlimited nesting depth with parent-child
  relationships
- **Transfer Linking**: Bidirectional transaction references for account
  transfers
- **Import Metadata**: Raw import data preserved for auditing and re-processing
- **Flexible Schedules**: Complex recurring patterns with date configuration
- **Type-Specific Fields**: HSA and debt fields coexist with standard account
  fields

## Key Features and Architecture

### Account Management

**Multi-type account system with specialized tracking capabilities.**

#### Account Types

- **Checking/Savings**: Standard banking accounts with balance tracking
- **Credit Cards**: Negative balance accounts with debt management
- **Investment Accounts**: Portfolio tracking with goal integration
- **HSA Accounts**: Healthcare savings with contribution limits and expense
  tracking
- **Debt Accounts**: Loan and mortgage tracking with payoff calculations

#### Balance Tracking

- **Real-time Balance**: Calculated from initial balance plus transaction sum
- **Pending Balance**: Includes pending transactions for cash flow planning
- **Balance History**: Historical tracking for trend analysis
- **Multi-currency Support**: ISO currency codes with conversion capabilities

### Transaction System

**Comprehensive transaction management with import capabilities and real-time
updates.**

#### Import System

**Multi-format financial data import with intelligent matching.**

##### Supported Formats

- **QFX/OFX Files**: Quicken and Money file formats
- **CSV Files**: Customizable column mapping
- **XML Parsing**: Fast-xml-parser for OFX processing
- **Encoding Support**: Handles various character encodings

##### Import Process

1. **File Upload**: Drag-and-drop or file picker
2. **Format Detection**: Automatic format recognition
3. **Data Parsing**: Extract transactions from file structure
4. **Column Mapping**: User-configurable field mapping (CSV only)
5. **Validation**: Check for required fields and data types
6. **Matching**: Intelligent payee and category suggestions
7. **Preview**: Review before committing to database
8. **Import**: Create transactions with import metadata

##### Intelligent Matching

- **Payee Matching**: Fuzzy matching with confidence scores (exact, high,
  medium)
- **Category Suggestions**: Based on payee history and transaction patterns
- **Duplicate Detection**: Prevents importing same transactions twice
- **Metadata Preservation**: Raw import data stored for auditing

#### Split Transactions

- **Parent-Child Relationship**: Link splits to parent transaction
- **Automatic Reconciliation**: Ensure splits sum to parent amount
- **Category Distribution**: Allocate amounts across categories

#### Transfer Linking

- **Bidirectional Links**: Transactions reference each other
- **Balance Neutrality**: Ensures zero-sum across accounts
- **Automatic Creation**: Option to create matching transfer

### Category System

**Hierarchical category organization with analytics and tax tracking.**

- **Unlimited Nesting**: Categories can have multiple levels
- **Tax Tracking**: Mark categories for tax reporting
- **Category Analytics**: Average spending, total spending, transaction count

### Payee Management

**Intelligent payee system with normalization and analytics.**

#### Normalization

- **Lowercase Storage**: All payee names normalized to lowercase
- **Fuzzy Matching**: Find similar payee names during import
- **Duplicate Prevention**: Detect and merge duplicate payees

#### Default Categories

- **Auto-Assignment**: Link payees to default categories
- **Learning System**: Suggests categories based on history

### Schedule System

**Flexible recurring transaction templates with automatic creation.**

#### Recurring Patterns

- **Daily**: Every N days
- **Weekly**: Specific days of week, every N weeks
- **Monthly**: Specific day of month, every N months
- **Yearly**: Specific month and day, every N years

#### Auto-Add Feature

- **Automatic Creation**: Creates transactions on schedule dates
- **30-Day Window**: Shows upcoming scheduled transactions
- **Deduplication**: Skips dates with existing transactions

### View System

**Saved table configurations with filters, sorting, and grouping.**

- **Column Visibility**: Show/hide specific columns
- **Sort Order**: Sort by any column, ascending or descending
- **Filter Definitions**: Complex filter criteria
- **Grouping**: Group by category, payee, date, etc.

### Widget Dashboard

**Configurable dashboard with financial data visualizations.**

- **Metric Widgets**: Balance, transaction count, cash flow
- **Chart Widgets**: Spending trends, category breakdowns
- **Advanced Widgets**: Account health scores, quick stats
- **Drag-and-Drop**: Reorder widgets on dashboard

### HSA Tracking

**Healthcare savings account with medical expense management.**

- **Contribution Tracking**: Annual limits and employer contributions
- **Medical Expenses**: Link transactions to healthcare expenses
- **Receipt Upload**: Attach receipts to claims
- **Claim Status**: Track pending, submitted, approved, denied, paid

## Code Patterns Deep Dive

### State Management

**Multi-layered reactive state using Svelte 5 runes and context-based state
classes.**

#### Svelte 5 Runes

**$state - Reactive State:**

```typescript
let count = $state(0);
let user = $state({ name: 'John', email: 'john@example.com' });

class AccountsState {
  accounts = $state<Account[]>([]);
  selectedAccountId = $state<number | null>(null);
}
```

**$derived - Computed Values:**

```typescript
let doubled = $derived(count * 2);

let filteredAccounts = $derived.by(() => {
  return accounts.filter((account) => account.balance > 0);
});
```

**$effect - Side Effects:**

```typescript
$effect(() => {
  console.log(`Count is now ${count}`);
  return () => console.log('Effect cleanup');
});
```

#### Context-Based State Classes

```typescript
// src/lib/states/accounts.svelte.ts
import { getContext, setContext } from 'svelte';

const ACCOUNTS_STATE_KEY = Symbol('accounts-state');

export class AccountsState {
  accounts = $state<Account[]>([]);
  selectedAccountId = $state<number | null>(null);

  selectedAccount = $derived.by(() => {
    return this.accounts.find((a) => a.id === this.selectedAccountId);
  });

  setAccounts(accounts: Account[]) {
    this.accounts = accounts;
  }
}

export function setAccountsState() {
  const state = new AccountsState();
  setContext(ACCOUNTS_STATE_KEY, state);
  return state;
}

export function getAccountsState(): AccountsState {
  return getContext(ACCOUNTS_STATE_KEY);
}
```

### Query Layer Architecture

**Type-safe data fetching with TanStack Query and tRPC integration.**

#### defineQuery Pattern

```typescript
import { createQuery } from '@tanstack/svelte-query';
import { trpc } from '$lib/trpc/client';

export function getAllAccountTransactions(accountId: number) {
  // Reactive query options
  const options = () => ({
    queryKey: ['transactions', 'account', accountId],
    queryFn: () => trpc.transactions.forAccount.query({ accountId }),
    enabled: accountId > 0,
  });

  // Imperative execution
  async function execute() {
    return await trpc.transactions.forAccount.query({ accountId });
  }

  return { options, execute };
}
```

#### defineMutation Pattern

```typescript
import { createMutation, useQueryClient } from '@tanstack/svelte-query';
import { toast } from 'svelte-sonner';

export function createTransaction() {
  const queryClient = useQueryClient();

  const options = () => ({
    mutationFn: (data: CreateTransactionInput) =>
      trpc.transactions.create.mutate(data),
    onSuccess: (transaction) => {
      toast.success('Transaction created successfully');
      queryClient.invalidateQueries({
        queryKey: ['transactions', 'account', transaction.accountId],
      });
    },
    onError: (error: TRPCError) => {
      toast.error(error.message || 'Failed to create transaction');
    },
  });

  async function execute(data: CreateTransactionInput) {
    try {
      const result = await trpc.transactions.create.mutate(data);
      toast.success('Transaction created successfully');
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed';
      toast.error(message);
      throw error;
    }
  }

  return { options, execute };
}
```

### Domain Service Pattern

**Three-layer architecture: Repository, Service, and Routes.**

#### Repository Layer

```typescript
// src/lib/server/domains/transactions/repository.ts
import { db } from '$lib/server/db';
import { transactions, accounts, categories, payees } from '$lib/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export async function findById(id: number) {
  const [transaction] = await db
    .select()
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(payees, eq(transactions.payeeId, payees.id))
    .where(and(eq(transactions.id, id), eq(transactions.deletedAt, null)))
    .limit(1);

  return transaction;
}

export async function create(data: InsertTransaction) {
  const [transaction] = await db.insert(transactions).values(data).returning();

  return transaction;
}
```

#### Service Layer

```typescript
// src/lib/server/domains/transactions/services.ts
import * as repository from './repository';
import { ValidationError, NotFoundError } from '$lib/server/shared/errors';

export async function createTransaction(data: CreateTransactionInput) {
  // Validation
  if (data.amount === 0) {
    throw new ValidationError('Transaction amount cannot be zero');
  }

  // Business logic
  const transaction = await repository.create({
    ...data,
    status: data.status ?? 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Update account balance
  await accountsService.updateBalance(data.accountId, data.amount);

  return transaction;
}
```

### Component Organization

**Structured component architecture with clear separation of concerns.**

#### Route-Specific Components

```text
src/routes/accounts/[slug]/
├── +page.svelte
├── +page.server.ts
└── (components)/
    ├── data-table-pagination.svelte
    ├── transaction-quick-add.svelte
    └── account-header.svelte
```

#### Shared Components

```text
src/lib/components/
├── ui/                    # Design system components
├── forms/                 # Form components
├── transactions/          # Domain components
├── accounts/
└── shared/                # Generic shared components
```

#### Index Barrel Exports

```typescript
// src/lib/components/accounts/index.ts
export { default as AccountSelector } from './account-selector.svelte';
export { default as AccountCard } from './account-card.svelte';

// Usage
import { AccountSelector, AccountCard } from '$lib/components/accounts';
```

## Import System Architecture

**Multi-format financial data import with intelligent matching and validation.**

### File Processors

#### OFX/QFX Processor

```typescript
import { XMLParser } from 'fast-xml-parser';

export function parseOFX(fileContent: string) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    textNodeName: 'value',
  });

  const parsed = parser.parse(fileContent);
  const transactions = extractTransactions(parsed);

  return transactions.map((t) => ({
    date: parseOFXDate(t.DTPOSTED),
    amount: parseFloat(t.TRNAMT),
    payee: t.NAME || t.MEMO,
    memo: t.MEMO,
    fitid: t.FITID,
  }));
}
```

#### CSV Processor

```typescript
import Papa from 'papaparse';

export function parseCSV(fileContent: string) {
  const result = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  return {
    headers: result.meta.fields || [],
    rows: result.data,
    errors: result.errors,
  };
}
```

### PayeeMatcher

**Intelligent payee matching with confidence scoring.**

```typescript
import fuzzysort from 'fuzzysort';

export class PayeeMatcher {
  private payees: Payee[] = [];

  async findMatch(payeeName: string): Promise<PayeeMatch | null> {
    if (!payeeName) return null;

    const normalized = this.normalize(payeeName);

    // Exact match
    const exactMatch = this.payees.find((p) => p.normalizedName === normalized);
    if (exactMatch) {
      return {
        payeeId: exactMatch.id,
        payeeName: exactMatch.name,
        confidence: 'exact',
      };
    }

    // Fuzzy match
    const results = fuzzysort.go(normalized, this.payees, {
      key: 'normalizedName',
      threshold: -10000,
    });

    if (results.length === 0) return null;

    const bestMatch = results[0];
    const score = bestMatch.score;

    let confidence: MatchConfidence;
    if (score > -1000) confidence = 'high';
    else if (score > -5000) confidence = 'medium';
    else confidence = 'low';

    return {
      payeeId: bestMatch.obj.id,
      payeeName: bestMatch.obj.name,
      confidence,
      score,
    };
  }

  private normalize(name: string): string {
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
  }
}
```

## Development Commands and Workflows

### Development Commands

#### Server Commands

- **Start Dev Server**: `bun run dev` - Starts SvelteKit dev server on
  http://localhost:5173
- **Build for Production**: `bun run build` - Creates optimized production build
- **Preview Production**: `bun run preview` - Serves production build locally
- **Type Checking**: `bun run check` - Runs svelte-check
- **Watch Mode Type Checking**: `bun run check:watch` - Continuous type checking

#### Database Commands

- **Generate Migration**: `bun run db:generate` - Creates new migration from
  schema changes
- **Run Migrations**: `bun run db:migrate` - Applies pending migrations
- **Seed Database**: `bun run db:seed` - Populates database with test data
- **Restart Database**: `bun run db:restart` - Drops, migrates, and reseeds
  database
- **Database Studio**: `bun run db:studio` - Opens Drizzle Studio web interface

#### Testing Commands

- **Run All Tests**: `bun run test`
- **Unit Tests**: `bun run test:unit`
- **Unit Tests (Watch)**: `bun run test:unit:watch`
- **Integration Tests**: `bun run test:integration`
- **E2E Tests**: `bun run test:e2e`
- **Test Coverage**: `bun run test:coverage`

#### Code Quality Commands

- **Lint Code**: `bun run lint`
- **Fix Lint Issues**: `bun run lint:fix`
- **Format Code**: `bun run format`
- **Format Check**: `bun run format:check`

### Common Development Workflows

#### Starting New Feature Development

```bash
# 1. Ensure dependencies are installed
bun install

# 2. Start dev server
bun run dev

# 3. In separate terminal, watch type checking
bun run check:watch

# 4. In separate terminal, run tests in watch mode
bun run test:unit:watch
```

#### Making Schema Changes

```bash
# 1. Update schema files in src/lib/schema/
# 2. Generate migration
bun run db:generate
# 3. Review migration in drizzle/migrations/
# 4. Apply migration
bun run db:migrate
# 5. Verify changes
bun run db:studio
```

#### Running Full Quality Check Before Commit

```bash
bun run check
bun run lint
bun run format:check
bun run test
bun run build
```

## Testing Architecture

**Comprehensive testing strategy with unit, integration, and end-to-end tests.**

### Test Structure

```text
apps/budget/src/tests/
├── unit/                      # Fast, isolated tests
│   ├── utils/
│   ├── services/
│   └── components/
├── integration/               # Database and API tests
│   ├── domains/
│   └── trpc/
└── e2e/                       # Full user journey tests
    ├── accounts.spec.ts
    ├── transactions.spec.ts
    └── import.spec.ts
```

### Coverage Thresholds

- **Branches**: 70%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

### Testing Examples

#### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { parseDateValue, dateDifference } from '$lib/utils/dates';

describe('parseDateValue', () => {
  it('parses ISO string to DateValue', () => {
    const result = parseDateValue('2024-01-15');
    expect(result?.year).toBe(2024);
    expect(result?.month).toBe(1);
    expect(result?.day).toBe(15);
  });
});
```

#### Integration Test Example

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as repository from '$lib/server/domains/transactions/repository';

describe('Transaction Repository', () => {
  let testAccountId: number;

  beforeEach(async () => {
    // Setup test data
  });

  afterEach(async () => {
    // Cleanup
  });

  it('creates transaction in database', async () => {
    const transaction = await repository.create({
      accountId: testAccountId,
      amount: -50.0,
      date: '2024-01-15',
      status: 'cleared',
    });

    expect(transaction.id).toBeDefined();
    expect(transaction.amount).toBe(-50.0);
  });
});
```

#### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test.describe('Account Management', () => {
  test('creates new account', async ({ page }) => {
    await page.goto('/accounts');
    await page.click('button:has-text("New Account")');
    await page.fill('input[name="name"]', 'Test Checking');
    await page.selectOption('select[name="type"]', 'checking');
    await page.click('button[type="submit"]');
    await expect(
      page.locator('text=Account created successfully')
    ).toBeVisible();
  });
});
```

## Scheduled Transactions Feature

**Upcoming scheduled transactions are displayed in the accounts transactions tab
with visual indicators.**

### Feature Overview

Shows upcoming transactions that will be created automatically based on schedule
configurations (30-day window).

### Implementation Architecture

**Data Flow:**

```text
Schedule Database → ScheduleService.getUpcomingScheduledTransactionsForAccount()
→ TransactionService.getAccountTransactionsWithUpcoming()
→ tRPC forAccountWithUpcoming
→ Query Layer filtering/sorting
→ UI Display
```

### Key Features

- **Time Window**: Shows transactions for next 30 days only
- **Deduplication**: Excludes dates with existing transactions
- **Smart Amount Calculation**: Handles range amounts using average
- **Visual Indicators**: Blue calendar icon for scheduled transactions
- **Status Column**: Shows em dash (—) for ID column on scheduled transactions

### Data Structure

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
  status: 'scheduled';
  balance: null; // No balance for future transactions
}
```

## Budget System Implementation

**Comprehensive budget system supporting multiple budget types, configurable
enforcement, and seamless integration.**

### Implementation Status

**📋 Design Phase**: Complete

Comprehensive system design documented in `docs/plans/budget-system-design.md`

### Implementation Roadmap

#### Phase 1: Foundation (Database & Core Services) - PENDING

**Database Schema** (`src/lib/schema/budgets/`):

- Core budget table with type enum and metadata JSON
- Budget groups with parent-child relationships
- Flexible period definitions and instances
- Junction tables for accounts, categories, transactions

**Domain Services** (`src/lib/server/domains/budgets/`):

- Repository for database queries
- Service layer for business logic
- Type definitions and validation schemas

**tRPC Integration** (`src/lib/trpc/routes/budgets.ts`):

- CRUD operations for budgets and groups
- Budget summary and progress queries
- Transaction validation endpoints

#### Phase 2: Basic UI (Account-Monthly Budgets) - PENDING

**State Management**:

- Reactive budget store
- TanStack Query integration

**Core Components** (`src/lib/components/budgets/`):

- BudgetProgress, BudgetSelector, BudgetPeriodPicker

**Management Pages** (`src/routes/budgets/`):

- Budget list/dashboard, creation forms, detail pages

#### Phase 3: Advanced Features (Category Envelopes) - PENDING

- YNAB-style envelope budgeting
- Rollover calculations
- Deficit handling

#### Phase 4: Goals & Schedules - PENDING

- Goal-based budgets
- Schedule integration
- Advanced analytics

#### Phase 5: Polish & Optimization - PENDING

- Budget hierarchy and groups
- Advanced enforcement levels
- Performance optimization

### Core Design Principles

- **User Control**: Users have ultimate control over budget behavior
- **Smart Defaults**: Sensible defaults that work out-of-the-box
- **Flexibility**: Support multiple budget types
- **Integration**: Seamless with existing transaction and schedule systems

### Budget Types

1. **Account-Monthly**: Total spending limit per account per period
2. **Category-Envelope**: YNAB-style allocation budgeting with rollover
3. **Goal-Based**: Target amount tracking for savings goals
4. **Scheduled-Expense**: Integration with recurring schedules

### Technical Architecture

- **Hybrid Metadata**: Core fields as columns + JSON for flexible settings
- **Period Templates**: Flexible period definitions with instances
- **Junction Tables**: Clean multi-budget transaction tracking
- **Domain-Driven**: Follows existing patterns
- **Real-Time Updates**: Configurable calculation refresh

## AI Chat System

**Integrated AI assistant with contextual financial awareness and tool
capabilities.**

### Architecture Overview

The AI chat system provides conversational assistance with full context of the
user's financial data. It supports streaming responses, tool execution, and
conversation persistence.

### Core Components

#### Server-Side AI (`src/lib/server/ai/`)

- **commands/**: Chat command parsing and execution (registry, parser,
  formatters)
- **tools/**: AI tool definitions for financial operations
- **prompts/**: System prompts for the chat assistant
- **providers/**: LLM provider integrations (OpenAI, Anthropic, local models)
- **fine-tuning/**: Training data generation for custom models
- **financial-context.ts**: Builds comprehensive financial context for prompts
- **intelligence-coordinator.ts**: Coordinates AI features across the app

#### Client-Side State (`src/lib/states/ui/ai-chat.svelte.ts`)

Reactive state management for chat functionality:

- Conversation history and message streaming
- Tool execution status and results
- Auto-scroll and UI state management
- Conversation persistence via tRPC

#### AI Elements Component Library (`src/lib/components/ai-elements/`)

Reusable components for AI interfaces:

- **artifact/**: Code and content artifact display with actions
- **code/**: Syntax-highlighted code blocks with Shiki
- **confirmation/**: User confirmation dialogs for AI actions
- **conversation/**: Chat conversation container with scroll management
- **copy-button/**: Clipboard copy functionality
- **loader/**: Loading indicators for AI operations
- **message/**: Message display with avatar and content
- **prompt-input/**: Rich text input with attachments and autocomplete
- **reasoning/**: AI reasoning step visualization
- **response/**: Structured AI response rendering
- **suggestion/**: Suggested action chips

### tRPC Integration (`src/lib/trpc/routes/ai.ts`)

- **sendMessage**: Stream chat messages with tool execution
- **getConversations**: List user conversations
- **getConversation**: Retrieve conversation history
- **deleteConversation**: Remove conversation

### Usage Pattern

```svelte
<script lang="ts">
  import { getAIChatState } from '$lib/states/ui';

  const chat = getAIChatState();
</script>

<ChatPanel
  messages={chat.messages}
  onSend={(message) => chat.sendMessage(message)}
  isStreaming={chat.isStreaming}
></ChatPanel>
```

## Contextual Help System

**Interactive documentation with element highlighting and searchable help
content.**

### Architecture Overview

The help system provides contextual documentation tied to specific UI elements.
Users can enter help mode to explore the interface and access relevant
documentation.

### Core Components

#### Help Components (`src/lib/components/help/`)

- **help-button.svelte**: Global help mode toggle
- **help-documentation-sheet.svelte**: Sliding panel for help content display
- **help-element-highlight.svelte**: Visual highlighting for interactive
  elements
- **help-overlay.svelte**: Full-screen overlay for help mode
- **help-search-results.svelte**: Search results display
- **modal-help-provider.svelte**: Context provider for modal help integration
- **modal-help-button.svelte**: Help trigger within modals
- **modal-help-overlay.svelte**: Help overlay for modal contexts

#### Help State (`src/lib/states/ui/help.svelte.ts`)

Reactive state for help functionality:

- Help mode toggle and active element tracking
- Search functionality across help content
- Navigation between help topics
- Element-to-documentation mapping

#### Help Content (`src/lib/content/help/`)

Markdown documentation files organized by feature:

- Account and transaction documentation
- Settings and configuration guides
- Intelligence and AI feature explanations
- UI component usage instructions

### Help ID Pattern

Components register for help by adding a `data-help-id` attribute:

```svelte
<Button data-help-id="add-transaction-button">
  Add Transaction
</Button>
```

The corresponding help content is in
`src/lib/content/help/add-transaction-button.md`.

### Usage Pattern

```svelte
<script lang="ts">
  import { ModalHelpProvider, ModalHelpButton } from '$lib/components/help';
</script>

<ModalHelpProvider>
  <Dialog>
    <DialogHeader>
      <ModalHelpButton></ModalHelpButton>
    </DialogHeader>
    <!-- Dialog content with data-help-id attributes -->
  </Dialog>
</ModalHelpProvider>
```

## Intelligence Input System

**AI-powered form field assistance with inline suggestions and field-specific
intelligence.**

### Architecture Overview

The intelligence input system provides contextual AI assistance for form fields.
It can suggest values, validate input, and provide explanations based on the
field context.

### Core Components

#### Intelligence Input Components (`src/lib/components/intelligence-input/`)

- **intelligence-input-button.svelte**: Trigger for AI assistance
- **intelligence-input-highlight.svelte**: Visual indication of AI-ready fields
- **intelligence-input-mode-picker.svelte**: Selection between AI modes
- **intelligence-input-overlay.svelte**: AI suggestion overlay
- **modal-intelligence-provider.svelte**: Context provider for modal forms
- **modal-intelligence-overlay.svelte**: Intelligence overlay for modals

#### Intelligence State (`src/lib/states/ui/intelligence-input.svelte.ts`)

Reactive state for intelligence features:

- Active field tracking and context
- Suggestion generation and display
- Mode selection (auto, manual, disabled)
- Provider configuration

### Intelligence Modes

- **Auto**: AI suggestions appear automatically as user types
- **Manual**: User triggers AI assistance with button click
- **Disabled**: No AI assistance for the field

### Usage Pattern

```svelte
<script lang="ts">
  import { IntelligenceInputButton } from '$lib/components/intelligence-input';
</script>

<div class="relative">
  <Input bind:value={payeeName} data-intelligence-field="payee"></Input>
  <IntelligenceInputButton field="payee"></IntelligenceInputButton>
</div>
```

## Payee Cleanup System

**Duplicate detection and payee normalization for data quality management.**

### Features

- **Duplicate Detection**: Fuzzy matching to identify similar payees
- **Name Normalization**: Standardize payee naming conventions
- **Bulk Merge**: Combine duplicate payees with transaction reassignment
- **Preview Mode**: Review changes before applying

### Components (`src/routes/payees/cleanup/`)

- **duplicate-detection-panel.svelte**: Interface for finding duplicates
- **duplicate-group-card.svelte**: Display grouped duplicate payees
- **merge-confirmation-dialog.svelte**: Confirm merge operations
- **name-normalization-panel.svelte**: Standardize payee names
- **normalization-preview-table.svelte**: Preview normalization changes

### Service Methods (`src/lib/server/domains/payees/services.ts`)

- **findDuplicates()**: Identify potential duplicate payees
- **mergePayees()**: Combine payees and update transactions
- **normalizeNames()**: Apply naming conventions
- **getSimilarityScore()**: Calculate similarity between payee names

### Query Layer (`src/lib/query/similarity.ts`)

- **getSimilarPayees()**: Find similar payees for a given name
- **getDuplicateGroups()**: Get grouped duplicate candidates

## LLM Provider Configuration

**Configurable AI providers with per-feature settings.**

### Settings Location

`src/routes/settings/intelligence/`

### Provider Options

- **OpenAI**: GPT-4, GPT-3.5-turbo models
- **Anthropic**: Claude models
- **Local Models**: Ollama integration for self-hosted models

### Feature Modes

Each AI feature can be configured independently:

- **Master Toggle**: Enable/disable all AI features
- **LLM Features**: Chat, transaction parsing, categorization
- **ML Features**: Anomaly detection, forecasting, similarity matching
- **Web Search**: External search integration

### Configuration Pattern

```typescript
interface LLMSettings {
  enabled: boolean;
  provider: 'openai' | 'anthropic' | 'ollama';
  model: string;
  features: {
    chat: boolean;
    parsing: boolean;
    categorization: boolean;
  };
}
```

---

_This configuration ensures consistent tooling and accountability across all
Claude Code sessions._
