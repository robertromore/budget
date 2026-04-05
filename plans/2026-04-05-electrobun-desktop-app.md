# Electrobun Desktop App Implementation Plan

## Overview

Create an Electrobun desktop app (`apps/desktop/`) that imports `@budget/core`
and provides its own platform adapters. The app runs a local Bun.serve() tRPC
server, stores data in a local SQLite database, and renders a Svelte frontend
in the system webview. A first-launch setup wizard lets the user choose the
database location and auth mode.

## Current State Analysis

- `packages/core/` contains all shared server code (schema, domains, tRPC
  router, query layer) with zero SvelteKit dependencies
- Five platform adapters exist: `setEnvProvider`, `RequestAdapter`,
  `setTrpcClientFactory`, `setToastAdapter`, `setBudgetStateCallbacks`
- Electrobun v1.16.0 Svelte template uses: `src/bun/` (main process) +
  `src/mainview/` (Svelte frontend via Vite)
- The core package uses `@tanstack/svelte-query` (peer dep) for the query layer

### Key Discoveries

- Electrobun apps are standalone with their own `electrobun.config.ts` and build
  pipeline separate from Turbo
- The main process has full Bun runtime access (`Bun.serve()`, filesystem, etc.)
- `fetchRequestHandler` from `@trpc/server/adapters/fetch` works directly with
  Bun's native `Request`/`Response`
- Better Auth works over localhost cookies in a webview
- Drizzle migrations need to run on first launch against the local SQLite file

## Desired End State

A working desktop app that:

- Launches a native window with a Svelte UI
- Runs a local tRPC server on an ephemeral port
- Stores data in a user-chosen SQLite file (default `~/Documents/budget/`)
- Shows a first-launch setup wizard for database path and auth mode choice
- Can log in (or auto-authenticate) and display an account list
- Shares 100% of the business logic with the web app via `@budget/core`

### Verification

- `cd apps/desktop && bun install && bun run start` launches the app
- The tRPC server responds on localhost
- A user can complete the setup wizard, create an account, and see it listed

## What We're NOT Doing

- Porting the full UI (only login + accounts list for the PoC)
- Auto-updates, code signing, or distribution packaging
- Windows/Linux testing (macOS only for the PoC)
- Electrobun's native RPC system (we use tRPC over HTTP for core compatibility)
- CEF bundling (system webview only)

## Implementation Approach

Follow the Electrobun Svelte template structure. The main process hosts both the
tRPC server and wires the five core adapters. The Svelte frontend uses
TanStack Query with the same `rpc` namespace as the web app. A setup wizard
runs on first launch to configure the database path and auth preference.

---

## Phase 1: Scaffold `apps/desktop/`

### Overview

Create the Electrobun app directory from the Svelte template, wire it into the
monorepo workspace, and verify it launches.

### Changes Required

#### 1. Create `apps/desktop/package.json`

```json
{
  "name": "@budget/desktop",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "description": "Budget desktop app powered by Electrobun",
  "scripts": {
    "start": "vite build && electrobun dev",
    "dev": "electrobun dev --watch",
    "dev:hmr": "concurrently \"bun run hmr\" \"bun run start\"",
    "hmr": "vite --port 5174",
    "build:canary": "vite build && electrobun build --env=canary"
  },
  "dependencies": {
    "@budget/core": "workspace:*",
    "@trpc/client": "^11.16.0",
    "@tanstack/svelte-query": "^6.1.10",
    "electrobun": "1.16.0"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^5.0.1",
    "@types/bun": "latest",
    "concurrently": "^9.1.0",
    "svelte": "^5.14.1",
    "typescript": "^5.8.3",
    "vite": "^6.0.3"
  }
}
```

Note: use port 5174 for HMR to avoid conflict with the web app's 5173.

#### 2. Create `apps/desktop/electrobun.config.ts`

```typescript
import type { ElectrobunConfig } from "electrobun";

export default {
  app: {
    name: "Budget",
    identifier: "app.budget.desktop",
    version: "0.0.1",
  },
  build: {
    copy: {
      "dist/index.html": "views/mainview/index.html",
      "dist/assets": "views/mainview/assets",
    },
    watchIgnore: ["dist/**"],
    mac: { bundleCEF: false },
    linux: { bundleCEF: false },
    win: { bundleCEF: false },
  },
} satisfies ElectrobunConfig;
```

#### 3. Create `apps/desktop/vite.config.ts`

