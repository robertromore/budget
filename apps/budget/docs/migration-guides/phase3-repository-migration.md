# Phase 3: Repository Migration Guide

## Overview

This guide provides step-by-step instructions for completing Phase 3 of the code reuse refactoring: converting child repositories to extend `BaseRepository` and removing duplicate methods.

## Status

- ✅ **Complete:** BaseRepository enhanced with 4 new shared methods
- ⏸️ **Pending:** Convert 3 child repositories (Payees, Categories, Accounts)
- **Estimated Savings:** ~200-260 lines of code

---

## BaseRepository New Methods

The BaseRepository now provides these shared methods that all child repositories can use:

### 1. `findBySlug(slug: string): Promise<TEntity | null>`
Finds an entity by its slug, automatically excluding soft-deleted records if the table has a `deletedAt` column.

**Replaces:**
- `PayeeRepository.findBySlug()` (8 lines)
- `CategoryRepository.findBySlug()` (8 lines)
- `AccountRepository.findBySlug()` (10 lines)

### 2. `isSlugUnique(slug: string, excludeId?: number): Promise<boolean>`
Checks if a slug is unique, optionally excluding a specific entity ID (useful for updates).

**Replaces:**
- `PayeeRepository.slugExists()` (8 lines) - **Note:** Inverted logic!
- `CategoryRepository.isSlugUnique()` (10 lines)
- `AccountRepository.slugExists()` (8 lines)

### 3. `softDeleteWithSlugArchive(id: number): Promise<TEntity>`
Soft deletes an entity by appending `-deleted-{timestamp}` to the slug to prevent future conflicts.

**Replaces:**
- `PayeeRepository.softDelete()` (30 lines)
- `CategoryRepository.softDelete()` (31 lines)
- No equivalent in AccountRepository (can add if needed)

### 4. `searchByName(query: string, options?): Promise<TEntity[]>`
Searches entities by name with configurable options (limit, excludeDeleted).

**Replaces:**
- `PayeeRepository.searchByName()` (15 lines) - if exists
- `CategoryRepository.searchByName()` (18 lines)
- `AccountRepository.searchByName()` (12 lines)

---

## Migration Steps

### Step 1: Convert Repository to Extend BaseRepository

#### Before:
```typescript
export class PayeeRepository {
  async create(data: NewPayee): Promise<Payee> {
    const [payee] = await db
      .insert(payees)
      .values(data)
      .returning();

    if (!payee) {
      throw new Error("Failed to create payee");
    }

    return payee;
  }

  async findById(id: number): Promise<Payee | null> {
    const [payee] = await db
      .select()
      .from(payees)
      .where(and(eq(payees.id, id), isNull(payees.deletedAt)))
      .limit(1);

    return payee || null;
  }

  async findBySlug(slug: string): Promise<Payee | null> {
    const [payee] = await db
      .select()
      .from(payees)
      .where(and(eq(payees.slug, slug), isNull(payees.deletedAt)))
      .limit(1);

    return payee || null;
  }

  // ... more methods
}
```

#### After:
```typescript
import {BaseRepository} from '$lib/server/shared/database/base-repository';
import {db} from '$lib/server/db';
import {payees} from '$lib/schema';
import type {Payee, NewPayee} from '$lib/schema';

export class PayeeRepository extends BaseRepository<
  typeof payees,
  Payee,
  NewPayee,
  UpdatePayeeData
> {
  constructor() {
    super(db, payees, 'Payee');
  }

  // findBySlug() is inherited from BaseRepository
  // isSlugUnique() is inherited from BaseRepository
  // softDeleteWithSlugArchive() is inherited from BaseRepository
  // searchByName() is inherited from BaseRepository

  // Keep only entity-specific methods here
  async findWithStats(id: number): Promise<PayeeWithStats | null> {
    // Entity-specific logic
  }
}
```

### Step 2: Remove Duplicate Methods

Delete these methods from child repositories as they're now inherited:

**PayeeRepository:**
- ❌ `findBySlug()` - use inherited
- ❌ `slugExists()` - use `isSlugUnique()` instead (inverted logic!)
- ❌ `softDelete()` - use `softDeleteWithSlugArchive()` instead

**CategoryRepository:**
- ❌ `findBySlug()` - use inherited
- ❌ `isSlugUnique()` - use inherited (same name!)
- ❌ `softDelete()` - use `softDeleteWithSlugArchive()` instead

**AccountRepository:**
- ❌ `findBySlug()` - use inherited
- ❌ `slugExists()` - use `isSlugUnique()` instead
- ❌ `searchByName()` - use inherited (if applicable)

### Step 3: Update Service Layer Calls

Some service methods may need updates due to method name changes:

#### Example 1: slugExists → isSlugUnique (inverted logic)

**Before:**
```typescript
// In PayeeService
const exists = await this.repository.slugExists(slug);
if (exists) {
  throw new ConflictError("Slug already exists");
}
```

