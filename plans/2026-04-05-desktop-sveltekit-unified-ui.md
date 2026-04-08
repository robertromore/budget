# Desktop Unified UI Plan

## Overview

Replace the desktop app's custom Svelte SPA (accounts list, etc.) with the
full SvelteKit budget app served from a local Bun server. The desktop becomes
a thin wrapper: Electrobun handles the setup wizard and desktop-native
features, then hands off to the full SvelteKit app for everything else.

## Current State

- `apps/desktop/` runs a Vite SPA with manually-built accounts list page
- Data layer uses Electrobun native RPC → `createCaller()` directly
- Setup wizard and auto-login are Electrobun RPC-based (keep these)
- `apps/budget/` is 60-70% SSR-dependent — cannot realistically run as a SPA

## Target State

```
┌─────────────────────────────────────┐
│  Electrobun BrowserWindow           │
│                                     │
│  Phase 1: Setup wizard (Vite SPA)   │
│  ↓ setup complete                   │
│  Phase 2: SvelteKit app             │
│    → http://localhost:<port>/        │
│    → Full budget app experience     │
│    → Same UI as web                 │
└─────────────────────────────────────┘
```

## Architecture

The Bun main process:
1. Loads config, runs migrations (unchanged)
2. Shows the Vite SPA for setup/login (unchanged)
3. Once setup is complete:
   - Sets `process.env` variables (DATABASE_URL, BETTER_AUTH_*, DESKTOP_MODE)
   - Imports `getHandler` from the SvelteKit build
   - Starts `Bun.serve()` on an ephemeral port with the SvelteKit fetch handler
   - Calls `/api/desktop/auto-login` to create a session for the local user
   - Calls `mainWindow.webview.loadURL('http://localhost:<port>/')` to navigate

The SvelteKit app runs exactly as on the web. The only differences:
- `DATABASE_URL` points to the local SQLite file
- `DESKTOP_MODE=true` env var enables the auto-login endpoint
- `BETTER_AUTH_URL` points to `http://localhost:<port>`

## Key Technical Decisions

### Direct import, not subprocess

`apps/budget/build/handler.js` exports `getHandler()` which returns
`{ fetch, websocket }`. This can be used directly with `Bun.serve()` in the
same Bun process. No subprocess management or IPC needed.

```typescript
const { getHandler } = await import("../budget-server/handler.js");
const { fetch: skFetch, websocket } = getHandler();
const server = Bun.serve({ port: 0, fetch: skFetch, websocket });
```

### Auto-login via HTTP endpoint

The SvelteKit app adds a `POST /api/desktop/auto-login` endpoint (only
available when `DESKTOP_MODE=true`) that creates a Better Auth session for
the local user and returns a `Set-Cookie` header. The Bun process calls this
and stores the cookie, then the webview navigates with that cookie already set.

Actually simpler: the SvelteKit root layout checks `DESKTOP_MODE` and
auto-creates a session if the user is local and not yet logged in. No
explicit Bun-side call needed.

### BrowserWindow navigation

`BrowserWindow.webview.loadURL(url)` navigates the window to the SvelteKit
app after the server starts.

---

## Phase 1: SvelteKit adaptations

### 1.1 Add `DESKTOP_MODE` env var

In `apps/budget/src/lib/server/env-sveltekit.ts` (or wherever env is wired),
ensure `DESKTOP_MODE` is readable. It's already accessible via
`$env/dynamic/private` since `process.env.DESKTOP_MODE` will be set by the
desktop Bun process.

### 1.2 Auto-login in root layout for desktop

In `apps/budget/src/routes/+layout.server.ts`, add a desktop auto-login path.
When `DESKTOP_MODE=true`, no session, and the path is not `/login` or
`/api/auth`, automatically sign in as the local user:

```typescript
import { env } from "$env/dynamic/private";

// In the load function, before the auth redirect:
if (env.DESKTOP_MODE === "true" && !session && !isPublicRoute(url.pathname)) {
  // Sign in the local desktop user
  const signInResponse = await auth.api.signInEmail({
    body: { email: "local@budget.app", password: "local-desktop-user" },
    asResponse: true,
  });
  if (signInResponse.ok) {
    // Forward the Set-Cookie header so the browser gets the session
    const setCookie = signInResponse.headers.get("set-cookie");
    if (setCookie) {
      setHeaders({ "set-cookie": setCookie });
    }
    // Re-fetch the session for this request
    session = await auth.api.getSession({ headers: event.request.headers });
  }
}
```

