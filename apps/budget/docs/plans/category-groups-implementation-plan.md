# Category Groups Implementation Plan

## Overview

Implement category groups feature (Option A) with intelligent recommendations (hybrid Option D):
- Users can organize categories into logical groups
- Rule-based system provides intelligent grouping recommendations
- Users can enable/disable recommendations via settings
- Users manually approve, dismiss, or reject each recommendation
- Full user control over the recommendation system

**Note:** Recommendations use rule-based pattern matching (not AI/LLM) for reliability and speed.

## 🚨 STOP - CRITICAL DECISION REQUIRED BEFORE IMPLEMENTATION 🚨

### ⚠️ MULTI-TENANCY WARNING ⚠️

**YOU MUST DECIDE NOW**: Is this app single-tenant or multi-tenant?

This plan assumes **SINGLE-TENANT** (one user/household). If multiple independent users will use this app, **STOP and modify the schema NOW** before creating migrations.

### Current App Architecture Analysis

**Schema inspection shows:**

- ❌ **NO auth system**: No users table, no Better Auth integration found
- ❌ **NO tenant columns**: categories, accounts, payees have NO user_id/tenant_id
- ❌ **NO data isolation**: All data is globally shared
- ✅ **Budget-scoped entities**: budgets, transactions, schedules have budget_id

**This appears to be a SINGLE-TENANT application** (personal finance app for one user/household).

### Scoping Options for Category Groups

#### Option 1: Global Scope (Matches Categories) - **SINGLE-TENANT ASSUMPTION**

- Category groups are global, just like categories
- **⚠️ DATA SHARING**: All users see the same category groups
- **⚠️ SETTINGS**: Single global settings row shared by all users
- Simpler implementation, matches existing category pattern
- **Use case**: Single-user app or family budgeting with shared categories

#### Option 2: Per-User/Tenant Scope - **MULTI-TENANT SAFE**

- Add `user_id` (or `tenant_id`) to all four tables
- Each user/tenant has isolated category groups
- Settings are per-user/tenant
- Prevents data leakage between users
- **Use case**: SaaS app with multiple independent users

---

### ⚠️ DECISION FOR THIS PLAN: Global Scope (Option 1) - SINGLE-TENANT

**This plan assumes the app is single-tenant or the current architecture already handles multi-tenancy at a higher level.**

#### Rationale

1. **Categories are already global** in this codebase - no `user_id` column exists
2. **Accounts, payees are global** - this appears to be a single-tenant or shared-household app
3. Category groups are organizational tools for categories, so they follow the same scope
4. Simpler first implementation that matches existing patterns
5. Can add tenant scoping later if needed (requires migration)

#### ⚠️ WARNING: Data Leakage Risk

**If this app will have multiple independent users/tenants:**

This global schema will cause:

- User A can see User B's category groups
- Recommendations from User A appear for User B
- Settings changes by User A affect User B
- No data isolation between users

**Required changes for multi-tenant:**

1. Add tenant column to all 4 tables
2. Add composite indexes on `(tenant_id, ...)`
3. Update all queries to filter by `tenant_id`
4. Change settings from singleton to per-tenant rows

---

### Migration Path to Multi-Tenant (If Needed Later)

```sql
-- Add tenant columns (example using user_id):
ALTER TABLE category_groups ADD COLUMN user_id INTEGER NOT NULL REFERENCES users(id);
ALTER TABLE category_group_memberships ADD COLUMN user_id INTEGER NOT NULL REFERENCES users(id);
ALTER TABLE category_group_recommendations ADD COLUMN user_id INTEGER NOT NULL REFERENCES users(id);

-- Change settings from singleton to per-user:
ALTER TABLE category_group_settings ADD COLUMN user_id INTEGER NOT NULL REFERENCES users(id);
DROP INDEX IF EXISTS category_group_settings_singleton; -- Remove singleton pattern
CREATE UNIQUE INDEX idx_cgs_user ON category_group_settings(user_id);

-- Add composite indexes:
CREATE INDEX idx_cg_user_slug ON category_groups(user_id, slug);
CREATE INDEX idx_cgm_user_group ON category_group_memberships(user_id, category_group_id);
CREATE INDEX idx_cgr_user_status ON category_group_recommendations(user_id, status);

-- Update all queries to include: WHERE user_id = ?
```

**Note:** If implementing multi-tenant from the start, apply these changes before Day 1 migration.

## Implementation Phases

### Phase 1: Database Schema & Core Models

#### 1.1 Database Tables

**Table: `category_groups`**
```sql
CREATE TABLE category_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  group_icon TEXT,
  group_color TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_category_groups_slug ON category_groups(slug);
CREATE INDEX idx_category_groups_sort_order ON category_groups(sort_order);
```

**Table: `category_group_memberships`**
```sql
CREATE TABLE category_group_memberships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_group_id INTEGER NOT NULL REFERENCES category_groups(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(category_group_id, category_id),
  -- ⚠️ CRITICAL CONSTRAINT: Each category can belong to ONLY ONE group
  CONSTRAINT unique_category_single_group UNIQUE(category_id)
);

CREATE INDEX idx_cgm_group_id ON category_group_memberships(category_group_id);
```

### ⚠️ CRITICAL DESIGN DECISION: Single-Group Membership

The `UNIQUE(category_id)` constraint enforces that **each category can belong to at most ONE group**.

**Why this constraint exists:**

1. **UI Assumption**: Category cards appear in exactly one group (or ungrouped)
2. **Service Logic**: `generateRecommendations()` filters "categories without groups" (assumes 0 or 1)
3. **Simplicity**: Avoids complex many-to-many relationship management
4. **Clear ownership**: Each category has a single "home" group

**If multi-group support is needed:**

This is a fundamental design change requiring:

1. Remove `CONSTRAINT unique_category_single_group UNIQUE(category_id)`
2. Keep only `UNIQUE(category_group_id, category_id)` to prevent duplicates within same group
3. Update `generateRecommendations()` logic to handle categories in multiple groups
4. Update UI to show categories in multiple group cards (or use tags/badges)
5. Update all queries that assume "ungrouped = no memberships"

**Current behavior with this constraint:**

- ✅ Category can be ungrouped (0 memberships)
- ✅ Category can be in one group (1 membership)
- ❌ Category CANNOT be in multiple groups (database error on insert)

**Table: `category_group_recommendations`**
```sql
CREATE TABLE category_group_recommendations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  suggested_group_id INTEGER REFERENCES category_groups(id) ON DELETE SET NULL,
  suggested_group_name TEXT,
  confidence_score REAL NOT NULL,
  reasoning TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  CONSTRAINT chk_status CHECK (status IN ('pending', 'approved', 'dismissed', 'rejected'))
);

CREATE INDEX idx_cgr_category_id ON category_group_recommendations(category_id);
CREATE INDEX idx_cgr_status ON category_group_recommendations(status);
CREATE INDEX idx_cgr_confidence ON category_group_recommendations(confidence_score);
```

