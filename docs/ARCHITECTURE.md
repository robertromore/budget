# Budget App Architecture

## Overview
Personal finance management application built with SvelteKit, oRPC, and SQLite.

## Core Domains
- **Accounts**: Bank accounts, balances, account management
- **Transactions**: Financial transactions, transfers, categorization  
- **Schedules**: Recurring transactions and scheduling
- **Categories**: Transaction categorization and budgeting
- **Payees**: Transaction counterparties
- **Views**: Custom filtered views of financial data

## Technology Stack
- **Frontend**: SvelteKit, Svelte 5 (runes), TypeScript
- **Backend**: oRPC procedures, SQLite with Drizzle ORM
- **UI**: Tailwind CSS, shadcn-svelte components
- **State Management**: Svelte stores + reactive state

## Folder Structure
```
src/lib/
├── api/           # oRPC procedures & client
├── components/    # UI components by domain  
├── stores/        # Reactive state management
├── utils/         # Pure utility functions
├── types/         # TypeScript type definitions
└── schema/        # Database schema & validation
```

## Data Flow
1. UI components call oRPC procedures via client
2. Procedures interact with SQLite database
3. Results flow back through reactive stores
4. UI automatically updates via Svelte reactivity

## Key Patterns
- **Domain-driven organization**: Features grouped by business domain
- **Reactive state**: Svelte stores for cross-component state
- **Type safety**: End-to-end TypeScript with Drizzle
- **Component composition**: Reusable UI components with business logic separation