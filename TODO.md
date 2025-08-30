# Budget App Development TODO

This document tracks the development progress, tasks, and organizational structure for the budget application built with SvelteKit, tRPC, and modern web technologies.

## Current State Assessment ✅

- **App Status**: Successfully running on <http://localhost:5174>
- **Architecture**: Clean 3-layer structure (services → query → UI)
- **Database**: SQLite with Drizzle ORM, migrations working
- **Frontend**: SvelteKit 5 with Shadcn-Svelte components
- **Backend**: tRPC API with type-safe endpoints

### Existing Features

- ✅ Database schema: accounts, categories, payees, transactions, schedules
- ✅ Account management with data table interface
- ✅ Sidebar navigation with sidebar UI components
- ✅ Transaction viewing/editing with faceted filtering
- ✅ Schedule management functionality
- ✅ State management with context pattern

### Tech Stack

- **Frontend**: Svelte 5, SvelteKit, Shadcn-Svelte, Tailwind CSS
- **Backend**: tRPC, Drizzle ORM, SQLite
- **Dev Tools**: Bun, TypeScript, Prettier, ESLint

## Next Priority Tasks

- [ ] Identify missing features or UI improvements needed
- [ ] Review data table functionality for enhancements
- [ ] Add transaction creation/editing workflows
- [ ] Implement filtering and search improvements
- [ ] Add reporting/analytics features

## Agent Assignments

- **backend-api-architect**: `src/lib/trpc/`, `src/lib/server/db/`, `src/lib/schema/`
- **frontend-ui-specialist**: `src/lib/components/ui/`, UI components, styling
- **query-layer-specialist**: Query/mutation patterns, error handling, cache management
- **documentation-specialist**: README files, TODO.md, technical docs, markdown formatting

## Completed Tasks

- [x] Set up agent definitions in `.claude/agents/`
- [x] Created TODO.md for project tracking
- [x] Cleaned up git working directory
- [x] Assessed current codebase structure
- [x] Verified app functionality (runs successfully)
- [x] Reorganized components following route-specific structure
- [x] Created documentation-specialist agent

## Development Guidelines

- Focus on one feature at a time
- Make small, incremental changes
- **Use feature branches**: Create new branches for each feature/task (never commit directly to main)
- Test changes before committing (run build, check dev server)
- Write descriptive commit messages with context
- Update this TODO.md as work progresses

## Component Organization Policy 🏗️

**Long-standing preference for component structure:**

### Global Components (`src/lib/components/`)

- Components used in multiple routes/pages
- Reusable UI primitives beyond shadcn-svelte
- App-wide components (e.g., `app-sidebar.svelte`)
- `ui/` folder contains shadcn-svelte components

### Route-Specific Components

- Components specific to certain routes should be in their route's `(components)` subfolder
- Configuration files should be in `(config)` subfolder
- Data definitions should be in `(data)` subfolder
- Other logical groupings use `(name)` convention

**Example Structure:**

```text
src/routes/accounts/[id]/
├── (components)/
│   ├── data-table.svelte
│   ├── (cells)/
│   │   ├── data-table-cell.svelte
│   │   └── data-table-editable-cell.svelte
│   └── (facets)/
│       └── data-table-faceted-filter.svelte
├── (config)/
│   └── table-columns.ts
└── +page.svelte
```
