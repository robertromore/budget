# Fix Issues

Automatically fix type errors, lint issues, and formatting problems across the codebase.

## Usage

```
/fix                 # Fix all issues (type check + lint + format)
/fix types           # Fix only type errors
/fix lint            # Fix only lint issues
/fix format          # Fix only formatting
/fix [file/pattern]  # Fix issues in specific files
```

## Process

### 1. Parse Arguments

Determine scope from `$ARGUMENTS`:
- No args: Run all fixes
- `types`: Only type checking
- `lint`: Only ESLint
- `format`: Only Prettier
- File path/glob: Target specific files

### 2. Run Checks and Fixes

Execute in this order (dependencies flow down):

#### Step 1: Type Checking
```bash
cd apps/budget && bunx svelte-check --threshold error 2>&1
```

Capture output and identify:
- Type errors with file:line references
- Missing imports
- Incorrect type usage

**Common fixes:**
- Add missing type annotations
- Fix incorrect prop types
- Update imports for renamed exports
- Add null checks for optional values

#### Step 2: Lint Fixes
```bash
cd apps/budget && bunx eslint --fix "src/**/*.{ts,svelte}" 2>&1
```

ESLint auto-fixes:
- Unused imports removal
- Import ordering
- Consistent spacing
- Quote style
- Trailing commas

**Manual fixes needed for:**
- Unused variables (rename to `_prefix` or remove)
- Complexity warnings (refactor)
- Accessibility issues

#### Step 3: Format
```bash
cd apps/budget && bunx prettier --write "src/**/*.{ts,svelte,json,md}" 2>&1
```

Prettier handles:
- Indentation
- Line length
- Quote consistency
- Trailing commas
- Bracket spacing

### 3. Report Results

Present a summary:

```
## Fix Summary

### Type Errors
- Fixed: 3
- Remaining: 1 (requires manual fix)
  - `src/lib/query/accounts.ts:42` - Cannot find name 'AccountType'

### Lint Issues
- Auto-fixed: 12
- Remaining: 2
  - `src/routes/+page.svelte:15` - 'data' is defined but never used
  - `src/lib/utils.ts:89` - Unexpected any. Specify a different type

### Formatting
- Reformatted: 8 files

### Next Steps
1. Review the remaining type error - import may need updating
2. Prefix unused variable with underscore or remove
3. Replace 'any' with specific type
```

## Common Patterns

### Type Error Fixes

**Missing import:**
```typescript
// Before: Cannot find name 'Account'
// Fix: Add import
import type { Account } from "$lib/schema/accounts";
```

**Nullable value:**
```typescript
// Before: Object is possibly 'undefined'
const name = account?.name ?? "Unknown";
// Or with type guard
if (account) {
  console.log(account.name);
}
```

**Incorrect prop type:**
```svelte
<script lang="ts">
  // Before: Type 'string' is not assignable to 'number'
  let { count = 0 }: { count: number } = $props();
</script>
```

### Lint Fixes

**Unused import:**
```typescript
// ESLint auto-removes unused imports
// But for unused variables in destructuring:
const { used, _unused } = data; // Prefix with underscore
```

**Console statements:**
```typescript
// Remove or convert to proper logging
console.log("debug"); // Remove
logger.debug("info"); // Or use logger
```

### Svelte 5 Specific

**Runes syntax:**
```svelte
<script lang="ts">
  // Correct Svelte 5 patterns
  let count = $state(0);
  let doubled = $derived(count * 2);

  $effect(() => {
    console.log(count);
    return () => cleanup(); // Cleanup function
  });
</script>
```

## Interactive Mode

If issues require decisions, ask:

```
Found 3 unused variables. How should I handle them?

1. Remove the variables entirely
2. Prefix with underscore (_var)
3. Skip - I'll handle manually

[Select option]
```

## File-Specific Fixes

When a file path is provided:
```bash
# Type check specific file
bunx svelte-check --threshold error src/lib/query/accounts.ts

# Lint specific file
bunx eslint --fix src/lib/query/accounts.ts

# Format specific file
bunx prettier --write src/lib/query/accounts.ts
```

## Batch Operations

For large-scale fixes, process in batches to avoid timeout:

1. Start with schema files (`src/lib/schema/`)
2. Then server code (`src/lib/server/`)
3. Then query layer (`src/lib/query/`)
4. Then routes (`src/routes/`)
5. Finally components (`src/lib/components/`)

Report progress between batches.

$ARGUMENTS
