# New Page

Generate SvelteKit routes/pages following project patterns.

## Usage

```
/page settings                           # Simple page with layout
/page reports/[id]                       # Dynamic route with param
/page admin --layout                     # Page with custom layout
/page export --server                    # Page with server load + actions
/page dashboard --protected              # Protected route requiring auth
```

## Arguments

Parse from `$ARGUMENTS`:
- First arg: Route path (e.g., `settings`, `reports/[id]`, `admin/users`)
- Optional flags:
  - `--layout`: Include a custom layout file
  - `--server`: Include server load function and actions
  - `--protected`: Add authentication guard
  - `--group {name}`: Use route group (e.g., `--group (dashboard)`)
  - `--form {schema}`: Include form with Superforms

## Process

### 1. Parse Route Path

Analyze the route path to determine:
- Static segments: `settings`, `admin`
- Dynamic parameters: `[id]`, `[slug]`
- Optional parameters: `[[optional]]`
- Rest parameters: `[...rest]`
- Route groups: `(groupName)`

### 2. Determine Files to Create

| Flag | Files Created |
|------|---------------|
| Basic | `+page.svelte` |
| `--server` | `+page.svelte`, `+page.server.ts` |
| `--layout` | `+page.svelte`, `+layout.svelte`, `+layout.server.ts` |
| `--protected` | Adds auth check to server files |
| `--form` | Includes form validation setup |

### 3. Generate Files

#### Basic Page (`+page.svelte`)

```svelte
<!-- src/routes/{path}/+page.svelte -->
<script lang="ts">
  import type { PageData } from "./$types";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>{Title} | Budget App</title>
</svelte:head>

<div class="container py-6 space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">{Title}</h1>
      <p class="text-muted-foreground">
        {Description of the page}
      </p>
    </div>
    <Button>Action</Button>
  </div>

  <Card.Root>
    <Card.Header>
      <Card.Title>Content Section</Card.Title>
      <Card.Description>Section description here.</Card.Description>
    </Card.Header>
    <Card.Content>
      <!-- Page content -->
    </Card.Content>
  </Card.Root>
</div>
```

#### Server Load (`+page.server.ts`)

```typescript
// src/routes/{path}/+page.server.ts
import type { PageServerLoad, Actions } from "./$types";
import { createContext } from "$lib/trpc/context";
import { createCaller } from "$lib/trpc/router";
import { superValidate, message } from "sveltekit-superforms";
import { zod4 } from "sveltekit-superforms/adapters";
import { fail, redirect } from "@sveltejs/kit";
import { {schema}Schema } from "$lib/schema/superforms";

export const load: PageServerLoad = async (event) => {
  const caller = createCaller(await createContext(event));

  // Fetch data using tRPC
  const items = await caller.{domain}Routes.all();

  // Prepare form if needed
  const form = await superValidate(zod4({schema}Schema));

  return {
    items,
    form,
  };
};

export const actions: Actions = {
  default: async (event) => {
    const form = await superValidate(event, zod4({schema}Schema));

    if (!form.valid) {
      return fail(400, { form });
    }

    try {
      const caller = createCaller(await createContext(event));
      await caller.{domain}Routes.create(form.data);

      return message(form, "Successfully created!");
    } catch (error) {
      return message(form, "Failed to create. Please try again.", {
        status: 500,
      });
    }
  },

  update: async (event) => {
    const form = await superValidate(event, zod4({schema}Schema));

    if (!form.valid) {
      return fail(400, { form });
    }

    try {
      const caller = createCaller(await createContext(event));
      await caller.{domain}Routes.update(form.data);

      return message(form, "Successfully updated!");
    } catch (error) {
      return message(form, "Failed to update. Please try again.", {
        status: 500,
      });
    }
  },

  delete: async (event) => {
    const formData = await event.request.formData();
    const id = Number(formData.get("id"));

    if (!id) {
      return fail(400, { error: "Invalid ID" });
    }

    try {
      const caller = createCaller(await createContext(event));
      await caller.{domain}Routes.delete({ id });

      return { success: true };
    } catch (error) {
      return fail(500, { error: "Failed to delete" });
    }
  },
};
```

