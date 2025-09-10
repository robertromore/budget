# Budget Management Monorepo

A Turbo-powered monorepo for budget management applications built with SvelteKit, TypeScript, and modern web technologies.

## Structure

This repository is organized as a monorepo using [Turbo](https://turbo.build/) for efficient build orchestration and caching.

```
├── apps/
│   └── budget/          # Main SvelteKit budget application
├── packages/            # Shared packages (future)
├── turbo.json          # Turbo pipeline configuration
└── package.json        # Root workspace configuration
```

## Apps

### Budget App (`apps/budget/`)

A comprehensive budget management application featuring:

- **Frontend**: SvelteKit with Svelte 5, TypeScript, Tailwind CSS, shadcn-svelte
- **Backend**: tRPC, Drizzle ORM, Better Auth, domain-driven architecture
- **Database**: SQLite (with migrations via Drizzle)
- **Architecture**: Domain-separated frontend and backend with comprehensive error handling

For detailed documentation about the budget app, see `apps/budget/README.md`.

## Development

### Prerequisites

- [Bun](https://bun.sh/) v1.2.20 or later
- Node.js v18 or later (see `.nvmrc`)

### Getting Started

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Start development server:**
   ```bash
   # Run all apps in development mode
   bun run dev

   # Or run specific app
   bun run dev:budget
   ```

3. **Build applications:**
   ```bash
   # Build all apps
   bun run build

   # Or build specific app
   bun run build:budget
   ```

### Available Scripts

From the root directory:

- `bun run dev` - Start all apps in development mode
- `bun run build` - Build all apps for production
- `bun run test` - Run tests across all apps
- `bun run lint` - Lint all apps
- `bun run format` - Format code across all apps
- `bun run clean` - Clean build artifacts

### App-Specific Scripts

Use Turbo's filtering to run scripts for specific apps:

```bash
# Development
bun run dev --filter=budget

# Build
bun run build --filter=budget

# Test
bun run test --filter=budget
```

### Database Operations

Database operations are handled per-app. For the budget app:

```bash
bun run db:generate --filter=budget  # Generate migrations
bun run db:migrate --filter=budget   # Run migrations
bun run db:seed --filter=budget      # Seed with sample data
```

## Monorepo Benefits

- **Shared tooling**: Consistent development experience across all apps
- **Efficient builds**: Turbo's intelligent caching and dependency management
- **Code sharing**: Easy sharing of utilities, types, and components (future packages)
- **Simplified CI/CD**: Single repository for all related applications

## Future Structure

As the monorepo grows, we plan to extract shared functionality into packages:

```
packages/
├── ui/              # Shared UI components
├── database/        # Database schemas and utilities
├── config/          # Shared configuration
└── utils/          # Shared utility functions
```

## Technology Stack

- **Monorepo**: Turbo
- **Package Manager**: Bun
- **Frontend**: SvelteKit, Svelte 5, TypeScript
- **Styling**: Tailwind CSS, shadcn-svelte
- **Backend**: tRPC, Drizzle ORM
- **Database**: SQLite
- **Authentication**: Better Auth
- **Testing**: Vitest, Playwright
- **Deployment**: Adapters for various platforms

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Ensure tests pass: `bun run test`
4. Ensure code is formatted: `bun run format`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
