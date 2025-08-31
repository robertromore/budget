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

### Rationale
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
- ✅ Use language tags: ```typescript, ```bash, ```text
- ✅ Proper heading structure with blank lines
- ✅ Consistent list formatting with proper spacing
- ✅ Professional tone following Google's style principles
- ❌ Bare URLs without proper link formatting
- ❌ Missing language specifications in code blocks
- ❌ Inconsistent heading spacing

### Rationale
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