**Table: `category_group_settings`**
```sql
CREATE TABLE category_group_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recommendations_enabled INTEGER NOT NULL DEFAULT 1,
  min_confidence_score REAL DEFAULT 0.7,
  updated_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO category_group_settings (id, recommendations_enabled, min_confidence_score) VALUES (1, 1, 0.7);
```

**NOTE**: Removed `auto_apply_threshold` field. This implementation follows hybrid Option D where users manually approve recommendations. No automatic application is performed, so the threshold field is unnecessary. If automatic application is added in the future, this field can be added back.

#### 1.2 Drizzle Schema File

**File: `src/lib/schema/category-groups.ts`**

Follow pattern from `src/lib/schema/categories.ts`:
- Use `sqliteTable` with proper columns
- Include `relations` for foreign keys
- Create Zod schemas using `createInsertSchema` and `createSelectSchema`
- Add custom validation using `.refine()` and `InputSanitizer`
- Export form schemas with proper transformations

Key validations:
- `name`: Required, trim whitespace, check for invalid characters using `validator.contains()`
- `slug`: Auto-generated, unique
- `groupIcon`: Optional, valid icon name
- `groupColor`: Optional, valid hex color
- `confidenceScore`: Between 0 and 1
- `status`: Enum validation

Export in `src/lib/schema/index.ts`:
```typescript
export * from "./category-groups";
```

### Phase 2: Backend Services

#### 2.1 Repository Layer

**File: `src/lib/server/domains/category-groups/repository.ts`**

```typescript
export class CategoryGroupRepository extends BaseRepository<
  typeof categoryGroups,
  CategoryGroup,
  NewCategoryGroup,
  UpdateCategoryGroupData
> {
  constructor() {
    super(db, categoryGroups, 'CategoryGroup');
  }

  // Methods following BaseRepository pattern:
  // - create()
  // - update()
  // - delete() / softDeleteWithSlugArchive()
  // - findById()
  // - findBySlug()
  // - findAll()

  // Custom methods:
  // - findWithCategories(groupId: number)
  // - findAllWithCounts()
  // - getMaxSortOrder()
}
```

**File: `src/lib/server/domains/category-groups/membership-repository.ts`**

```typescript
export class CategoryGroupMembershipRepository extends BaseRepository<...> {
  // Methods:
  // - addCategoryToGroup()
  // - removeCategoryFromGroup()
  // - getCategoriesForGroup()
  // - getGroupsForCategory()
  // - reorderCategories()
  // - bulkAddCategories()
}
```

**File: `src/lib/server/domains/category-groups/recommendation-repository.ts`**

```typescript
export class CategoryGroupRecommendationRepository extends BaseRepository<...> {
  // Methods:
  // - createRecommendation()
  // - getPendingRecommendations()
  // - updateRecommendationStatus()
  // - deleteOldRecommendations()
}
```

**File: `src/lib/server/domains/category-groups/settings-repository.ts`**

```typescript
export class CategoryGroupSettingsRepository extends BaseRepository<...> {
  // Methods:
  // - getSettings() - always returns row id=1
  // - updateSettings()

  async getSettings(): Promise<CategoryGroupSettings> {
    // SELECT * FROM category_group_settings WHERE id = 1
    // Should always exist due to initial INSERT
  }

  async updateSettings(data: UpdateCategoryGroupSettingsData): Promise<CategoryGroupSettings> {
    // UPDATE category_group_settings SET ... WHERE id = 1
    // Return updated settings
  }
}
```

#### 2.2 Service Layer

**File: `src/lib/server/domains/category-groups/services.ts`**

