# Budget App

A modern budget management application built with SvelteKit, tRPC, and
contemporary web technologies.

## Overview

This budget application provides a comprehensive solution for personal financial
management with a focus on clean architecture, type safety, and excellent user
experience.

### Key Features

- **Account Management**: Organize finances across multiple accounts
- **Transaction Tracking**: Detailed transaction history with advanced filtering
- **Category System**: Flexible categorization for income and expenses
- **Schedule Management**: Recurring transaction planning
- **Data Tables**: Interactive tables with sorting, filtering, and editing

### Technology Stack

- **Frontend**: SvelteKit 5, Shadcn-Svelte, Tailwind CSS
- **Backend**: tRPC, Drizzle ORM, SQLite
- **Development**: TypeScript, Bun, Prettier, ESLint

## Quick Start

From the repository root:

1. **Install dependencies**:

   ```bash
   bun install
   ```

2. **Set up database**:

   ```bash
   bun run db:generate --filter=budget
   bun run db:migrate --filter=budget
   bun run db:seed --filter=budget
   ```

3. **Start development server**:

   ```bash
   bun run dev:budget
   ```

4. **Open browser** to <http://localhost:5173>

## Documentation

- **[Project Status](docs/project-status.md)** - Current state and technical
  overview
- **[Tasks & Roadmap](docs/tasks.md)** - Development tasks and priorities
- **[Development Guide](docs/development-guide.md)** - Guidelines and best
  practices
- **[Development Agents](docs/agents.md)** - Specialized agents and
  responsibilities
- **[Context7 Cache](docs/context7-cache.md)** - Documentation cache system and
  management

## Development

This project follows modern development practices with:

- **Feature branches** for all development work
- **Type-safe** APIs with tRPC and TypeScript
- **Component organization** with route-specific structure
- **Specialized agents** for different development domains

See the [Development Guide](docs/development-guide.md) for detailed guidelines
and best practices.

## Architecture

The application uses a clean 3-layer architecture:

- **Services Layer**: Business logic and data operations
- **Query Layer**: Reactive data management with TanStack Query
- **UI Layer**: Svelte components with Shadcn design system

## Contributing

### 🚨 Critical: Always Use Feature Branches

**Before making any changes:**

1. **Check you're on `main`**: `git branch --show-current`
2. **Create feature branch**: `git checkout -b feature/descriptive-name`
3. **Never work directly on `main`** - every change needs its own branch

### Development Workflow

1. **Branch Creation**: Use descriptive names (`feature/add-auth`,
   `fix/table-bug`)
2. **Focused Changes**: Keep commits small and atomic
3. **Testing**: Run `bun run build` and test functionality
4. **Clear Messages**: Write descriptive commit messages with context
5. **Documentation**: Update relevant docs when adding features

### Branch Naming Convention

- `feature/` - New functionality
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `perf/` - Performance improvements

**For complete guidelines, see [Development Guide](docs/development-guide.md).**
