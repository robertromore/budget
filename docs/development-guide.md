# Development Guide

Development guidelines, best practices, and organizational policies for the project.

## Development Guidelines

- Focus on one feature at a time
- Make small, incremental changes
- **Use feature branches**: Create new branches for each feature/task (never commit directly to main)
- Test changes before committing (run build, check dev server)
- Write descriptive commit messages with context
- Update project documentation as work progresses

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