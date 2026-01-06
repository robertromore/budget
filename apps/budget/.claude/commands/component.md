# New Component

Generate UI components following project patterns with Shadcn Svelte and Svelte 5 runes.

## Usage

```
/component form manage-budget            # Form with Superforms
/component dialog confirm-delete         # Dialog component
/component card account-summary          # Card display component
/component sheet transaction-details     # Responsive sheet
/component input currency                # Custom input
/component table payee-list              # Data table component
```

## Arguments

Parse from `$ARGUMENTS`:
- First arg: Component type (`form`, `dialog`, `card`, `sheet`, `input`, `table`)
- Second arg: Component name in kebab-case (e.g., `manage-budget`, `confirm-delete`)
- Optional flags:
  - `--domain {name}`: Associate with a domain (e.g., `--domain accounts`)
  - `--route {path}`: Create as route-scoped component
  - `--standalone`: Create in standalone components folder

## Process

### 1. Validate Arguments

If component type is not provided, ask the user:
- **form**: Form with Superforms validation and submission
- **dialog**: Modal dialog with actions
- **card**: Display card for data presentation
- **sheet**: Responsive drawer/sheet (mobile-friendly)
- **input**: Custom form input component
- **table**: Data table with TanStack Table

### 2. Determine File Location

| Type | Default Location |
|------|------------------|
| `form` | `src/lib/components/forms/{name}-form.svelte` |
| `dialog` | `src/lib/components/dialogs/{name}-dialog.svelte` |
| `card` | `src/lib/components/{domain}/{name}-card.svelte` |
| `sheet` | `src/lib/components/{domain}/{name}-sheet.svelte` |
| `input` | `src/lib/components/input/{name}-input.svelte` |
| `table` | `src/lib/components/{domain}/{name}-table.svelte` |

With `--route` flag:
```
src/routes/{route}/(components)/{name}.svelte
```

### 3. Generate Component

#### Form Component

```svelte
<!-- src/lib/components/forms/{name}-form.svelte -->
<script lang="ts">
  import { useEntityForm } from "$lib/forms/use-entity-form";
  import { {schema}Schema } from "$lib/schema/superforms";
  import type { SuperValidated } from "sveltekit-superforms";
  import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormDescription,
    FormMessage,
  } from "$lib/components/ui/form";
  import { Input } from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";
  import { Textarea } from "$lib/components/ui/textarea";

  interface Props {
    formData: SuperValidated<typeof {schema}Schema>;
    mode?: "create" | "edit";
    onSuccess?: () => void;
    onCancel?: () => void;
  }

  let { formData, mode = "create", onSuccess, onCancel }: Props = $props();

  const form = useEntityForm({
    formData,
    schema: {schema}Schema,
    formId: "{kebab-case-name}-form",
    onSave: onSuccess,
  });

  const { form: data, enhance, submitting, errors } = form;

  const isEditing = $derived(mode === "edit");
</script>

<form use:enhance class="space-y-4">
  <FormField name="name">
    <FormItem>
      <FormLabel>Name</FormLabel>
      <FormControl>
        <Input
          bind:value={$data.name}
          placeholder="Enter name"
          disabled={$submitting}
        />
      </FormControl>
      <FormDescription>A unique name for this item.</FormDescription>
      <FormMessage errors={$errors.name} />
    </FormItem>
  </FormField>

  <FormField name="description">
    <FormItem>
      <FormLabel>Description</FormLabel>
      <FormControl>
        <Textarea
          bind:value={$data.description}
          placeholder="Optional description"
          disabled={$submitting}
          rows={3}
        />
      </FormControl>
      <FormMessage errors={$errors.description} />
    </FormItem>
  </FormField>

  <div class="flex justify-end gap-2 pt-4">
    {#if onCancel}
      <Button type="button" variant="outline" onclick={onCancel} disabled={$submitting}>
        Cancel
      </Button>
    {/if}
    <Button type="submit" disabled={$submitting}>
      {#if $submitting}
        Saving...
      {:else}
        {isEditing ? "Update" : "Create"}
      {/if}
    </Button>
  </div>
</form>
```

#### Dialog Component

```svelte
<!-- src/lib/components/dialogs/{name}-dialog.svelte -->
<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import type { Snippet } from "svelte";

  interface Props {
    open?: boolean;
    title?: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "default" | "destructive";
    loading?: boolean;
    onConfirm: () => void | Promise<void>;
    onCancel?: () => void;
    children?: Snippet;
  }

  let {
    open = $bindable(false),
    title = "Confirm Action",
    description = "Are you sure you want to proceed?",
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    variant = "default",
    loading = false,
    onConfirm,
    onCancel,
    children,
  }: Props = $props();

  async function handleConfirm() {
    await onConfirm();
    open = false;
  }

  function handleCancel() {
    onCancel?.();
    open = false;
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>{title}</Dialog.Title>
      {#if description}
        <Dialog.Description>{description}</Dialog.Description>
      {/if}
    </Dialog.Header>

    {#if children}
      <div class="py-4">
        {@render children()}
      </div>
    {/if}

    <Dialog.Footer class="gap-2 sm:gap-0">
      <Button variant="outline" onclick={handleCancel} disabled={loading}>
        {cancelLabel}
      </Button>
      <Button
        variant={variant === "destructive" ? "destructive" : "default"}
        onclick={handleConfirm}
        disabled={loading}
      >
        {#if loading}
          Processing...
        {:else}
          {confirmLabel}
        {/if}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
```

