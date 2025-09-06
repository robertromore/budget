# Documentation

This directory contains comprehensive technical documentation for the SvelteKit budget management application, organized by category for easy navigation.

## Documentation Structure

### Architecture (`architecture/`)

Core architectural documentation and design patterns:

- **[Architecture Overview](./architecture/overview.md)** - High-level system architecture and design principles
- **[Backend Architecture](./architecture/backend.md)** - Server-side architecture, domains, and API design
- **[Frontend Architecture](./architecture/frontend.md)** - Client-side architecture, state management, and UI patterns
- **[Testing Architecture](./architecture/testing.md)** - Testing strategies and implementation patterns

### Development (`development/`)

Development workflows, guidelines, and standards:

- **[Development Guidelines](./development/guidelines.md)** - Comprehensive development standards, workflows, and best practices
- **[Code Review Process](./development/code-review.md)** - Code review guidelines and quality standards
- **[Project Standards](./development/standards.md)** - Coding standards, conventions, and quality requirements

### Technical (`technical/`)

Technical implementation details and specialized guides:

- **[Account Performance Optimizations](./technical/account-performance.md)** - Performance improvements for account pages with smart rendering strategies
- **[Transaction Update Flow](./technical/transaction-flow.md)** - Transaction inline editing system and API patterns
- **[Template System Guide](./technical/template-system.md)** - Widget and chart template generation system
- **[Context7 Cache System](./technical/context7-cache.md)** - Documentation caching system for offline access

### System (`system/`)

System configuration and operational documentation:

- **[Development Agents](./system/agents.md)** - Specialized agent definitions and responsibilities

### Analyses (`analyses/`)

Technical analyses and research documentation:

- **[Chart System Analysis](./analyses/chart-system-analysis.md)** - Comprehensive analysis of chart implementation and improvement roadmap
- **[Chart Analysis for Budgeting](./analyses/chart-analysis-for-budgeting.md)** - Chart requirements and patterns for budget visualization

### Plans (`plans/`)

Future development plans and implementation roadmaps:

- **[Budget Threshold System](./plans/budget-threshold-system.md)** - Account-level budget limits implementation plan
- **[MicroLLM Budgeting Plan](./plans/microllm-budgeting-plan.md)** - Budgeting-specialized AI implementation strategy

## Quick Reference

### Performance Thresholds

- **Client-side rendering**: ≤5,000 transactions
- **Server-side rendering**: >5,000 transactions
- **Cache durations**: Account summaries (5min), Transactions (1min)

### Key Architecture Components

- **Smart rendering strategy**: Adaptive client/server-side rendering
- **Domain-driven design**: Backend organized by business domains
- **Unified chart system**: LayerChart-based visualization with simplified API
- **State management**: Svelte 5 runes with entity and UI state classes
- **Template system**: Automated widget and chart component generation

### Recently Completed

- Chart system Phase 1 implementation (unified API, reduced complexity)
- Documentation organization into logical folder structure
- Development guidelines consolidation
- Account performance optimizations
- Transaction update flow improvements

### In Progress

- Budgeting-specialized microLLM implementation
- Turbo monorepo conversion

## Getting Started

For new developers:

1. Start with [Architecture Overview](./architecture/overview.md) for system understanding
2. Review [Development Guidelines](./development/guidelines.md) for workflows and standards
3. Check [Development Agents](./system/agents.md) for specialized assistance
4. Explore technical guides in `technical/` for implementation details

## Contributing

When adding new documentation:

1. **Choose appropriate folder**: Place documentation in the correct category
2. **Follow naming conventions**: Use descriptive, kebab-case filenames
3. **Maintain quality**: Follow [Google's documentation style guide](https://google.github.io/styleguide/docguide/style.html)
4. **Validate markdown**: Run `bunx markdownlint-cli --fix` before committing
5. **Update this README**: Add new documentation links in the appropriate section
6. **Include practical examples**: Provide code examples and implementation details
7. **Add troubleshooting**: Include common issues and solutions

## Documentation Standards

- **Professional tone**: Clean, technical writing without unprofessional elements
- **Present tense**: Document current state, not historical changes
- **Code examples**: Include working TypeScript/Svelte examples
- **Cross-references**: Link to related documentation
- **Comprehensive coverage**: Address both happy path and edge cases
