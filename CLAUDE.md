# Claude Code Configuration

This file contains configuration and preferences for Claude Code agents working on this project.

## Package Manager Preference

**ALWAYS use `bun` commands instead of `npm` commands in this project.**

### Command Mappings
- ❌ `npm install` → ✅ `bun install`
- ❌ `npm run dev` → ✅ `bun run dev`
- ❌ `npm run build` → ✅ `bun run build`
- ❌ `npm run test` → ✅ `bun run test`
- ❌ `npm add package` → ✅ `bun add package`
- ❌ `npm remove package` → ✅ `bun remove package`

### Rationale
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
- ❌ `import { Component } from '../../../lib/components/ui/button'`
- ✅ `import { Component } from '$lib/components/ui/button'`
- ❌ `import { db } from '../../lib/server/db'`
- ✅ `import { db } from '$lib/server/db'`
- ❌ `import type { Account } from '../lib/schema/accounts'`
- ✅ `import type { Account } from '$lib/schema/accounts'`

### Rationale
- Cleaner, more readable imports
- Consistent with SvelteKit conventions
- Easier refactoring and maintenance
- Avoids relative path complexity

## Development Commands

- **Dev server**: `bun run dev`
- **Build**: `bun run build` 
- **Test**: `bun run test` (if available)
- **Lint**: `bun run lint` (if available)
- **Type check**: `bun run typecheck` (if available)

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

---

*This configuration ensures consistent tooling across all Claude Code sessions.*