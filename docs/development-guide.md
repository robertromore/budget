# Development Guide

Development guidelines, best practices, and organizational policies for the project.

## 🚨 Before Starting Any Work - Feature Branch Checklist

**STOP! Always verify before making changes:**

- [ ] **Check current branch**: Run `git branch --show-current`
- [ ] **Are you on `main`?** If not, switch first: `git checkout main`
- [ ] **Is this new work?** Create feature branch: `git checkout -b feature/descriptive-name`
- [ ] **Branch name is descriptive**: `feature/add-X`, `fix/Y-bug`, `docs/update-Z`

### ⚠️ Critical Rule: **NEVER work directly on `main` branch!**

Every change, no matter how small, requires its own feature branch.

## Development Guidelines

- Focus on one feature at a time
- Make small, incremental changes
- **Use feature branches**: Create new branches for each feature/task (never commit directly to main)
- Test changes before committing (run build, check dev server)
- Write descriptive commit messages with context
- Update project documentation as work progresses

## Git Workflow & Commit Guidelines

### Feature Branch Naming Conventions

- **Features**: `feature/add-transaction-filtering`
- **Bug fixes**: `fix/sidebar-responsive-issue`  
- **Documentation**: `docs/update-api-guide`
- **Refactoring**: `refactor/reorganize-components`
- **Performance**: `perf/optimize-data-loading`

### Commit Message Standards

Follow this template for all commits:

```text
Short summary (50 chars or less)

More detailed explanation if needed. Wrap at 72 characters.
Explain what and why, not how.

- Use bullet points for multiple changes
- Reference issues: Fixes #123, Closes #456

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Pre-Commit Checklist

Before every commit:

- [ ] **Verify you're on a feature branch** (not main)
- [ ] **Run tests**: `bun run test` (if applicable)
- [ ] **Check build**: `bun run build`
- [ ] **Review changes**: `git diff` to confirm intended changes
- [ ] **Stage specific files**: Avoid `git add .` unless intentional

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