```typescript
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [svelte()],
  root: "src/mainview",
  resolve: {
    alias: {
      "$core": "../../packages/core/src",
    },
  },
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    strictPort: true,
  },
});
```

The `$core` alias resolves to `packages/core/src/` so the Svelte frontend can
import from `@budget/core` via the same paths.

#### 4. Create `apps/desktop/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "checkJs": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "paths": {
      "$core": ["../../packages/core/src"],
      "$core/*": ["../../packages/core/src/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

#### 5. Create `apps/desktop/svelte.config.js`

```javascript
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

export default {
  preprocess: vitePreprocess(),
};
```

#### 6. Create `apps/desktop/src/bun/index.ts` (minimal)

```typescript
import { BrowserWindow, Updater } from "electrobun/bun";

const DEV_SERVER_PORT = 5174;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

async function getMainViewUrl(): Promise<string> {
  const channel = await Updater.localInfo.channel();
  if (channel === "dev") {
    try {
      await fetch(DEV_SERVER_URL, { method: "HEAD" });
      return DEV_SERVER_URL;
    } catch {
      // Vite not running
    }
  }
  return "views://mainview/index.html";
}

const url = await getMainViewUrl();

const mainWindow = new BrowserWindow({
  title: "Budget",
  url,
  frame: { width: 1200, height: 800, x: 100, y: 100 },
});

console.log("Budget desktop app started!");
```

#### 7. Create `apps/desktop/src/mainview/` files

- `index.html` — Standard HTML shell with `<div id="app">`
- `main.ts` — Svelte mount point
- `App.svelte` — Root component with "Hello from Budget Desktop"

### Success Criteria

#### Automated Verification

- `bun install` resolves workspace deps
- `apps/desktop/` is listed in workspace

#### Manual Verification

- `cd apps/desktop && bun run start` launches a native window
- The window displays "Hello from Budget Desktop"

---

## Phase 2: Wire the tRPC Server in the Main Process

### Overview

Add `Bun.serve()` to the main process that hosts the core tRPC router. Wire the
three server-side adapters (env, RequestAdapter, database). Run Drizzle
migrations on startup. Store config in a JSON file for first-launch setup.

### Changes Required

#### 1. Create `apps/desktop/src/bun/config.ts`

Desktop app configuration stored in the Electrobun app data directory.

```typescript
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface DesktopConfig {
  databasePath: string;
  authMode: "local" | "password";
  setupComplete: boolean;
}

const CONFIG_DIR = join(homedir(), ".config", "budget-desktop");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

const DEFAULT_CONFIG: DesktopConfig = {
  databasePath: join(homedir(), "Documents", "budget", "budget.db"),
  authMode: "local",
  setupComplete: false,
};

export function loadConfig(): DesktopConfig {
  if (!existsSync(CONFIG_FILE)) return { ...DEFAULT_CONFIG };
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: DesktopConfig): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}
```

#### 2. Create `apps/desktop/src/bun/server.ts`

The tRPC server using Bun.serve() with core's router.

```typescript
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { router } from "$core/trpc/router";
import { createContext, type RequestAdapter } from "$core/trpc/context";
import { setEnvProvider } from "$core/server/env";
import type { DesktopConfig } from "./config";

function fromBunRequest(req: Request): RequestAdapter {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [key, ...val] = c.trim().split("=");
      return [key, val.join("=")];
    })
  );

  const responseCookies: string[] = [];

  return {
    headers: req.headers,
    getCookie: (name) => cookies[name],
    setCookie: (name, value, opts) => {
      let cookie = `${name}=${value}`;
      if (opts.path) cookie += `; Path=${opts.path}`;
      if (opts.maxAge) cookie += `; Max-Age=${opts.maxAge}`;
      if (opts.httpOnly) cookie += `; HttpOnly`;
      if (opts.secure) cookie += `; Secure`;
      if (opts.sameSite) cookie += `; SameSite=${opts.sameSite}`;
      responseCookies.push(cookie);
    },
  };
}

export function startServer(config: DesktopConfig): number {
  // Wire env provider with process.env + config overrides
  setEnvProvider({
    get: (key) => {
      if (key === "DATABASE_URL") return `file:${config.databasePath}`;
      if (key === "BETTER_AUTH_SECRET") return "desktop-local-secret";
      if (key === "BETTER_AUTH_URL") return "http://localhost";
      return process.env[key];
    },
  });

  const server = Bun.serve({
    port: 0, // Ephemeral port
    fetch: async (req) => {
      const url = new URL(req.url);

      // Handle Better Auth routes
      if (url.pathname.startsWith("/api/auth")) {
        const { auth } = await import("$core/server/auth");
        return auth.handler(req);
      }

      // Handle tRPC routes
      if (url.pathname.startsWith("/api/trpc")) {
        return fetchRequestHandler({
          endpoint: "/api/trpc",
          req,
          router,
          createContext: () => createContext(fromBunRequest(req)),
        });
      }

      return new Response("Not Found", { status: 404 });
    },
  });

  console.log(`tRPC server running on port ${server.port}`);
  return server.port;
}
```

#### 3. Create `apps/desktop/src/bun/migrate.ts`

Run Drizzle migrations on startup.

```typescript
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export async function runMigrations(databasePath: string): Promise<void> {
  // Ensure the directory exists
  mkdirSync(dirname(databasePath), { recursive: true });

  const { createClient } = await import("@libsql/client");
  const { drizzle } = await import("drizzle-orm/libsql");
  const { migrate } = await import("drizzle-orm/libsql/migrator");

  const client = createClient({ url: `file:${databasePath}` });
  const db = drizzle(client);

  await migrate(db, {
    migrationsFolder: "../../apps/budget/drizzle",
  });

  console.log("Database migrations complete");
}
```

#### 4. Update `apps/desktop/src/bun/index.ts`

Wire everything together:

```typescript
import { BrowserWindow, Updater } from "electrobun/bun";
import { loadConfig } from "./config";
import { startServer } from "./server";
import { runMigrations } from "./migrate";

const config = loadConfig();

// Run migrations and start server
await runMigrations(config.databasePath);
const serverPort = startServer(config);

// Dev server detection
const DEV_SERVER_PORT = 5174;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

async function getMainViewUrl(): Promise<string> {
  const channel = await Updater.localInfo.channel();
  if (channel === "dev") {
    try {
      await fetch(DEV_SERVER_URL, { method: "HEAD" });
      return `${DEV_SERVER_URL}?serverPort=${serverPort}`;
    } catch {}
  }
  return `views://mainview/index.html?serverPort=${serverPort}`;
}