```typescript
// DTO Interfaces
export interface CategoryGroupWithCount extends CategoryGroup {
  categoryCount: number;
}

export interface CreateCategoryGroupData {
  name: string;
  description?: string | null;
  groupIcon?: string | null;
  groupColor?: string | null;
  sortOrder?: number;
}

export interface UpdateCategoryGroupData {
  id: number;
  name?: string;
  description?: string | null;
  groupIcon?: string | null;
  groupColor?: string | null;
  sortOrder?: number;
}

export class CategoryGroupService {
  constructor(
    private groupRepository: CategoryGroupRepository,
    private membershipRepository: CategoryGroupMembershipRepository
  ) {}

  private generateSlug(name: string): string {
    // Follow pattern from CategoryService
    // Generate base slug, check uniqueness, add counter if needed
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  // READ OPERATIONS (required by tRPC routes)

  async listGroupsWithCounts(): Promise<CategoryGroupWithCount[]> {
    // Implementation:
    // 1. Call groupRepository.findAll() to get all groups
    // 2. For each group:
    //    a. Count memberships using membershipRepository or raw query:
    //       SELECT COUNT(*) FROM category_group_memberships WHERE category_group_id = ?
    // 3. Map to CategoryGroupWithCount[] adding categoryCount property
    // 4. Order by sort_order ASC
    // 5. Return array

    // Alternative efficient approach with single query:
    // SELECT
    //   cg.*,
    //   COUNT(cgm.id) as category_count
    // FROM category_groups cg
    // LEFT JOIN category_group_memberships cgm ON cg.id = cgm.category_group_id
    // GROUP BY cg.id
    // ORDER BY cg.sort_order ASC
  }

  async getGroupBySlug(slug: string): Promise<CategoryGroup> {
    // Implementation:
    // 1. Call groupRepository.findBySlug(slug)
    // 2. If not found, throw new NotFoundError(`Category group with slug '${slug}' not found`)
    // 3. Return the group

    // Returns: CategoryGroup object with all fields:
    // {
    //   id: number,
    //   name: string,
    //   slug: string,
    //   description: string | null,
    //   groupIcon: string | null,
    //   groupColor: string | null,
    //   sortOrder: number,
    //   createdAt: string,
    //   updatedAt: string
    // }
  }

  async getCategoriesForGroup(groupId: number): Promise<Category[]> {
    // Implementation:
    // 1. Validate group exists:
    //    const group = await groupRepository.findById(groupId);
    //    if (!group) throw new NotFoundError(`Category group ${groupId} not found`);
    // 2. Query memberships with joined categories:
    //    SELECT c.*, cgm.sort_order as membership_sort_order
    //    FROM category_group_memberships cgm
    //    INNER JOIN categories c ON cgm.category_id = c.id
    //    WHERE cgm.category_group_id = ?
    //    ORDER BY cgm.sort_order ASC, c.name ASC
    // 3. Return array of Category objects

    // Returns: Category[] - full category objects, not just IDs
    // Each Category includes all fields from categories table
  }

  // WRITE OPERATIONS

  async createGroup(data: CreateCategoryGroupData): Promise<CategoryGroup> {
    // Implementation:
    // 1. Validate and sanitize name:
    if (!data.name?.trim()) {
      throw new ValidationError("Category group name is required");
    }
    const sanitizedName = InputSanitizer.sanitizeName(data.name.trim());
    if (!sanitizedName) {
      throw new ValidationError("Invalid category group name");
    }

    // 2. Sanitize optional fields:
    const sanitizedDescription = data.description
      ? InputSanitizer.sanitizeDescription(data.description)
      : null;

    // 3. Generate unique slug:
    let baseSlug = this.generateSlug(sanitizedName);
    let slug = baseSlug;
    let counter = 1;
    while (await this.groupRepository.findBySlug(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // 4. Get max sort order if not provided:
    const sortOrder = data.sortOrder ?? (await this.groupRepository.getMaxSortOrder()) + 1;

    // 5. Create the group:
    const newGroup: NewCategoryGroup = {
      name: sanitizedName,
      slug,
      description: sanitizedDescription,
      groupIcon: data.groupIcon ?? null,
      groupColor: data.groupColor ?? null,
      sortOrder,
    };

    return await this.groupRepository.create(newGroup);
  }

  async updateGroup(id: number, data: UpdateCategoryGroupData): Promise<CategoryGroup> {
    // Implementation:
    // 1. Check group exists:
    const existing = await this.groupRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Category group ${id} not found`);
    }

    // 2. Build update object with sanitized values:
    const updates: Partial<CategoryGroup> = {};

    if (data.name !== undefined) {
      const sanitizedName = InputSanitizer.sanitizeName(data.name.trim());
      if (!sanitizedName) {
        throw new ValidationError("Invalid category group name");
      }
      updates.name = sanitizedName;

      // Regenerate slug if name changed:
      if (sanitizedName !== existing.name) {
        let baseSlug = this.generateSlug(sanitizedName);
        let slug = baseSlug;
        let counter = 1;
        while (await this.groupRepository.findBySlug(slug)) {
          slug = `${baseSlug}-${counter}`;
          counter++;
        }
        updates.slug = slug;
      }
    }

    if (data.description !== undefined) {
      updates.description = data.description
        ? InputSanitizer.sanitizeDescription(data.description)
        : null;
    }

    if (data.groupIcon !== undefined) updates.groupIcon = data.groupIcon;
    if (data.groupColor !== undefined) updates.groupColor = data.groupColor;
    if (data.sortOrder !== undefined) updates.sortOrder = data.sortOrder;

    // 3. Update and return:
    return await this.groupRepository.update(id, updates);
  }

  async deleteGroup(id: number): Promise<void> {
    // Implementation:
    // 1. Check group exists:
    const group = await this.groupRepository.findById(id);
    if (!group) {
      throw new NotFoundError(`Category group ${id} not found`);
    }

    // 2. Archive slug to prevent reuse:
    await this.groupRepository.softDeleteWithSlugArchive(id);

    // 3. Delete group (CASCADE will delete memberships automatically)
  }

  async addCategoriesToGroup(groupId: number, categoryIds: number[]): Promise<void> {
    // Implementation:
    // 1. Validate group exists:
    const group = await this.groupRepository.findById(groupId);
    if (!group) {
      throw new NotFoundError(`Category group ${groupId} not found`);
    }

    // 2. Validate all categories exist:
    // (Assuming categoryRepository is injected or accessible)
    // for (const categoryId of categoryIds) {
    //   const category = await categoryRepository.findById(categoryId);
    //   if (!category) {
    //     throw new NotFoundError(`Category ${categoryId} not found`);
    //   }
    // }

    // 3. Check categories aren't already in ANY group (due to unique constraint):
    // Query: SELECT category_id FROM category_group_memberships WHERE category_id IN (?)
    // If any found, throw ConflictError

    // 4. Bulk add memberships:
    await this.membershipRepository.bulkAddCategories(groupId, categoryIds);
  }

  async removeCategoryFromGroup(groupId: number, categoryId: number): Promise<void> {
    // Implementation:
    // 1. Remove membership:
    // DELETE FROM category_group_memberships
    // WHERE category_group_id = ? AND category_id = ?
    await this.membershipRepository.removeCategoryFromGroup(groupId, categoryId);
  }

  async reorderGroups(updates: Array<{id: number, sortOrder: number}>): Promise<void> {
    // Implementation:
    // Use transaction to update all sort orders atomically:
    // for (const {id, sortOrder} of updates) {
    //   await this.groupRepository.update(id, {sortOrder});
    // }
  }
}
```

**File: `src/lib/server/domains/category-groups/recommendation-service.ts`**

```typescript
export class CategoryGroupRecommendationService {
  constructor(
    private recommendationRepository: CategoryGroupRecommendationRepository,
    private groupRepository: CategoryGroupRepository,
    private categoryRepository: CategoryRepository,
    private settingsRepository: CategoryGroupSettingsRepository
  ) {}

  // READ OPERATIONS (required by tRPC routes)

  async getPendingRecommendations(): Promise<CategoryGroupRecommendation[]> {
    // Implementation:
    // 1. Query recommendations with status = 'pending':
    //    SELECT
    //      cgr.*,
    //      c.name as category_name,
    //      c.category_icon,
    //      c.category_color,
    //      cg.name as suggested_group_name_resolved
    //    FROM category_group_recommendations cgr
    //    INNER JOIN categories c ON cgr.category_id = c.id
    //    LEFT JOIN category_groups cg ON cgr.suggested_group_id = cg.id
    //    WHERE cgr.status = 'pending'
    //    ORDER BY cgr.confidence_score DESC, cgr.created_at DESC
    //
    // 2. Return array of CategoryGroupRecommendation with enriched data
    //
    // Returns: CategoryGroupRecommendation[] with fields:
    // {
    //   id: number,
    //   categoryId: number,
    //   suggestedGroupId: number | null,
    //   suggestedGroupName: string | null,
    //   confidenceScore: number,
    //   reasoning: string | null,
    //   status: 'pending' | 'approved' | 'dismissed' | 'rejected',
    //   createdAt: string,
    //   updatedAt: string,
    //   // Plus enriched data from joins:
    //   category?: Category,
    //   suggestedGroup?: CategoryGroup
    // }
  }

  // WRITE OPERATIONS