#### Dynamic Route with Parameter

```typescript
// src/routes/{path}/[slug]/+page.server.ts
import type { PageServerLoad } from "./$types";
import { createContext } from "$lib/trpc/context";
import { createCaller } from "$lib/trpc/router";
import { error } from "@sveltejs/kit";

export const load: PageServerLoad = async (event) => {
  const { params } = event;
  const caller = createCaller(await createContext(event));

  const item = await caller.{domain}Routes.getBySlug({ slug: params.slug });

  if (!item) {
    throw error(404, {
      message: "Not found",
      code: "NOT_FOUND",
    });
  }

  return { item };
};
```

```svelte
<!-- src/routes/{path}/[slug]/+page.svelte -->
<script lang="ts">
  import type { PageData } from "./$types";
  import { page } from "$app/stores";
  import { Button } from "$lib/components/ui/button";
  import { ArrowLeft } from "lucide-svelte";

  let { data }: { data: PageData } = $props();

  const { item } = data;
</script>

<svelte:head>
  <title>{item.name} | Budget App</title>
</svelte:head>

<div class="container py-6 space-y-6">
  <div class="flex items-center gap-4">
    <Button variant="ghost" size="icon" href="/{parent-path}">
      <ArrowLeft class="h-4 w-4" />
    </Button>
    <div>
      <h1 class="text-2xl font-bold tracking-tight">{item.name}</h1>
      <p class="text-muted-foreground">{item.description}</p>
    </div>
  </div>

  <!-- Detail content -->
</div>
```

#### Layout (`+layout.svelte`)

```svelte
<!-- src/routes/{path}/+layout.svelte -->
<script lang="ts">
  import type { LayoutData } from "./$types";
  import type { Snippet } from "svelte";
  import { page } from "$app/stores";
  import { Sidebar } from "$lib/components/ui/sidebar";
  import { Button } from "$lib/components/ui/button";

  let { data, children }: { data: LayoutData; children: Snippet } = $props();

  const navItems = [
    { href: "/{path}", label: "Overview", icon: "home" },
    { href: "/{path}/settings", label: "Settings", icon: "settings" },
  ];
</script>

<div class="flex min-h-screen">
  <aside class="w-64 border-r bg-muted/40">
    <nav class="p-4 space-y-1">
      {#each navItems as item}
        <Button
          variant={$page.url.pathname === item.href ? "secondary" : "ghost"}
          class="w-full justify-start"
          href={item.href}
        >
          {item.label}
        </Button>
      {/each}
    </nav>
  </aside>

  <main class="flex-1">
    {@render children()}
  </main>
</div>
```

#### Layout Server Load (`+layout.server.ts`)

```typescript
// src/routes/{path}/+layout.server.ts
import type { LayoutServerLoad } from "./$types";
import { createContext } from "$lib/trpc/context";
import { createCaller } from "$lib/trpc/router";

export const load: LayoutServerLoad = async (event) => {
  const caller = createCaller(await createContext(event));

  // Load data needed across all child routes
  const sharedData = await caller.{domain}Routes.getShared();

  return {
    sharedData,
  };
};
```

#### Protected Route

```typescript
// src/routes/{path}/+page.server.ts
import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";

export const load: PageServerLoad = async (event) => {
  const session = await event.locals.auth();

  if (!session?.user) {
    throw redirect(302, `/login?redirectTo=${event.url.pathname}`);
  }

  // Continue with authenticated load...
  return {
    user: session.user,
  };
};
```

#### Route Group Structure

For route groups (e.g., `(dashboard)`):

```
src/routes/
├── (dashboard)/
│   ├── +layout.svelte          # Shared layout for dashboard routes
│   ├── +layout.server.ts       # Shared data loading
│   ├── overview/
│   │   └── +page.svelte
│   ├── analytics/
│   │   └── +page.svelte
│   └── settings/
│       └── +page.svelte
```

