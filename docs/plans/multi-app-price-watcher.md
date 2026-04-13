# Multi-App Architecture + Price Watcher

## Overview

The budget app will become one of several "apps" sharing the same SvelteKit instance, database, and auth system. An app rail sidebar on the far left lets users switch between apps. The first new app is a price watcher that tracks product prices from retailers.

## Architecture Decisions

- **Shared database + auth**: Same SQLite database, same Better Auth session
- **Price fetching**: API integrations first, then server-side scraping, browser extension later
- **Routing**: SvelteKit route groups — `(budget)/` and `(price-watcher)/`
- **Shared infrastructure**: Header bar, theme, settings, AI chat, help system

## Phases

Each phase has its own detailed plan document.

| Phase | Plan | Dependencies | Description |
| --- | --- | --- | --- |
| 1 | [App Rail Sidebar](01-app-rail-sidebar.md) | None | Icon rail for switching between apps |
| 2 | [Route Groups](02-route-groups.md) | Phase 1 | Reorganize routes with separate layouts per app |
| 3 | [Price Watcher Schema](03-pw-schema.md) | None | Database tables for products, prices, alerts, retailers |
| 4 | [Price Watcher Services](04-pw-services.md) | Phase 3 | Repository, business logic, price providers |
| 5 | [tRPC + Query Layer](05-pw-trpc-query.md) | Phase 4 | API endpoints and TanStack Query definitions |
| 6 | [Price Watcher UI](06-pw-ui.md) | Phases 2, 5 | Pages, components, and interactions |
| 7 | [Background Jobs](07-pw-background-jobs.md) | Phase 4 | Scheduled price checking and alert notifications |

## Dependency Graph

```text
Phase 1 (App Rail) ──→ Phase 2 (Route Groups) ──→ Phase 6 (UI)
                                                      ↑
Phase 3 (Schema) ──→ Phase 4 (Services) ──→ Phase 5 (tRPC) ─┘
                                        └──→ Phase 7 (Background Jobs)
```

Phases 1+2 (infrastructure) and 3+4+5 (backend) can be developed in parallel.