  async generateRecommendations(): Promise<CategoryGroupRecommendation[]> {
    // Rule-based recommendation system (fast, no external API calls)

    // Implementation:
    // 1. Check if recommendations are enabled:
    const settings = await this.settingsRepository.getSettings();
    if (!settings.recommendationsEnabled) {
      throw new ValidationError("Recommendations are disabled");
    }

    // 2. Clear old pending recommendations to avoid duplicates:
    //    DELETE FROM category_group_recommendations WHERE status = 'pending'

    // 3. Fetch all categories WITHOUT groups:
    //    SELECT c.* FROM categories c
    //    LEFT JOIN category_group_memberships cgm ON c.id = cgm.category_id
    //    WHERE cgm.id IS NULL AND c.is_active = 1
    const ungroupedCategories = await this.getUngroupedCategories();

    if (ungroupedCategories.length === 0) {
      return []; // No categories to process
    }

    // 4. Fetch all existing groups:
    const existingGroups = await this.groupRepository.findAll();

    // 5. Define rule-based grouping patterns:
    const groupingRules = [
      // Common expense categories
      { pattern: /\b(groceries?|food|meal|restaurant|dining|cafe|coffee)\b/i,
        groupName: "Food & Dining", confidence: 0.9 },
      { pattern: /\b(gas|fuel|car|auto|vehicle|parking|toll|uber|lyft|taxi)\b/i,
        groupName: "Transportation", confidence: 0.85 },
      { pattern: /\b(rent|mortgage|hoa|property|landlord)\b/i,
        groupName: "Housing", confidence: 0.95 },
      { pattern: /\b(electric|gas|water|sewer|trash|internet|cable|phone|mobile)\b/i,
        groupName: "Utilities", confidence: 0.9 },
      { pattern: /\b(entertainment|movie|concert|game|streaming|netflix|spotify)\b/i,
        groupName: "Entertainment", confidence: 0.85 },
      { pattern: /\b(clothing|clothes|apparel|shoes|fashion)\b/i,
        groupName: "Clothing", confidence: 0.85 },
      { pattern: /\b(health|medical|doctor|pharmacy|prescription|insurance|dental)\b/i,
        groupName: "Healthcare", confidence: 0.9 },
      { pattern: /\b(fitness|gym|yoga|sport|exercise)\b/i,
        groupName: "Fitness & Recreation", confidence: 0.85 },
      { pattern: /\b(education|tuition|school|books|course|class)\b/i,
        groupName: "Education", confidence: 0.9 },
      { pattern: /\b(travel|vacation|hotel|flight|airfare)\b/i,
        groupName: "Travel", confidence: 0.85 },
      { pattern: /\b(gift|donation|charity)\b/i,
        groupName: "Gifts & Donations", confidence: 0.85 },
      { pattern: /\b(home|house|furniture|appliance|repair|maintenance)\b/i,
        groupName: "Home & Garden", confidence: 0.8 },
      { pattern: /\b(pet|dog|cat|vet|veterinary)\b/i,
        groupName: "Pets", confidence: 0.9 },
      { pattern: /\b(tax|fee|fine|penalty)\b/i,
        groupName: "Fees & Taxes", confidence: 0.85 },

      // Income categories
      { pattern: /\b(salary|wage|paycheck|income|pay)\b/i,
        groupName: "Income", confidence: 0.95 },
      { pattern: /\b(bonus|commission|tip|tips)\b/i,
        groupName: "Additional Income", confidence: 0.85 },
      { pattern: /\b(interest|dividend|investment|return)\b/i,
        groupName: "Investment Income", confidence: 0.9 },

      // Savings categories
      { pattern: /\b(saving|savings|emergency|fund)\b/i,
        groupName: "Savings", confidence: 0.9 },
      { pattern: /\b(retirement|401k|ira|pension)\b/i,
        groupName: "Retirement", confidence: 0.95 },
    ];

    // 6. Apply rules to each ungrouped category:
    const recommendations: CategoryGroupRecommendation[] = [];

    for (const category of ungroupedCategories) {
      let bestMatch: { groupName: string; confidence: number; reasoning: string } | null = null;

      // Try to match against existing groups first (higher confidence)
      for (const group of existingGroups) {
        const nameMatch = category.name.toLowerCase().includes(group.name.toLowerCase()) ||
                         group.name.toLowerCase().includes(category.name.toLowerCase());
        if (nameMatch) {
          bestMatch = {
            groupName: group.name,
            confidence: 0.95,
            reasoning: `Category name closely matches existing group "${group.name}"`
          };
          break;
        }
      }

      // If no existing group match, try rule patterns
      if (!bestMatch) {
        for (const rule of groupingRules) {
          if (rule.pattern.test(category.name)) {
            // Check if suggested group already exists
            const existingGroup = existingGroups.find(
              g => g.name.toLowerCase() === rule.groupName.toLowerCase()
            );

            bestMatch = {
              groupName: rule.groupName,
              confidence: rule.confidence,
              reasoning: `Category name matches "${rule.groupName}" pattern`
            };
            break;
          }
        }
      }

      // Only create recommendation if we found a match above threshold
      if (bestMatch && bestMatch.confidence >= settings.minConfidenceScore) {
        // Find existing group ID if it exists
        const existingGroup = existingGroups.find(
          g => g.name.toLowerCase() === bestMatch.groupName.toLowerCase()
        );

        const recommendation = {
          categoryId: category.id,
          suggestedGroupId: existingGroup?.id ?? null,
          suggestedGroupName: existingGroup ? null : bestMatch.groupName,
          confidenceScore: bestMatch.confidence,
          reasoning: bestMatch.reasoning,
          status: 'pending' as const,
        };

        recommendations.push(recommendation);
      }
    }

    // 7. Create recommendation records in database:
    const createdRecommendations = await this.recommendationRepository.bulkCreate(
      recommendations
    );

    // 8. Return created recommendations
    return createdRecommendations;
  }

  async approveRecommendation(recommendationId: number): Promise<void> {
    // Implementation:
    // 1. Get recommendation:
    const recommendation = await this.recommendationRepository.findById(recommendationId);
    if (!recommendation) {
      throw new NotFoundError(`Recommendation ${recommendationId} not found`);
    }
    if (recommendation.status !== 'pending') {
      throw new ValidationError(`Recommendation ${recommendationId} is not pending`);
    }

    // 2. Apply the recommendation:
    if (recommendation.suggestedGroupId) {
      // Add category to existing group:
      const categoryGroupService = new CategoryGroupService(
        this.groupRepository,
        new CategoryGroupMembershipRepository()
      );
      await categoryGroupService.addCategoriesToGroup(
        recommendation.suggestedGroupId,
        [recommendation.categoryId]
      );
    } else if (recommendation.suggestedGroupName) {
      // Create new group and add category:
      const categoryGroupService = new CategoryGroupService(
        this.groupRepository,
        new CategoryGroupMembershipRepository()
      );
      const newGroup = await categoryGroupService.createGroup({
        name: recommendation.suggestedGroupName,
      });
      await categoryGroupService.addCategoriesToGroup(newGroup.id, [recommendation.categoryId]);
    } else {
      throw new ValidationError("Recommendation has no suggested group");
    }

    // 3. Update recommendation status to 'approved':
    await this.recommendationRepository.updateRecommendationStatus(
      recommendationId,
      'approved'
    );
  }

  async dismissRecommendation(recommendationId: number): Promise<void> {
    // Implementation:
    // 1. Validate recommendation exists and is pending:
    const recommendation = await this.recommendationRepository.findById(recommendationId);
    if (!recommendation) {
      throw new NotFoundError(`Recommendation ${recommendationId} not found`);
    }

    // 2. Update status to 'dismissed':
    await this.recommendationRepository.updateRecommendationStatus(
      recommendationId,
      'dismissed'
    );
  }