**After:**
```typescript
// In PayeeService
const isUnique = await this.repository.isSlugUnique(slug);
if (!isUnique) {
  throw new ConflictError("Slug already exists");
}
```

#### Example 2: softDelete → softDeleteWithSlugArchive

**Before:**
```typescript
// In PayeeService
const deleted = await this.repository.softDelete(id);
```

**After:**
```typescript
// In PayeeService
const deleted = await this.repository.softDeleteWithSlugArchive(id);
```

### Step 4: Update Method Overrides

If you need to override a BaseRepository method for entity-specific logic, you can:

```typescript
export class PayeeRepository extends BaseRepository<...> {
  constructor() {
    super(db, payees, 'Payee');
  }

  // Override base method with entity-specific logic
  async findBySlug(slug: string): Promise<Payee | null> {
    // Call base implementation
    const payee = await super.findBySlug(slug);

    // Add entity-specific logic
    if (payee) {
      // e.g., load related data
      return await this.enrichPayeeData(payee);
    }

    return payee;
  }
}
```

---

## Testing Checklist

After converting each repository, verify:

- [ ] **TypeScript Compilation:** No type errors
- [ ] **Unit Tests:** All existing tests pass
- [ ] **Integration Tests:** CRUD operations work
- [ ] **Service Layer:** No broken method calls
- [ ] **API Endpoints:** tRPC routes function correctly
- [ ] **UI Pages:** Entity pages load and work

### Test Commands:
```bash
# TypeScript check
bunx tsc --noEmit

# Run tests (if available)
bun test

# Start dev server and test manually
bun run dev
```

### Pages to Test:

**Payees:**
- GET /payees - List all payees
- GET /payees/new - Create payee form
- GET /payees/[slug] - View payee details
- POST /payees - Create payee
- PATCH /payees/[id] - Update payee
- DELETE /payees/[id] - Delete payee

**Categories:**
- GET /categories - List all categories
- GET /categories/new - Create category form
- GET /categories/[slug] - View category details
- Similar CRUD operations

**Accounts:**
- GET /accounts - List all accounts
- Similar patterns

---

## Common Issues & Solutions

### Issue 1: Generic Type Errors

**Error:**
```
Type 'typeof payees' does not satisfy the constraint 'TTable'
```

**Solution:**
Ensure the generic parameters match the BaseRepository signature:
```typescript
BaseRepository<
  typeof payees,    // TTable - the Drizzle table schema
  Payee,            // TEntity - the entity type
  NewPayee,         // TCreateInput - create data type
  UpdatePayeeData   // TUpdateInput - update data type (optional)
>
```

### Issue 2: Method Signature Mismatch

**Error:**
```
Property 'slugExists' does not exist on type 'PayeeRepository'
```

**Solution:**
Update service layer to use `isSlugUnique()` with inverted logic:
```typescript
// Before
if (await this.repository.slugExists(slug)) { ... }

// After
if (!await this.repository.isSlugUnique(slug)) { ... }
```

### Issue 3: Custom Query Logic Lost

**Problem:**
Entity-specific query logic was in the duplicate method.

**Solution:**
Override the base method and add custom logic:
```typescript
async findBySlug(slug: string): Promise<Payee | null> {
  const payee = await super.findBySlug(slug);
  if (payee) {
    // Add joins, aggregations, etc.
    return await this.enrichPayeeData(payee);
  }
  return payee;
}
```

---

## Rollback Plan

If issues arise during migration:

1. **Keep Original Methods:** Comment out instead of deleting initially
2. **Gradual Migration:** Convert one repository at a time
3. **Feature Flags:** Use environment variables to toggle between old/new implementations
4. **Git Branches:** Create separate branch per repository conversion

---

## Expected Savings Per Repository

| Repository | Lines Saved | Methods Removed |
|-----------|-------------|-----------------|
| PayeeRepository | ~60-80 | 4 methods |
| CategoryRepository | ~80-100 | 4-5 methods |
| AccountRepository | ~60-80 | 3-4 methods |
| **Total** | **~200-260** | **11-13 methods** |

---

## Additional Benefits

Beyond line count savings:

1. **Consistency:** All repositories use the same slug/soft-delete patterns
2. **Maintainability:** Bug fixes in BaseRepository benefit all children
3. **Type Safety:** Centralized type definitions prevent inconsistencies
4. **Testability:** Test BaseRepository once, children inherit correctness
5. **Documentation:** Single source of truth for common patterns

---

## Next Steps

1. **Start with PayeeRepository** (most straightforward)
2. **Then CategoryRepository** (similar patterns)
3. **Finally AccountRepository** (may have differences)
4. **Document any issues** encountered for future migrations
5. **Update this guide** with learnings

---

## Questions?

If you encounter issues not covered in this guide:
1. Check existing BaseRepository implementations
2. Review TypeScript type definitions
3. Test in isolation with unit tests
4. Document new patterns discovered

---

**Last Updated:** 2025-10-11
**Phase:** 3 - Repository Consolidation
**Status:** Ready for Implementation
