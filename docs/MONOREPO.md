# Monorepo Structure

This project uses Turbo for monorepo management with the following structure:

## Directory Structure

```
├── apps/
│   └── budget/              # Main SvelteKit application
│       ├── src/             # Application source code
│       ├── tests/           # Application tests
│       ├── scripts/         # Development scripts
│       ├── drizzle/         # Database schema and migrations
│       ├── .env*            # Environment configuration
│       └── *config.*        # App-specific configurations
├── packages/
│   ├── layerchart-wrapper/  # Chart components library
│   └── configs/             # Shared configuration packages
│       ├── eslint/          # ESLint configuration
│       ├── prettier/        # Prettier configuration
│       ├── tailwind/        # Tailwind CSS configuration
│       └── typescript/      # TypeScript configuration
├── docs/                    # Documentation
│   ├── MONOREPO.md          # This file
│   ├── layerchart threshold examples.md
│   └── LAYERCHART_IMPROVEMENT_PLAN.md
└── [Root-level configs]     # Workspace and shared configurations
```

## Applications

### apps/budget

The main budget management SvelteKit application. Contains:

- Frontend UI components and routes
- Backend tRPC API routes
- Database schema and migrations
- Authentication system
- All business logic

## Packages

### @layerchart-wrapper/charts

A reusable chart components library built on LayerChart. Provides:

- Chart components (UnifiedChart, ChartCore, etc.)
- Chart controls (type selector, period controls, etc.)
- Chart configuration and utilities
- Re-exports of LayerChart primitives

### @budget-configs/*

Shared configuration packages:

- **@budget-configs/eslint**: ESLint rules and configuration
- **@budget-configs/prettier**: Code formatting rules
- **@budget-configs/tailwind**: Tailwind CSS theme and utilities
- **@budget-configs/typescript**: TypeScript compiler configurations

## Development Commands

### Root Level

```bash
# Install all dependencies
bun install

# Run all apps in development mode
bun run dev

# Build all packages and apps
bun run build

# Run all tests
bun run test

# Lint all packages
bun run lint

# Format all code
bun run format
```

### Package-specific

```bash
# Run commands for specific packages/apps
turbo run dev --filter=budget
turbo run build --filter=@layerchart-wrapper/charts
turbo run test --filter=budget
```

## Benefits

- **Code Reusability**: Chart components can be shared between projects
- **Consistent Configuration**: All packages use the same linting and formatting rules
- **Efficient Builds**: Turbo caches and parallelizes builds
- **Dependency Management**: Shared dependencies reduce duplication
- **Type Safety**: TypeScript configurations are consistent across packages

## Adding New Packages

1. Create directory under `packages/`
2. Add `package.json` with appropriate dependencies
3. Update root `package.json` workspaces if needed
4. Configure build scripts in `turbo.json`
5. Update this documentation