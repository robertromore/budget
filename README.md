# Budget Manager

A personal finance management application built with SvelteKit, featuring transaction tracking, budget categorization, and financial reporting.

## 🏗️ Architecture

- **Frontend**: SvelteKit + Svelte 5 + TypeScript
- **Backend**: oRPC procedures + SQLite + Drizzle ORM  
- **UI**: Tailwind CSS + shadcn-svelte components
- **State**: Svelte stores + reactive runes

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open in browser
npm run dev -- --open
```

## 📁 Project Structure

```
src/
├── lib/
│   ├── components/     # UI components organized by domain
│   ├── orpc/          # API layer (procedures & client)
│   ├── states/        # Reactive state management
│   ├── schema/        # Database schema & validation
│   └── utils/         # Utility functions
├── routes/            # SvelteKit pages & API routes
└── docs/              # Documentation & guides
```

## 🧭 Navigation

- **📖 [Architecture Guide](./docs/ARCHITECTURE.md)** - System overview & patterns
- **🗺️ [Navigation Guide](./docs/NAVIGATION_GUIDE.md)** - Find files quickly  
- **🔄 [Refactoring Plan](./docs/REFACTORING_PLAN.md)** - Improvement roadmap

## ⚡ Core Features

- **Account Management**: Multiple bank accounts with balance tracking
- **Transaction Tracking**: Income, expenses, transfers with categorization
- **Recurring Schedules**: Automated recurring transaction management
- **Advanced Filtering**: Date ranges, categories, payees with custom views
- **Data Tables**: Sortable, filterable transaction tables with inline editing

## 🛠️ Development

```bash
# Run tests
npm test

# Type checking
npm run check

# Linting
npm run lint

# Build production
npm run build
```

## 📊 Database

Uses SQLite with Drizzle ORM. Schema files in `/src/lib/schema/`.

```bash
# Database migrations
npm run db:migrate

# Reset database  
npm run db:reset
```