#### Card Component

```svelte
<!-- src/lib/components/{domain}/{name}-card.svelte -->
<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import type { Snippet } from "svelte";

  interface Props {
    title: string;
    description?: string;
    data: {
      // Define your data structure
      id: number;
      value: number;
      status: string;
    };
    actions?: Snippet;
    onclick?: () => void;
  }

  let { title, description, data, actions, onclick }: Props = $props();

  const formattedValue = $derived(
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(data.value)
  );
</script>

<Card.Root class="cursor-pointer hover:bg-muted/50 transition-colors" {onclick}>
  <Card.Header class="pb-2">
    <div class="flex items-center justify-between">
      <Card.Title class="text-base">{title}</Card.Title>
      <Badge variant={data.status === "active" ? "default" : "secondary"}>
        {data.status}
      </Badge>
    </div>
    {#if description}
      <Card.Description>{description}</Card.Description>
    {/if}
  </Card.Header>
  <Card.Content>
    <div class="text-2xl font-bold">{formattedValue}</div>
  </Card.Content>
  {#if actions}
    <Card.Footer class="pt-0">
      {@render actions()}
    </Card.Footer>
  {/if}
</Card.Root>
```

#### Responsive Sheet Component

```svelte
<!-- src/lib/components/{domain}/{name}-sheet.svelte -->
<script lang="ts">
  import { ResponsiveSheet } from "$lib/components/ui/responsive-sheet";
  import { Button } from "$lib/components/ui/button";
  import type { Snippet } from "svelte";

  interface Props {
    open?: boolean;
    title?: string;
    description?: string;
    trigger?: Snippet;
    header?: Snippet;
    footer?: Snippet;
    children?: Snippet;
    onClose?: () => void;
  }

  let {
    open = $bindable(false),
    title = "Details",
    description,
    trigger,
    header,
    footer,
    children,
    onClose,
  }: Props = $props();

  function handleClose() {
    open = false;
    onClose?.();
  }
</script>

<ResponsiveSheet bind:open>
  {#snippet trigger()}
    {#if trigger}
      {@render trigger()}
    {:else}
      <Button variant="outline">Open</Button>
    {/if}
  {/snippet}

  {#snippet header()}
    {#if header}
      {@render header()}
    {:else}
      <div>
        <h2 class="text-lg font-semibold">{title}</h2>
        {#if description}
          <p class="text-sm text-muted-foreground">{description}</p>
        {/if}
      </div>
    {/if}
  {/snippet}

  {#snippet content()}
    <div class="p-4">
      {#if children}
        {@render children()}
      {:else}
        <p class="text-muted-foreground">No content provided.</p>
      {/if}
    </div>
  {/snippet}

  {#snippet footer()}
    {#if footer}
      {@render footer()}
    {:else}
      <div class="flex justify-end gap-2 p-4 border-t">
        <Button variant="outline" onclick={handleClose}>Close</Button>
      </div>
    {/if}
  {/snippet}
</ResponsiveSheet>
```

#### Custom Input Component

```svelte
<!-- src/lib/components/input/{name}-input.svelte -->
<script lang="ts">
  import { Input } from "$lib/components/ui/input";
  import { cn } from "$lib/utils";

  interface Props {
    value?: number;
    placeholder?: string;
    disabled?: boolean;
    class?: string;
    onchange?: (value: number) => void;
  }

  let {
    value = $bindable(0),
    placeholder = "0.00",
    disabled = false,
    class: className,
    onchange,
  }: Props = $props();

  // For currency input example
  let displayValue = $state(formatValue(value));

  function formatValue(num: number): string {
    return num.toFixed(2);
  }

  function parseValue(str: string): number {
    const parsed = parseFloat(str.replace(/[^0-9.-]/g, ""));
    return isNaN(parsed) ? 0 : parsed;
  }

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const newValue = parseValue(target.value);
    value = newValue;
    onchange?.(newValue);
  }

  function handleBlur() {
    displayValue = formatValue(value);
  }

  function handleFocus(event: Event) {
    const target = event.target as HTMLInputElement;
    target.select();
  }
</script>

<div class={cn("relative", className)}>
  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
    $
  </span>
  <Input
    type="text"
    inputmode="decimal"
    value={displayValue}
    {placeholder}
    {disabled}
    class="pl-7 text-right"
    oninput={handleInput}
    onblur={handleBlur}
    onfocus={handleFocus}
  />
</div>
```

