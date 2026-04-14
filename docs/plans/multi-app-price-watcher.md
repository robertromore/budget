# Multi-App Architecture + Price Watcher

## Overview

The budget app will become one of several "apps" sharing the same SvelteKit instance, database, and auth system. An app rail sidebar on the far left lets users switch between apps. The first new app is a price watcher that tracks product prices from retailers.

## Architecture Decisions

- **Shared database + auth**: Same SQLite database, same Better Auth session
- **Price fetching**: JSON-LD/structured data first, then store-specific CSS selectors (cheerio), then headless browser for JS-heavy sites
- **Routing**: SvelteKit route groups — `(budget)/` and `(price-watcher)/`
- **Shared infrastructure**: Header bar, theme, settings, AI chat, help system

## Phases

Each phase has its own detailed plan document.

| Phase | Plan | Dependencies | Description |
| --- | --- | --- | --- |
| 1 | [App Rail Sidebar](01-app-rail-sidebar.md) | None | Icon rail for switching between apps |
| 2 | [Route Groups](02-route-groups.md) | Phase 1 | Reorganize routes with separate layouts per app |
| 3 | [Price Watcher Schema](03-pw-schema.md) | None | Database tables for products, prices, alerts |
| 4 | [Price Watcher Services](04-pw-services.md) | Phase 3 | Repository, business logic, price extraction |
| 5 | [tRPC + Query Layer](05-pw-trpc-query.md) | Phase 4 | API endpoints and TanStack Query definitions |
| 6 | [Price Watcher UI](06-pw-ui.md) | Phases 2, 5 | Pages, components, and interactions |
| 7 | [Background Jobs](07-pw-background-jobs.md) | Phase 4 | Scheduled price checking via cron endpoint |
| 8 | [Store-Specific Selectors](08-pw-store-selectors.md) | Phase 4 | CSS selector fallbacks with cheerio for major retailers |
| 9 | [Headless Browser](09-pw-headless-browser.md) | Phase 8 | Playwright-based scraping for JS-heavy sites |

## Dependency Graph

```text
Phase 1 (App Rail) ──→ Phase 2 (Route Groups) ──→ Phase 6 (UI)
                                                      ↑
Phase 3 (Schema) ──→ Phase 4 (Services) ──→ Phase 5 (tRPC) ─┘
                                   │
                                   ├──→ Phase 7 (Background Jobs)
                                   ├──→ Phase 8 (Store Selectors + cheerio)
                                   └────────────────→ Phase 9 (Headless Browser)
```

Phases 1-7 are complete. Phases 8 and 9 improve extraction reliability.

## Price Extraction Strategy (layered)

1. **JSON-LD** (`<script type="application/ld+json">`) — most reliable, works on many sites
2. **Open Graph / meta tags** — fallback for sites without JSON-LD
3. **Store-specific CSS selectors** (Phase 8) — cheerio-based extraction for known retailers
4. **Headless browser** (Phase 9) — Playwright for JS-rendered sites that return empty HTML to HTTP requests
5. **Manual entry** — user types in the price they see (always available as last resort)