  async rejectRecommendation(recommendationId: number): Promise<void> {
    // Implementation:
    // 1. Validate recommendation exists:
    const recommendation = await this.recommendationRepository.findById(recommendationId);
    if (!recommendation) {
      throw new NotFoundError(`Recommendation ${recommendationId} not found`);
    }

    // 2. Update status to 'rejected':
    await this.recommendationRepository.updateRecommendationStatus(
      recommendationId,
      'rejected'
    );

    // 3. Future enhancement: Store rejection feedback for ML learning
  }

  async clearOldRecommendations(): Promise<void> {
    // Implementation:
    // Delete recommendations older than 30 days that are not 'pending':
    // DELETE FROM category_group_recommendations
    // WHERE status != 'pending'
    //   AND created_at < datetime('now', '-30 days')
    await this.recommendationRepository.deleteOldRecommendations(30);
  }
}
```

**File: `src/lib/server/domains/category-groups/settings-service.ts`**

```typescript
// DTO Interfaces
export interface UpdateCategoryGroupSettingsData {
  recommendationsEnabled?: boolean;
  minConfidenceScore?: number;
}

export class CategoryGroupSettingsService {
  constructor(
    private settingsRepository: CategoryGroupSettingsRepository
  ) {}

  async getSettings(): Promise<CategoryGroupSettings> {
    // Implementation:
    // 1. Get settings from repository (always row id=1):
    const settings = await this.settingsRepository.getSettings();

    // 2. Return settings object
    // Returns: CategoryGroupSettings with fields:
    // {
    //   id: number (always 1),
    //   recommendationsEnabled: boolean,
    //   minConfidenceScore: number (0.0 to 1.0),
    //   updatedAt: string
    // }
    return settings;
  }

  async updateSettings(data: UpdateCategoryGroupSettingsData): Promise<CategoryGroupSettings> {
    // Implementation:
    // 1. Validate minConfidenceScore if provided:
    if (data.minConfidenceScore !== undefined) {
      if (data.minConfidenceScore < 0 || data.minConfidenceScore > 1) {
        throw new ValidationError(
          "Confidence score must be between 0 and 1"
        );
      }
    }

    // 2. Validate recommendationsEnabled if provided:
    if (data.recommendationsEnabled !== undefined) {
      if (typeof data.recommendationsEnabled !== 'boolean') {
        throw new ValidationError(
          "Recommendations enabled must be a boolean"
        );
      }
    }

    // 3. Update settings (always row id=1):
    //    UPDATE category_group_settings
    //    SET recommendations_enabled = ?,
    //        min_confidence_score = ?,
    //        updated_at = CURRENT_TIMESTAMP
    //    WHERE id = 1
    const updatedSettings = await this.settingsRepository.updateSettings(data);

    // 4. Return updated settings
    return updatedSettings;
  }
}
```

#### 2.3 Service Factory Registration

**File: `src/lib/server/shared/container/service-factory.ts`**

Add lazy initialization for all new services following existing pattern:

```typescript
class ServiceFactory {
  // Add private instance variables
  private categoryGroupService?: CategoryGroupService;
  private categoryGroupRecommendationService?: CategoryGroupRecommendationService;
  private categoryGroupSettingsService?: CategoryGroupSettingsService;

  // Add getter methods with lazy initialization
  getCategoryGroupService(): CategoryGroupService {
    if (!this.categoryGroupService) {
      this.categoryGroupService = new CategoryGroupService(
        new CategoryGroupRepository(),
        new CategoryGroupMembershipRepository()
      );
    }
    return this.categoryGroupService;
  }

  getCategoryGroupRecommendationService(): CategoryGroupRecommendationService {
    if (!this.categoryGroupRecommendationService) {
      this.categoryGroupRecommendationService = new CategoryGroupRecommendationService(
        new CategoryGroupRecommendationRepository(),
        new CategoryGroupRepository(),
        this.getCategoryRepository(), // Reuse existing category repository
        new CategoryGroupSettingsRepository()
      );
    }
    return this.categoryGroupRecommendationService;
  }

  getCategoryGroupSettingsService(): CategoryGroupSettingsService {
    if (!this.categoryGroupSettingsService) {
      this.categoryGroupSettingsService = new CategoryGroupSettingsService(
        new CategoryGroupSettingsRepository()
      );
    }
    return this.categoryGroupSettingsService;
  }
}
```

### Phase 3: API Layer (tRPC)

**File: `src/lib/trpc/routes/category-groups.ts`**

**IMPORTANT**: Must use `t.router({})` wrapper and flat structure!

```typescript
import {z} from "zod";
import {publicProcedure, rateLimitedProcedure, t} from "$lib/trpc";
import {serviceFactory} from "$lib/server/shared/container/service-factory";
import {withErrorHandler, translateDomainError} from "$lib/trpc/shared/errors";
import {
  formInsertCategoryGroupSchema,
  formUpdateCategoryGroupSchema,
  formUpdateCategoryGroupSettingsSchema
} from "$lib/schema";

const categoryGroupService = serviceFactory.getCategoryGroupService();
const recommendationService = serviceFactory.getCategoryGroupRecommendationService();
const settingsService = serviceFactory.getCategoryGroupSettingsService();