This means the desktop user never sees the login page — the first request to
the SvelteKit app auto-authenticates them.

### 1.3 Skip onboarding for desktop

The root layout redirects to `/onboarding` if the workspace wizard hasn't been
completed. For desktop, skip this redirect when `DESKTOP_MODE=true` (the
desktop setup wizard already handles first-launch config).

```typescript
if (!isDesktop && needsOnboarding(currentWorkspace)) {
  redirect(302, "/onboarding");
}
```

### 1.4 Feature flags for desktop-incompatible features

Some features need `DESKTOP_MODE` guards or graceful degradation:
- Email sending (Resend) — no-op in desktop mode, no RESEND_API_KEY
- Bank connections (SimpleFIN, Teller) — work if user provides API keys
- These already fail gracefully when env vars are missing

No code changes needed for these — missing env vars naturally disable them.

---

## Phase 2: Build pipeline

### 2.1 Update `apps/desktop/turbo.json`

Express that the desktop build depends on the budget app's build output:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "extends": ["//"],
  "tasks": {
    "build": {
      "dependsOn": ["@budget/budget#build"],
      "outputs": []
    }
  }
}
```

This ensures Turbo builds `apps/budget` before `apps/desktop`.

### 2.2 Update `apps/desktop/electrobun.config.ts`

Copy the SvelteKit build output into the Electrobun app bundle:

```typescript
build: {
  copy: {
    "dist/index.html": "views/mainview/index.html",
    "dist/assets": "views/mainview/assets",
    "../../apps/budget/build": "budget-server",
  },
}
```

At runtime, `budget-server/` is accessible relative to the Bun process entry
point inside the app bundle.

### 2.3 Path resolution

In dev mode, the budget server path is `../../apps/budget/build/handler.js`
(relative to `src/bun/`). In production, it's `./budget-server/handler.js`
(inside the app bundle).

Use a helper that resolves the correct path:

```typescript
function getBudgetServerPath(): string {
  const channel = await Updater.localInfo.channel();
  if (channel === "dev") {
    return new URL("../../apps/budget/build/handler.js", import.meta.url).pathname;
  }
  // In production, Electrobun sets a known resources path
  return "./budget-server/handler.js";
}
```

---

## Phase 3: Bun process — start SvelteKit server

### 3.1 Create `apps/desktop/src/bun/sveltekit-server.ts`

```typescript
import { setEnvProvider } from "@budget/core/server/env";
import type { DesktopConfig } from "./config";

let serverPort: number | null = null;

export async function startSvelteKitServer(config: DesktopConfig): Promise<number> {
  if (serverPort) return serverPort;

  // Set env vars before importing the SvelteKit handler
  process.env.DATABASE_URL = `file:${config.databasePath}`;
  process.env.BETTER_AUTH_SECRET = "budget-desktop-local-secret-key-32chars!!";
  process.env.DESKTOP_MODE = "true";
  process.env.NODE_ENV = "production";

  // Resolve handler path (dev vs production)
  const handlerPath = resolveHandlerPath();
  const { getHandler } = await import(handlerPath);
  const { fetch: skFetch, websocket } = getHandler();

  const server = Bun.serve({
    port: 0, // ephemeral
    fetch: skFetch,
    ...(websocket ? { websocket } : {}),
  });

  // Update BETTER_AUTH_URL now that we know the port
  process.env.BETTER_AUTH_URL = `http://localhost:${server.port}`;
  process.env.BETTER_AUTH_TRUSTED_ORIGINS = `http://localhost:${server.port}`;

  serverPort = server.port;
  console.log(`SvelteKit server running on port ${serverPort}`);
  return serverPort;
}

function resolveHandlerPath(): string {
  // In dev: relative to this file
  // In production: within the Electrobun bundle resources
  if (process.env.NODE_ENV !== "production") {
    return new URL("../../../../apps/budget/build/handler.js", import.meta.url).pathname;
  }
  // Electrobun bundle — copied to budget-server/ by electrobun.config.ts
  return new URL("../budget-server/handler.js", import.meta.url).pathname;
}
```

### 3.2 Update `apps/desktop/src/bun/index.ts`

After a successful setup and login, start the SvelteKit server and navigate
the webview:

```typescript
import { startSvelteKitServer } from "./sveltekit-server";

// In the RPC handler for autoLogin success:
// (called from the setup complete flow)