const url = await getMainViewUrl();
const showSetup = !config.setupComplete;

const mainWindow = new BrowserWindow({
  title: "Budget",
  url: showSetup ? `${url}&setup=true` : url,
  frame: { width: 1200, height: 800, x: 100, y: 100 },
});

console.log(`Budget desktop running (server: ${serverPort})`);
```

The server port is passed to the frontend via URL query parameter so the tRPC
client knows where to connect.

### Success Criteria

#### Automated Verification

- Core package resolves from desktop app imports
- TypeScript compiles without errors

#### Manual Verification

- App launches and the tRPC server starts on an ephemeral port
- `curl http://localhost:<port>/api/trpc/authRoutes.getSession` returns JSON

---

## Phase 3: Wire the Svelte Frontend

### Overview

Set up the Svelte frontend with TanStack Query, tRPC client pointing at the
local server, and the core query layer.

### Changes Required

#### 1. Create `apps/desktop/src/mainview/lib/trpc-client.ts`

```typescript
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { setTrpcClientFactory } from "$core/trpc/client-factory";
import { setToastAdapter } from "$core/query/_toast";
import type { Router } from "$core/trpc/router";

// Read server port from URL query params
const params = new URLSearchParams(window.location.search);
const serverPort = params.get("serverPort") || "2022";
const SERVER_URL = `http://localhost:${serverPort}/api/trpc`;

let client: ReturnType<typeof createTRPCClient<Router>>;

export function trpc() {
  if (client) return client;
  client = createTRPCClient<Router>({
    links: [httpBatchLink({ url: SERVER_URL })],
  });
  return client;
}

// Wire adapters
setTrpcClientFactory(trpc);
setToastAdapter({
  success: (msg) => console.log("[toast]", msg),
  error: (msg) => console.error("[toast]", msg),
  info: (msg) => console.info("[toast]", msg),
});
```

Toast uses console for the PoC. A proper toast UI can be added later.

#### 2. Create `apps/desktop/src/mainview/lib/query.ts`

Re-export the rpc namespace from core with TanStack Query wiring.

```typescript
import "$lib/trpc-client"; // Ensure adapters are wired