export const categoryGroupsRoutes = t.router({
  // Query procedures:
  list: publicProcedure.query(withErrorHandler(async () => {
    return await categoryGroupService.listGroupsWithCounts();
  })),

  getBySlug: publicProcedure
    .input(z.object({slug: z.string()}))
    .query(withErrorHandler(async ({input}) => {
      return await categoryGroupService.getGroupBySlug(input.slug);
    })),

  getGroupCategories: publicProcedure
    .input(z.object({groupId: z.number()}))
    .query(withErrorHandler(async ({input}) => {
      return await categoryGroupService.getCategoriesForGroup(input.groupId);
    })),

  // Mutation procedures:
  create: rateLimitedProcedure
    .input(formInsertCategoryGroupSchema)
    .mutation(withErrorHandler(async ({input}) => {
      return await categoryGroupService.createGroup(input);
    })),

  update: rateLimitedProcedure
    .input(formUpdateCategoryGroupSchema)
    .mutation(withErrorHandler(async ({input}) => {
      const {id, ...updates} = input;
      return await categoryGroupService.updateGroup(id, updates);
    })),

  delete: rateLimitedProcedure
    .input(z.object({id: z.number()}))
    .mutation(withErrorHandler(async ({input}) => {
      await categoryGroupService.deleteGroup(input.id);
      return {success: true};
    })),

  addCategories: rateLimitedProcedure
    .input(z.object({
      groupId: z.number(),
      categoryIds: z.array(z.number())
    }))
    .mutation(withErrorHandler(async ({input}) => {
      await categoryGroupService.addCategoriesToGroup(input.groupId, input.categoryIds);
      return {success: true};
    })),

  removeCategory: rateLimitedProcedure
    .input(z.object({
      groupId: z.number(),
      categoryId: z.number()
    }))
    .mutation(withErrorHandler(async ({input}) => {
      await categoryGroupService.removeCategoryFromGroup(input.groupId, input.categoryId);
      return {success: true};
    })),

  // Recommendation endpoints (flat, not nested):
  recommendationsList: publicProcedure
    .query(withErrorHandler(async () => {
      return await recommendationService.getPendingRecommendations();
    })),

  recommendationsGenerate: rateLimitedProcedure
    .mutation(withErrorHandler(async () => {
      return await recommendationService.generateRecommendations();
    })),

  recommendationsApprove: rateLimitedProcedure
    .input(z.object({id: z.number()}))
    .mutation(withErrorHandler(async ({input}) => {
      await recommendationService.approveRecommendation(input.id);
      return {success: true};
    })),

  recommendationsDismiss: rateLimitedProcedure
    .input(z.object({id: z.number()}))
    .mutation(withErrorHandler(async ({input}) => {
      await recommendationService.dismissRecommendation(input.id);
      return {success: true};
    })),

  recommendationsReject: rateLimitedProcedure
    .input(z.object({id: z.number()}))
    .mutation(withErrorHandler(async ({input}) => {
      await recommendationService.rejectRecommendation(input.id);
      return {success: true};
    })),

  // Settings endpoints (flat, not nested):
  settingsGet: publicProcedure
    .query(withErrorHandler(async () => {
      return await settingsService.getSettings();
    })),

  settingsUpdate: rateLimitedProcedure
    .input(formUpdateCategoryGroupSettingsSchema)
    .mutation(withErrorHandler(async ({input}) => {
      return await settingsService.updateSettings(input);
    })),
});
```

Register in `src/lib/trpc/router.ts`:
```typescript
import {categoryGroupsRoutes} from "$lib/trpc/routes/category-groups";

export const router = t.router({
  accountRoutes,
  serverAccountsRoutes,
  categoriesRoutes,
  payeeRoutes,
  scheduleRoutes,
  transactionRoutes,
  viewsRoutes,
  budgetRoutes,
  patternRoutes,
  medicalExpensesRouter,
  categoryGroupsRoutes, // Add here - flat in router object
});
```

**NOTE**: Routes are NOT nested! They're added flat to the router object.

### Phase 4: Query Layer (TanStack Query)

**File: `src/lib/query/category-groups.ts`**

Follow exact pattern from `src/lib/query/categories.ts`:

```typescript
import {defineQuery, defineMutation, createQueryKeys} from "./_factory";
import {cachePatterns} from "./_client";
import {trpc} from "$lib/trpc/client";
import type {CategoryGroup, NewCategoryGroup} from "$lib/schema/category-groups";
import type {CategoryGroupRecommendation} from "$lib/schema/category-groups";
import type {CategoryGroupSettings} from "$lib/schema/category-groups";

// Create type-safe query keys
export const categoryGroupKeys = createQueryKeys("category-groups", {
  all: () => ["category-groups", "all"] as const,
  detail: (id: number) => ["category-groups", "detail", id] as const,
  slug: (slug: string) => ["category-groups", "slug", slug] as const,
  categories: (groupId: number) => ["category-groups", groupId, "categories"] as const,
  recommendations: () => ["category-groups", "recommendations"] as const,
  settings: () => ["category-groups", "settings"] as const,
});

// Queries - must be FUNCTIONS that return defineQuery()
export const listCategoryGroups = () =>
  defineQuery<CategoryGroup[]>({
    queryKey: categoryGroupKeys.all(),
    queryFn: () => trpc().categoryGroupsRoutes.list.query(),
  });

export const getCategoryGroupBySlug = (slug: string) =>
  defineQuery<CategoryGroup>({
    queryKey: categoryGroupKeys.slug(slug),
    queryFn: () => trpc().categoryGroupsRoutes.getBySlug.query({slug}),
  });

export const getGroupCategories = (groupId: number) =>
  defineQuery<Category[]>({
    queryKey: categoryGroupKeys.categories(groupId),
    queryFn: () => trpc().categoryGroupsRoutes.getGroupCategories.query({groupId}),
  });

export const listRecommendations = () =>
  defineQuery<CategoryGroupRecommendation[]>({
    queryKey: categoryGroupKeys.recommendations(),
    queryFn: () => trpc().categoryGroupsRoutes.recommendationsList.query(),
  });

export const getCategoryGroupSettings = () =>
  defineQuery<CategoryGroupSettings>({
    queryKey: categoryGroupKeys.settings(),
    queryFn: () => trpc().categoryGroupsRoutes.settingsGet.query(),
  });

// Mutations - include TypeScript generics, successMessage, errorMessage
export const createCategoryGroup = defineMutation<NewCategoryGroup, CategoryGroup>({
  mutationFn: (input) => trpc().categoryGroupsRoutes.create.mutate({...input}),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(categoryGroupKeys.all());
  },
  successMessage: "Category group created",
  errorMessage: "Failed to create category group",
});

export const updateCategoryGroup = defineMutation<
  {id: number} & Partial<NewCategoryGroup>,
  CategoryGroup
>({
  mutationFn: (input) => trpc().categoryGroupsRoutes.update.mutate(input),
  onSuccess: (_, variables) => {
    cachePatterns.invalidatePrefix(categoryGroupKeys.all());
    cachePatterns.invalidatePrefix(categoryGroupKeys.detail(variables.id));
  },
  successMessage: "Category group updated",
  errorMessage: "Failed to update category group",
});

export const deleteCategoryGroup = defineMutation<number, {success: boolean}>({
  mutationFn: (id) => trpc().categoryGroupsRoutes.delete.mutate({id}),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(categoryGroupKeys.all());
  },
  successMessage: "Category group deleted",
  errorMessage: "Failed to delete category group",
});

export const addCategoriesToGroup = defineMutation<
  {groupId: number; categoryIds: number[]},
  {success: boolean}
>({
  mutationFn: (input) => trpc().categoryGroupsRoutes.addCategories.mutate(input),
  onSuccess: (_, variables) => {
    cachePatterns.invalidatePrefix(categoryGroupKeys.categories(variables.groupId));
    cachePatterns.invalidatePrefix(["categories"]);
  },
  successMessage: "Categories added to group",
  errorMessage: "Failed to add categories",
});

export const removeCategoryFromGroup = defineMutation<
  {groupId: number; categoryId: number},
  {success: boolean}
>({
  mutationFn: (input) => trpc().categoryGroupsRoutes.removeCategory.mutate(input),
  onSuccess: (_, variables) => {
    cachePatterns.invalidatePrefix(categoryGroupKeys.categories(variables.groupId));
    cachePatterns.invalidatePrefix(["categories"]);
  },
  successMessage: "Category removed from group",
  errorMessage: "Failed to remove category",
});