const rpc = BrowserView.defineRPC<AppRPC>({
  handlers: {
    requests: {
      autoLogin: async () => {
        const result = await handleAutoLogin();
        if (result.success) {
          // Start SvelteKit server and navigate
          const port = await startSvelteKitServer(config);
          // Give the server a moment to initialize
          await Bun.sleep(500);
          mainWindow.webview.loadURL(`http://localhost:${port}/`);
        }
        return result;
      },
      // ... other handlers
    },
  },
});
```

The 500ms sleep gives the SvelteKit server time to fully initialize before
the webview navigates to it.

---

## Phase 4: Root layout auto-login

This is the SvelteKit-side implementation of Phase 1.2. The key constraint:
`setHeaders` in a server load function sets response headers, which includes
`Set-Cookie`. The browser processes these and the session is established on
the first page load.

The flow:
1. Desktop Bun process starts SvelteKit server
2. Navigates webview to `http://localhost:<port>/`
3. SvelteKit root layout server load runs
4. Detects `DESKTOP_MODE=true`, no session
5. Signs in local user via `auth.api.signInEmail`
6. Forwards `Set-Cookie` header to the browser
7. Redirects to `/` (or the landing page)
8. Browser now has a valid session cookie
9. Subsequent requests are authenticated normally

---

## Phase 5: Cleanup

Once the SvelteKit integration is working:

### 5.1 Remove desktop SPA pages

Delete pages that are now covered by SvelteKit:
- `apps/desktop/src/mainview/pages/Accounts.svelte`
- (Keep `Setup.svelte` and `Login.svelte` — these are the pre-SvelteKit phase)

### 5.2 Remove desktop query layer

Delete files that were used by the desktop SPA:
- `apps/desktop/src/mainview/lib/trpc-client.ts`
- `apps/desktop/src/mainview/lib/query-client.ts`
- `apps/desktop/src/mainview/lib/electrobun.ts` — keep only the setup/config RPC calls
- `apps/desktop/src/shared/rpc.ts` — simplify to setup-only RPC schema
- `apps/desktop/src/mainview/lib/components/ui/` — no longer needed (SvelteKit has its own)

### 5.3 Simplify RPC schema

The Electrobun RPC schema only needs setup-phase operations after the
SvelteKit server takes over:

```typescript
export type AppRPC = {
  bun: RPCSchema<{
    requests: {
      getConfig: { params: {}; response: DesktopConfig };
      setup: { params: SetupParams; response: SetupResult };
      autoLogin: { params: {}; response: AutoLoginResult };
      // trpcCall removed — SvelteKit handles data over HTTP now
    };
  }>;
};
```

---

## Phase 6: Dev workflow

### Running in development

```bash
# Terminal 1: SvelteKit app (with DATABASE_URL pointing to dev DB)
cd apps/budget && bun run dev

# Terminal 2: Desktop app (setup wizard phase)
cd apps/desktop && bun run dev
```

For the main app phase in dev, the desktop should connect to the SvelteKit
dev server (`http://localhost:5173`) instead of building. Add a dev-mode
shortcut: if `VITE_DEV_SERVER` is detected, `startSvelteKitServer` skips the
build import and returns 5173 directly.

### Building for distribution

```bash
# From repo root — builds budget first, then desktop
bun run build

# Or explicitly
cd apps/budget && bun run build
cd apps/desktop && bun run build:canary
```

---

## Testing Strategy

1. Delete `~/.config/budget-desktop/config.json` to reset
2. `cd apps/desktop && bun run start`
3. Setup wizard appears (Vite SPA) — complete setup
4. Auto-login fires, SvelteKit server starts, webview navigates
5. Full SvelteKit app loads — accounts page, transactions, etc.
6. Reopen app — skips setup, SvelteKit starts directly, auto-login in layout

---

## Open Questions

1. **BETTER_AUTH_URL timing**: `process.env.BETTER_AUTH_URL` needs to be set
   before the SvelteKit handler initializes. The handler is imported after env
   vars are set, so this should work — but needs verification that Better Auth
   reads `BETTER_AUTH_URL` at request time, not at module import time.

2. **Electrobun production bundle path**: The exact path to `handler.js`
   inside the Electrobun bundle depends on how Electrobun resolves paths for
   dynamic imports in the bundled Bun process. Verify with a test build.

3. **SvelteKit hot reload in dev**: When developing the SvelteKit app while
   running the desktop, the webview should reload on changes. This works
   naturally when pointing at the Vite dev server (port 5173). Define a clear
   dev workflow that uses this path.

4. **Window title / chrome**: The native window title bar shows "Budget" but
   the SvelteKit app has its own header. May want to hide the native title bar
   or use `titleBarStyle: "hidden"` in `BrowserWindow` config.