#### Data Table Component

```svelte
<!-- src/lib/components/{domain}/{name}-table.svelte -->
<script lang="ts">
  import { DataTable } from "$lib/components/data-table";
  import type { ColumnDef } from "@tanstack/table-core";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import { createRender } from "svelte-headless-table";

  interface {PascalCaseName}Row {
    id: number;
    name: string;
    status: "active" | "inactive";
    amount: number;
    createdAt: string;
  }

  interface Props {
    data: {PascalCaseName}Row[];
    loading?: boolean;
    onRowClick?: (row: {PascalCaseName}Row) => void;
    onEdit?: (row: {PascalCaseName}Row) => void;
    onDelete?: (row: {PascalCaseName}Row) => void;
  }

  let { data, loading = false, onRowClick, onEdit, onDelete }: Props = $props();

  const columns: ColumnDef<{PascalCaseName}Row>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => row.original.name,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        return createRender(Badge, {
          variant: status === "active" ? "default" : "secondary",
          children: status,
        });
      },
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) =>
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(row.original.amount),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) =>
        new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        return createRender(TableActions, {
          onEdit: () => onEdit?.(row.original),
          onDelete: () => onDelete?.(row.original),
        });
      },
    },
  ];
</script>

{#snippet TableActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void })}
  <div class="flex justify-end gap-1">
    <Button variant="ghost" size="sm" onclick={onEdit}>Edit</Button>
    <Button variant="ghost" size="sm" class="text-destructive" onclick={onDelete}>
      Delete
    </Button>
  </div>
{/snippet}

<DataTable
  {columns}
  {data}
  {loading}
  onRowClick={(row) => onRowClick?.(row)}
/>
```

### 4. Update Exports

Add the component to the appropriate index file:

```typescript
// src/lib/components/{folder}/index.ts
export { default as {PascalCaseName} } from "./{name}.svelte";
```

## Example Outputs

### Form Component

```
## Generated Component: manage-budget-form

Created `src/lib/components/forms/manage-budget-form.svelte`:

A form component for creating/editing budgets with:
- Name field (required)
- Amount field (currency input)
- Period selector (monthly/yearly)
- Category multi-select

### Usage

\`\`\`svelte
<script lang="ts">
  import { ManageBudgetForm } from "$lib/components/forms";
  import type { SuperValidated } from "sveltekit-superforms";
  import { budgetSchema } from "$lib/schema/superforms";

  let { data }: { data: { form: SuperValidated<typeof budgetSchema> } } = $props();

  function handleSuccess() {
    // Navigate or show toast
  }
</script>

<ManageBudgetForm
  formData={data.form}
  mode="create"
  onSuccess={handleSuccess}
/>
\`\`\`
```

### Dialog Component

```
## Generated Component: confirm-delete-dialog

Created `src/lib/components/dialogs/confirm-delete-dialog.svelte`:

A confirmation dialog for delete operations with:
- Destructive variant styling
- Loading state support
- Customizable content

### Usage

\`\`\`svelte
<script lang="ts">
  import { ConfirmDeleteDialog } from "$lib/components/dialogs";

  let showDialog = $state(false);
  let deleting = $state(false);

  async function handleDelete() {
    deleting = true;
    await deleteItem.execute({ id: itemId });
    deleting = false;
  }
</script>

<Button variant="destructive" onclick={() => showDialog = true}>
  Delete
</Button>

<ConfirmDeleteDialog
  bind:open={showDialog}
  title="Delete Item"
  description="This action cannot be undone."
  loading={deleting}
  variant="destructive"
  confirmLabel="Delete"
  onConfirm={handleDelete}
/>
\`\`\`
```

## Reference Files

| Pattern | Reference |
|---------|-----------|
| Form with Superforms | `src/lib/components/forms/manage-transaction-form.svelte` |
| Dialog | `src/lib/components/dialogs/` |
| Responsive Sheet | `src/lib/components/ui/responsive-sheet/` |
| Card | `src/lib/components/ui/card/` |
| Custom Input | `src/lib/components/input/` |
| Data Table | `src/lib/components/data-table/` |

## Component Patterns

### Props with $bindable

Use `$bindable()` for two-way binding on `open` state:

```svelte
let { open = $bindable(false) }: Props = $props();
```

### Snippets for Composition

Use Svelte 5 snippets for flexible content slots:

```svelte
interface Props {
  header?: Snippet;
  footer?: Snippet;
  children?: Snippet;
}

{#if header}
  {@render header()}
{/if}
```

### Event Handlers

Use function props for callbacks:

```svelte
interface Props {
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}
```

### Derived State

Use `$derived` for computed values:

```svelte
const isValid = $derived(data.name.length > 0 && data.amount > 0);
const formattedAmount = $derived(formatCurrency(data.amount));
```

$ARGUMENTS
