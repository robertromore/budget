---
name: Electrobun core extraction complete
description: packages/core extraction from SvelteKit app is complete on the electrobun branch, ready for desktop app integration
type: project
---

The `packages/core` extraction is complete on the `electrobun` branch (14 commits). All server code (schema, domains, tRPC, query layer, utils, types) lives in `packages/core/` accessible via `$core/` alias. The SvelteKit app is a thin shell with re-export shims + platform adapters.

**Why:** To enable sharing server code between the SvelteKit web app and a future Electrobun desktop app.

**How to apply:** The five platform adapters (`setEnvProvider`, `RequestAdapter`, `setTrpcClientFactory`, `setToastAdapter`, `setBudgetStateCallbacks`) are the integration points for any new consumer.

**Next steps:** Create an Electrobun app (`apps/desktop/`) that imports `@budget/core` and provides its own adapters (Bun.serve + localhost tRPC client).