export const generateRecommendations = defineMutation<void, CategoryGroupRecommendation[]>({
  mutationFn: () => trpc().categoryGroupsRoutes.recommendationsGenerate.mutate(),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(categoryGroupKeys.recommendations());
  },
  successMessage: "Recommendations generated",
  errorMessage: "Failed to generate recommendations",
});

export const approveRecommendation = defineMutation<number, {success: boolean}>({
  mutationFn: (id) => trpc().categoryGroupsRoutes.recommendationsApprove.mutate({id}),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(categoryGroupKeys.recommendations());
    cachePatterns.invalidatePrefix(categoryGroupKeys.all());
  },
  successMessage: "Recommendation approved",
  errorMessage: "Failed to approve recommendation",
});

export const dismissRecommendation = defineMutation<number, {success: boolean}>({
  mutationFn: (id) => trpc().categoryGroupsRoutes.recommendationsDismiss.mutate({id}),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(categoryGroupKeys.recommendations());
  },
  successMessage: "Recommendation dismissed",
  errorMessage: "Failed to dismiss recommendation",
});

export const rejectRecommendation = defineMutation<number, {success: boolean}>({
  mutationFn: (id) => trpc().categoryGroupsRoutes.recommendationsReject.mutate({id}),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(categoryGroupKeys.recommendations());
  },
  successMessage: "Recommendation rejected",
  errorMessage: "Failed to reject recommendation",
});

export const updateCategoryGroupSettings = defineMutation<
  Partial<CategoryGroupSettings>,
  CategoryGroupSettings
>({
  mutationFn: (input) => trpc().categoryGroupsRoutes.settingsUpdate.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(categoryGroupKeys.settings());
  },
  successMessage: "Settings updated",
  errorMessage: "Failed to update settings",
});
```

### Phase 5: UI Components

#### 5.1 Form Component

**File: `src/lib/components/forms/manage-category-group-form.svelte`**

Follow pattern from `src/lib/components/forms/manage-category-form.svelte`:
- Use `superForm` with `zod4Client` adapter
- Use existing `IconPicker` component for `groupIcon`
- Use existing `ColorPicker` component for `groupColor`
- Handle both create and update modes
- Emit `onSave` event with result
- Show validation errors inline

```svelte
<script lang="ts">
  import {superForm} from 'sveltekit-superforms';
  import {zod4Client} from 'sveltekit-superforms/adapters';
  import type {SuperValidated} from 'sveltekit-superforms';
  import {IconPicker} from '$lib/components/ui/icon-picker';
  import {ColorPicker} from '$lib/components/ui/color-picker';
  import * as Form from '$lib/components/ui/form';
  import {Input} from '$lib/components/ui/input';
  import {Textarea} from '$lib/components/ui/textarea';
  import {Button} from '$lib/components/ui/button';
  import type {CategoryGroup} from '$lib/schema/category-groups';
  import {superformInsertCategoryGroupSchema} from '$lib/schema/superforms';

  interface Props {
    defaults: SuperValidated<typeof superformInsertCategoryGroupSchema>;
    id?: number;
    onSave?: (group: CategoryGroup, isNew: boolean) => void;
  }

  let {defaults, id, onSave}: Props = $props();

  const form = superForm(defaults, {
    validators: zod4Client(superformInsertCategoryGroupSchema),
    onResult: async ({result}) => {
      if (onSave && result.type === 'success' && result.data) {
        onSave(result.data['entity'], (id ?? 0) === 0);
      }
    },
  });

  const {form: formData, enhance} = form;

  function handleIconChange(event: CustomEvent<{value: string}>) {
    $formData.groupIcon = event.detail.value;
  }

  function handleColorChange(event: CustomEvent<{value: string}>) {
    $formData.groupColor = event.detail.value;
  }
</script>

<form method="POST" use:enhance>
  <Form.Field {form} name="name">
    <Form.Label>Name</Form.Label>
    <Form.Input bind:value={$formData.name} />
    <Form.FieldErrors />
  </Form.Field>

  <Form.Field {form} name="description">
    <Form.Label>Description</Form.Label>
    <Textarea bind:value={$formData.description} />
    <Form.FieldErrors />
  </Form.Field>

  <Form.Field {form} name="groupIcon">
    <Form.Label>Icon</Form.Label>
    <IconPicker
      value={$formData.groupIcon ?? ''}
      onchange={handleIconChange}
    />
    <Form.FieldErrors />
  </Form.Field>

  <Form.Field {form} name="groupColor">
    <Form.Label>Color</Form.Label>
    <ColorPicker
      value={$formData.groupColor ?? ''}
      onchange={handleColorChange}
    />
    <Form.FieldErrors />
  </Form.Field>

  <Button type="submit">{id ? 'Update' : 'Create'} Group</Button>
</form>
```

#### 5.2 List Component

**File: `src/lib/components/category-groups/category-group-card.svelte`**

Display component for a category group:
- Show icon and color
- Show name and description
- Show category count
- Actions: Edit, Delete, Manage Categories

Follow pattern from category card components using:
- `* as Card` import pattern
- Proper icon imports from `@lucide/svelte`
- `DropdownMenu` with snippet pattern for actions (use `onSelect` with `goto`, NOT `href`)

#### 5.3 Recommendations Panel

**File: `src/lib/components/category-groups/recommendations-panel.svelte`**

Display pending recommendations with actions:
- Show recommendation with confidence score
- Show reasoning
- Actions: Approve, Dismiss, Reject
- Generate new recommendations button
- Show loading states
- Empty state when no recommendations

Use:
- `* as Card` import pattern
- `Button` component
- `Badge` component for confidence scores
- Proper mutation handling with optimistic updates

#### 5.4 Settings Component

**File: `src/lib/components/category-groups/settings-dialog.svelte`**

Settings dialog/sheet:
- Toggle for enabling/disabling recommendations
- Min confidence score slider
- Save button

Use:
- `ResponsiveSheet` or `Dialog` component
- `Switch` component for toggle
- `Slider` component for confidence threshold
- Form submission with mutation

#### 5.5 Category Selector

**File: `src/lib/components/category-groups/category-selector.svelte`**

Multi-select component for adding categories to a group:
- List all categories not in the current group
- Checkbox selection
- Search/filter capability
- Add selected button

Use:
- `Command` component for search
- `Checkbox` component
- Proper state management with `$state` rune

### Phase 6: Pages

#### 6.1 Main List Page

**File: `src/routes/category-groups/+page.svelte`**

Main landing page:
- Grid of category group cards
- "Create New Group" button
- Link to recommendations panel
- Link to settings

Use:
- Query with `.options()` pattern
- Proper loading states
- Empty state
- Error handling

Example:
```svelte
<script lang="ts">
  import {listCategoryGroups} from '$lib/query/category-groups';

  const groupsQuery = listCategoryGroups().options();
  const groups = $derived($groupsQuery.data ?? []);
