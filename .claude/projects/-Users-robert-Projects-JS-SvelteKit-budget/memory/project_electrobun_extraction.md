---
name: Electrobun desktop app PoC complete
description: packages/core extraction and Electrobun desktop app are complete on the electrobun branch (18 commits)
type: project
---

The `packages/core` extraction and Electrobun desktop app PoC are complete on the `electrobun` branch (18 commits).

**Core package**: All server code (schema, domains, tRPC, query layer) in `packages/core/` with 5 platform adapters. Zero SvelteKit dependencies. SvelteKit web app works via re-export shims.

**Desktop app**: `apps/desktop/` uses Electrobun v1.16.0 with Svelte frontend. Bun.serve() hosts core's tRPC router on localhost:2022. Setup wizard, login, and accounts list pages working.

**Key technical finding**: Bun's module loader is stricter than Vite with circular dependencies. Fixed by having ML domain route files import `t` directly from `$core/trpc/t` instead of the `$core/trpc` barrel. Also needed explicit exports in core's package.json for Bun bundler compatibility.

**Next steps**: The PoC works but needs polish before real use — proper toast UI, full page porting, auto-updates, cross-platform testing, production bundling (currently uses `packages: "external"` which requires node_modules at runtime).