export { rpc } from "$core/query/index";
export { queryClient } from "$core/query/_client";
```

Wait -- the app's `$core/query/index.ts` is in core but the barrel references
other core query files via `$core/query/*`. The desktop app's Vite config
has the `$core` alias so these should resolve.

Actually, the core's `query/index.ts` is a barrel that re-exports from sibling
files. Since core files use relative imports internally, and Vite resolves
`$core/` to `packages/core/src/`, this should just work.

#### 3. Update `apps/desktop/src/mainview/main.ts`

```typescript
import "./app.css";
import App from "./App.svelte";
import { mount } from "svelte";
import "./lib/trpc-client"; // Wire adapters on startup

const app = mount(App, {
  target: document.getElementById("app")!,
});

export default app;
```

#### 4. Create `apps/desktop/src/mainview/App.svelte`

Root component with TanStack Query provider and basic routing.

```svelte
<script lang="ts">
  import { QueryClientProvider } from "@tanstack/svelte-query";
  import { queryClient } from "$core/query/_client";

  const params = new URLSearchParams(window.location.search);
  const showSetup = params.get("setup") === "true";

  let currentPage = $state(showSetup ? "setup" : "home");
</script>

<QueryClientProvider client={queryClient}>
  {#if currentPage === "setup"}
    <p>Setup wizard coming in Phase 4...</p>
  {:else}
    <p>Budget Desktop - Home</p>
  {/if}
</QueryClientProvider>
```

### Success Criteria

#### Manual Verification

- App launches, frontend loads, TanStack Query provider initializes
- No console errors about missing modules or failed tRPC connections
- The tRPC client successfully connects to the local server

---

## Phase 4: Minimal Working UI

### Overview

Add a first-launch setup wizard (database path + auth mode) and a basic
accounts list page that fetches data from the local tRPC server.

### Changes Required

#### 1. Setup Wizard Component

`apps/desktop/src/mainview/pages/Setup.svelte`

- Text input for database path (default: `~/Documents/budget/budget.db`)
- Radio buttons for auth mode: "No password (local only)" vs "Password
  protected"
- If password mode: email + password fields to create the first user
- "Complete Setup" button that POSTs config to a setup tRPC route, then
  reloads the app

#### 2. Setup tRPC Route

Add a `desktopSetup` route to the tRPC server (desktop-only, not in core)
that saves the config and creates the initial user/workspace.

#### 3. Login Page Component

`apps/desktop/src/mainview/pages/Login.svelte`

- Email + password form using Better Auth's `signIn.email()`
- Auto-login path for "local" auth mode (creates/uses a default local user)

#### 4. Accounts List Component

`apps/desktop/src/mainview/pages/Accounts.svelte`

```svelte
<script lang="ts">
  import { createQuery } from "@tanstack/svelte-query";
  import * as accounts from "$core/query/accounts";

  const accountsQuery = createQuery(accounts.listAccounts().options());
  const accountList = $derived(accountsQuery.data ?? []);
</script>

<h1>Accounts</h1>
{#if accountsQuery.isLoading}
  <p>Loading...</p>
{:else}
  <ul>
    {#each accountList as account}
      <li>{account.name}: {account.balance}</li>
    {/each}
  </ul>
{/if}
```

### Success Criteria

#### Manual Verification

- First launch shows setup wizard
- User can choose database path and auth mode
- After setup, login page appears (or auto-login for local mode)
- Accounts list page displays accounts from the local SQLite database
- Closing and reopening the app skips setup and goes to login/home

---

## Testing Strategy

### Manual Testing Steps

1. Delete `~/.config/budget-desktop/config.json` to reset
2. `cd apps/desktop && bun run start`
3. Verify setup wizard appears
4. Complete setup with default database path
5. Verify database file created at `~/Documents/budget/budget.db`
6. Create a test account
7. Verify it appears in the accounts list
8. Close and reopen the app
9. Verify it skips setup and shows the accounts

### What We're Testing

- Core package imports resolve correctly from the desktop app
- tRPC server starts and responds
- Better Auth works over localhost
- Drizzle migrations run on first launch
- TanStack Query fetches and displays data
- The five platform adapters wire correctly

## Performance Considerations

- Use an ephemeral port (port 0) to avoid conflicts
- SQLite is local so queries should be sub-millisecond
- No SSR needed — the webview loads a static SPA
- The `queryClient` default `enabled: browser` check works because
  `typeof window !== "undefined"` is true in the webview

## References

- Electrobun Svelte template: `templates/svelte/` in the Electrobun repo
- Core package: `packages/core/` in this monorepo
- Platform adapters: documented in `CLAUDE.md` under "Platform Adapters"
- Migration plan: `plans/2026-04-04-extract-packages-core.md`