</script>
```

#### 6.2 Create Page

**File: `src/routes/category-groups/new/+page.svelte`** (or use sheet/dialog)

Create new group:
- Use `ManageCategoryGroupForm` component
- Handle success with navigation
- Handle errors with toast

#### 6.3 Detail/Edit Page

**File: `src/routes/category-groups/[slug]/+page.svelte`**

Group detail and edit:
- Show group details
- Edit form
- List categories in group
- Add/remove categories
- Delete group action

#### 6.4 Recommendations Page

**File: `src/routes/category-groups/recommendations/+page.svelte`** (or use sheet/panel)

Dedicated recommendations page:
- Use `RecommendationsPanel` component
- Show all pending recommendations
- Batch actions
- Settings link

### Phase 7: Navigation

**File: `src/lib/components/layout/app-sidebar.svelte`**

Add menu item:
```svelte
<script>
  import FolderTree from '@lucide/svelte/icons/folder-tree';
</script>

<Sidebar.MenuItem>
  <Sidebar.MenuButton>
    {#snippet child({props})}
      <a href="/category-groups" {...props} class="flex items-center gap-3">
        <FolderTree class="h-4 w-4" />
        <span class="font-medium">Category Groups</span>
      </a>
    {/snippet}
  </Sidebar.MenuButton>
</Sidebar.MenuItem>
```

## Implementation Order

1. **Day 1: Database & Schema**
   - Create migration
   - Create Drizzle schema with Zod validation
   - Export in schema/index.ts
   - Test schema types

2. **Day 2: Repositories**
   - Implement all 4 repositories
   - Test CRUD operations
   - Test relationships and cascades

3. **Day 3: Services**
   - Implement CategoryGroupService
   - Test slug generation and validation
   - Add to ServiceFactory

4. **Day 4: tRPC & Query Layer**
   - Implement tRPC routes with `t.router({})`
   - Register in router.ts (flat structure)
   - Test all endpoints
   - Implement TanStack Query wrappers with createQueryKeys
   - Test cache invalidation

5. **Day 5: Form Component**
   - Create ManageCategoryGroupForm
   - Test with IconPicker and ColorPicker
   - Test validation

6. **Day 6: List & Card Components**
   - Create CategoryGroupCard
   - Create main list page
   - Test with mock data

7. **Day 7: Recommendation Service**
   - Implement RecommendationService with rule-based pattern matching
   - Add 17 grouping rules for common categories
   - Test recommendation generation logic

8. **Day 8: Recommendation UI**
   - Create RecommendationsPanel
   - Create SettingsDialog
   - Test approve/dismiss/reject flows

9. **Day 9: Category Management**
   - Create CategorySelector
   - Implement add/remove categories
   - Test membership updates

10. **Day 10: Polish & Testing**
    - Add navigation
    - End-to-end testing
    - Error handling
    - Loading states
    - Documentation

## Testing Checklist

- [ ] Database migrations run without errors
- [ ] All Zod schemas validate correctly
- [ ] Repository CRUD operations work
- [ ] Service layer handles edge cases (duplicates, not found, etc.)
- [ ] tRPC routes return correct data
- [ ] Query layer updates cache correctly
- [ ] Form validates and submits correctly
- [ ] Icons and colors display properly
- [ ] Recommendations generate successfully
- [ ] Approve/dismiss/reject work correctly
- [ ] Settings persist and apply correctly
- [ ] Category add/remove works
- [ ] Navigation works from all pages
- [ ] Error states show helpful messages
- [ ] Loading states prevent double-clicks
- [ ] Mobile responsive design

## Key Patterns to Follow

1. **Import Patterns**
   - Icons: `import IconName from '@lucide/svelte/icons/icon-name'`
   - Card: `import * as Card from "$lib/components/ui/card"`
   - Form: `import * as Form from "$lib/components/ui/form"`

2. **Component Patterns**
   - Use `$state`, `$derived`, `$effect` runes
   - Props with `interface Props` and `let {...}: Props = $props()`
   - Snippets for compound components
   - DropdownMenu: Use `onSelect` with `goto()`, NOT `href` prop

3. **Query Patterns**
   - Queries are FUNCTIONS: `const query = listItems().options()`
   - Use `.options()` for reactive queries
   - Use `.execute()` for imperative calls
   - Access query data directly (no `$` prefix in `$derived`)
   - Use `createQueryKeys()` for type-safe keys

4. **tRPC Patterns**
   - Routes MUST be wrapped in `t.router({})`
   - Router registration is FLAT (not nested)
   - Use `trpc()` as a function call, not `trpc`
   - Use `withErrorHandler()` or `translateDomainError()`
   - Use `publicProcedure` or `rateLimitedProcedure`

5. **Mutation Patterns**
   - Use `defineMutation<InputType, OutputType>({...})`
   - Use `cachePatterns.invalidatePrefix()` not `queryClient.invalidateQueries()`
   - Include `successMessage` and `errorMessage` properties
   - Call `trpc()` as function

6. **Form Patterns**
   - Use `superForm` with `zod4Client`
   - Use existing `IconPicker` and `ColorPicker` components
   - Handle `onResult` for success/error cases
   - Import `type SuperValidated` from 'sveltekit-superforms'

7. **Error Handling**
   - Throw proper error types (ValidationError, NotFoundError, ConflictError)
   - Use `withErrorHandler()` wrapper in tRPC routes
   - Show user-friendly messages in UI

8. **Sanitization**
   - Use `InputSanitizer.sanitizeName()` for all user input
   - Validate with Zod refinements using `validator.contains()`

9. **Slug Generation**
   - Always generate from name
   - Check uniqueness
   - Add numeric suffix if needed
   - Archive old slugs on delete using `softDeleteWithSlugArchive()`

## Performance & Scalability Considerations

### Recommendation Generation Performance

The `generateRecommendations()` endpoint uses rule-based pattern matching (no external API calls):

**Performance Characteristics:**

- Fast execution: <1 second for up to 1000 categories
- No external dependencies or network calls
- Deterministic results
- No rate limiting needed
- Can run synchronously in tRPC mutation

**Scalability:**

- Pattern matching: O(n × m) where n = categories, m = rules (~20)
- For 100 categories: ~2,000 pattern matches
- Completes in <100ms on modern hardware
- No special timeout handling needed

### Database Performance

**Indexes Added:**

- `idx_cgm_category_id_unique` - Fast lookup for "ungrouped categories"
- `idx_cgr_status` - Fast filtering of pending recommendations
- `idx_cgr_confidence` - Sorted recommendation lists

**Query Optimization:**

- Use LEFT JOIN to find ungrouped categories (single query vs N+1)
- Batch insert recommendations (50 at a time)
- Use transactions for multi-step operations (approve recommendation)

## Notes

- Follow existing patterns exactly - no assumptions
- Use existing components (IconPicker, ColorPicker)
- Read `.llms/` docs for component usage
- Test each phase before moving to next
- Keep user in control - no automatic actions
- Recommendations are suggestions only, based on pattern matching
- Rules can be expanded/customized based on user feedback
- Consider adding user-defined custom grouping rules in future enhancement