#### Route-Scoped Components

For components specific to a route:

```
src/routes/{path}/
├── +page.svelte
├── +page.server.ts
└── (components)/               # Route-scoped components folder
    ├── header-section.svelte
    ├── data-table.svelte
    └── (charts)/               # Nested group for charts
        ├── summary-chart.svelte
        └── trend-chart.svelte
```

### 4. File Structure Summary

```
src/routes/{path}/
├── +page.svelte           # UI component
├── +page.server.ts        # Server load + actions (optional)
├── +page.ts               # Client load (optional)
├── +layout.svelte         # Layout wrapper (optional)
├── +layout.server.ts      # Layout server load (optional)
├── +error.svelte          # Error page (optional)
└── (components)/          # Route-scoped components (optional)
    └── *.svelte
```

## Example Outputs

### Basic Page

```
## Generated Route: /settings

Created files:
- `src/routes/settings/+page.svelte`

### Usage

Navigate to `/settings` to view the page.

\`\`\`svelte
<script lang="ts">
  // Settings page component
</script>

<div class="container py-6">
  <h1>Settings</h1>
  <!-- Content -->
</div>
\`\`\`
```

### Dynamic Route with Server Load

```
## Generated Route: /reports/[id]

Created files:
- `src/routes/reports/[id]/+page.svelte`
- `src/routes/reports/[id]/+page.server.ts`

### Server Load

\`\`\`typescript
export const load: PageServerLoad = async (event) => {
  const { params } = event;
  const caller = createCaller(await createContext(event));

  const report = await caller.reportRoutes.getById({ id: Number(params.id) });

  if (!report) {
    throw error(404, "Report not found");
  }

  return { report };
};
\`\`\`

### Page Component

\`\`\`svelte
<script lang="ts">
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<h1>{data.report.name}</h1>
\`\`\`
```

### Protected Route with Layout

```
## Generated Route: /admin (protected)

Created files:
- `src/routes/admin/+layout.svelte`
- `src/routes/admin/+layout.server.ts`
- `src/routes/admin/+page.svelte`

### Layout Server Load (with auth guard)

\`\`\`typescript
export const load: LayoutServerLoad = async (event) => {
  const session = await event.locals.auth();

  if (!session?.user) {
    throw redirect(302, "/login?redirectTo=/admin");
  }

  // Check admin role
  if (session.user.role !== "admin") {
    throw error(403, "Admin access required");
  }

  return { user: session.user };
};
\`\`\`
```

## Reference Files

| Pattern | Reference |
|---------|-----------|
| Page with tRPC | `src/routes/accounts/[slug]/+page.server.ts` |
| Layout structure | `src/routes/+layout.svelte` |
| Protected routes | `src/routes/(app)/+layout.server.ts` |
| Route groups | `src/routes/accounts/[slug]/(components)/` |
| Form actions | `src/routes/settings/+page.server.ts` |
| Error handling | `src/routes/+error.svelte` |

## SvelteKit Patterns

### Data Loading

```typescript
// Server-side (preferred for auth/sensitive data)
export const load: PageServerLoad = async (event) => {
  const caller = createCaller(await createContext(event));
  return { data: await caller.routes.all() };
};

// Client-side (for public data)
export const load: PageLoad = async ({ fetch }) => {
  const response = await fetch("/api/data");
  return { data: await response.json() };
};
```

### Form Handling

```typescript
export const actions: Actions = {
  default: async (event) => {
    const form = await superValidate(event, zod4(schema));
    if (!form.valid) return fail(400, { form });

    // Process form...
    return { form };
  },
};
```

### Navigation

```svelte
<script>
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";

  // Programmatic navigation
  await goto("/new-path");

  // Current path
  const currentPath = $page.url.pathname;
</script>
```

$ARGUMENTS
