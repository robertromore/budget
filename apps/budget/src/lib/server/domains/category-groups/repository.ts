import { categories, type Category } from "$lib/schema/categories";
import {
  categoryGroupMemberships,
  categoryGroupRecommendations,
  categoryGroups,
  categoryGroupSettings,
  type CategoryGroup,
  type CategoryGroupMembership,
  type CategoryGroupRecommendation,
  type CategoryGroupRecommendationStatus,
  type CategoryGroupSettings,
  type NewCategoryGroup,
  type NewCategoryGroupMembership,
  type NewCategoryGroupRecommendation,
  type NewCategoryGroupSettings,
} from "$lib/schema/category-groups";
import { db } from "$lib/server/db";
import { BaseRepository } from "$lib/server/shared/database/base-repository";
import { NotFoundError } from "$lib/server/shared/types/errors";
import { getCurrentTimestamp } from "$lib/utils/dates";
import { and, count, desc, eq, isNull } from "drizzle-orm";

// ================================================================================
// Types
// ================================================================================

export interface UpdateCategoryGroupData {
  name?: string;
  description?: string | null;
  groupIcon?: string | null;
  groupColor?: string | null;
  sortOrder?: number;
}

export interface CategoryGroupWithCounts extends CategoryGroup {
  memberCount: number;
  pendingRecommendationCount: number;
}

export interface CategoryGroupWithCategories extends CategoryGroup {
  categories: Category[];
}

export interface UpdateCategoryGroupRecommendationData {
  status?: CategoryGroupRecommendationStatus;
  reasoning?: string | null;
}

// ================================================================================
// CategoryGroupRepository
// ================================================================================

/**
 * Repository for category_groups table operations
 */
export class CategoryGroupRepository extends BaseRepository<
  typeof categoryGroups,
  CategoryGroup,
  NewCategoryGroup,
  UpdateCategoryGroupData
> {
  constructor() {
    super(db, categoryGroups, "CategoryGroup");
  }

  /**
   * Find a group by name (case-sensitive)
   */
  async findByName(name: string, workspaceId: number): Promise<CategoryGroup | null> {
    const [result] = await db
      .select()
      .from(categoryGroups)
      .where(and(eq(categoryGroups.name, name), eq(categoryGroups.workspaceId, workspaceId)))
      .limit(1);

    return result || null;
  }

  /**
   * Get all groups with member counts and pending recommendation counts
   */
  async findAllWithCounts(workspaceId: number): Promise<CategoryGroupWithCounts[]> {
    const groups = await db
      .select()
      .from(categoryGroups)
      .where(eq(categoryGroups.workspaceId, workspaceId))
      .orderBy(categoryGroups.sortOrder, categoryGroups.name);

    const groupsWithCounts = await Promise.all(
      groups.map(async (group: CategoryGroup) => {
        const memberCount = await this.getMemberCount(group.id);
        const pendingRecommendationCount = await this.getPendingRecommendationCount(group.id);

        return {
          ...group,
          memberCount,
          pendingRecommendationCount,
        };
      })
    );

    return groupsWithCounts;
  }

  /**
   * Get a group with all its member categories
   */
  async findByIdWithCategories(
    id: number,
    workspaceId: number
  ): Promise<CategoryGroupWithCategories | null> {
    const group = await this.findById(id, workspaceId);
    if (!group) return null;

    const memberCategories = await db
      .select({
        id: categories.id,
        seq: categories.seq,
        workspaceId: categories.workspaceId,
        name: categories.name,
        slug: categories.slug,
        notes: categories.notes,
        parentId: categories.parentId,
        categoryType: categories.categoryType,
        categoryIcon: categories.categoryIcon,
        categoryColor: categories.categoryColor,
        isActive: categories.isActive,
        displayOrder: categories.displayOrder,
        isTaxDeductible: categories.isTaxDeductible,
        taxCategory: categories.taxCategory,
        deductiblePercentage: categories.deductiblePercentage,
        isSeasonal: categories.isSeasonal,
        seasonalMonths: categories.seasonalMonths,
        expectedMonthlyMin: categories.expectedMonthlyMin,
        expectedMonthlyMax: categories.expectedMonthlyMax,
        spendingPriority: categories.spendingPriority,
        incomeReliability: categories.incomeReliability,
        dateCreated: categories.dateCreated,
        createdAt: categories.createdAt,
        updatedAt: categories.updatedAt,
        deletedAt: categories.deletedAt,
      })
      .from(categoryGroupMemberships)
      .innerJoin(categories, eq(categoryGroupMemberships.categoryId, categories.id))
      .where(
        and(
          eq(categoryGroupMemberships.categoryGroupId, id),
          isNull(categories.deletedAt),
          eq(categories.workspaceId, workspaceId)
        )
      )
      .orderBy(categoryGroupMemberships.sortOrder, categories.name);

    return {
      ...group,
      categories: memberCategories,
    };
  }

  /**
   * Get a group with all its member categories (by slug)
   */
  async findBySlugWithCategories(
    slug: string,
    workspaceId: number
  ): Promise<CategoryGroupWithCategories | null> {
    const group = await this.findBySlug(slug, workspaceId);
    if (!group) return null;

    return this.findByIdWithCategories(group.id, workspaceId);
  }

  /**
   * Get member count for a group
   */
  private async getMemberCount(groupId: number): Promise<number> {
    const [result] = await db
      .select({ count: count(categoryGroupMemberships.id) })
      .from(categoryGroupMemberships)
      .where(eq(categoryGroupMemberships.categoryGroupId, groupId));

    return result?.count || 0;
  }

  /**
   * Get pending recommendation count for a group
   */
  private async getPendingRecommendationCount(groupId: number): Promise<number> {
    const [result] = await db
      .select({ count: count(categoryGroupRecommendations.id) })
      .from(categoryGroupRecommendations)
      .where(
        and(
          eq(categoryGroupRecommendations.suggestedGroupId, groupId),
          eq(categoryGroupRecommendations.status, "pending")
        )
      );

    return result?.count || 0;
  }
}

// ================================================================================
// CategoryGroupMembershipRepository
// ================================================================================

/**
 * Repository for category_group_memberships table operations
 */
export class CategoryGroupMembershipRepository extends BaseRepository<
  typeof categoryGroupMemberships,
  CategoryGroupMembership,
  NewCategoryGroupMembership,
  Partial<CategoryGroupMembership>
> {
  constructor() {
    super(db, categoryGroupMemberships, "CategoryGroupMembership");
  }

  /**
   * Add a category to a group
   * Enforces single-group membership via unique constraint
   */
  async addCategoryToGroup(
    categoryId: number,
    categoryGroupId: number,
    sortOrder: number = 0
  ): Promise<CategoryGroupMembership> {
    const [membership] = await db
      .insert(categoryGroupMemberships)
      .values({
        categoryId,
        categoryGroupId,
        sortOrder,
      })
      .returning();

    if (!membership) {
      throw new Error("Failed to add category to group");
    }

    return membership;
  }

  /**
   * Remove a category from its group
   */
  async removeCategoryFromGroup(categoryId: number): Promise<void> {
    await db
      .delete(categoryGroupMemberships)
      .where(eq(categoryGroupMemberships.categoryId, categoryId));
  }

  /**
   * Move a category to a different group
   */
  async moveCategoryToGroup(
    categoryId: number,
    newGroupId: number,
    sortOrder: number = 0
  ): Promise<CategoryGroupMembership> {
    // Remove from current group (if any)
    await this.removeCategoryFromGroup(categoryId);

    // Add to new group
    return await this.addCategoryToGroup(categoryId, newGroupId, sortOrder);
  }

  /**
   * Get the group that a category belongs to
   */
  async findGroupForCategory(
    categoryId: number,
    workspaceId: number
  ): Promise<CategoryGroup | null> {
    const [result] = await db
      .select({
        id: categoryGroups.id,
        workspaceId: categoryGroups.workspaceId,
        name: categoryGroups.name,
        slug: categoryGroups.slug,
        description: categoryGroups.description,
        groupIcon: categoryGroups.groupIcon,
        groupColor: categoryGroups.groupColor,
        sortOrder: categoryGroups.sortOrder,
        createdAt: categoryGroups.createdAt,
        updatedAt: categoryGroups.updatedAt,
      })
      .from(categoryGroupMemberships)
      .innerJoin(categoryGroups, eq(categoryGroupMemberships.categoryGroupId, categoryGroups.id))
      .where(
        and(
          eq(categoryGroupMemberships.categoryId, categoryId),
          eq(categoryGroups.workspaceId, workspaceId)
        )
      )
      .limit(1);

    return result || null;
  }

  /**
   * Check if a category is in any group
   */
  async isCategoryInGroup(categoryId: number): Promise<boolean> {
    const [result] = await db
      .select({ id: categoryGroupMemberships.id })
      .from(categoryGroupMemberships)
      .where(eq(categoryGroupMemberships.categoryId, categoryId))
      .limit(1);

    return !!result;
  }

  /**
   * Get all categories for a group
   */
  async findCategoriesForGroup(groupId: number, workspaceId: number): Promise<Category[]> {
    const results = await db
      .select({
        id: categories.id,
        seq: categories.seq,
        workspaceId: categories.workspaceId,
        name: categories.name,
        slug: categories.slug,
        notes: categories.notes,
        parentId: categories.parentId,
        categoryType: categories.categoryType,
        categoryIcon: categories.categoryIcon,
        categoryColor: categories.categoryColor,
        isActive: categories.isActive,
        displayOrder: categories.displayOrder,
        isTaxDeductible: categories.isTaxDeductible,
        taxCategory: categories.taxCategory,
        deductiblePercentage: categories.deductiblePercentage,
        isSeasonal: categories.isSeasonal,
        seasonalMonths: categories.seasonalMonths,
        expectedMonthlyMin: categories.expectedMonthlyMin,
        expectedMonthlyMax: categories.expectedMonthlyMax,
        spendingPriority: categories.spendingPriority,
        incomeReliability: categories.incomeReliability,
        dateCreated: categories.dateCreated,
        createdAt: categories.createdAt,
        updatedAt: categories.updatedAt,
        deletedAt: categories.deletedAt,
      })
      .from(categoryGroupMemberships)
      .innerJoin(categories, eq(categoryGroupMemberships.categoryId, categories.id))
      .where(
        and(
          eq(categoryGroupMemberships.categoryGroupId, groupId),
          isNull(categories.deletedAt),
          eq(categories.workspaceId, workspaceId)
        )
      )
      .orderBy(categoryGroupMemberships.sortOrder, categories.name);

    return results;
  }

  /**
   * Update sort order for categories in a group
   */
  async updateSortOrders(updates: Array<{ categoryId: number; sortOrder: number }>): Promise<void> {
    await db.transaction(async (tx) => {
      for (const update of updates) {
        await tx
          .update(categoryGroupMemberships)
          .set({ sortOrder: update.sortOrder })
          .where(eq(categoryGroupMemberships.categoryId, update.categoryId));
      }
    });
  }
}

// ================================================================================
// CategoryGroupRecommendationRepository
// ================================================================================

/**
 * Repository for category_group_recommendations table operations
 */
export class CategoryGroupRecommendationRepository extends BaseRepository<
  typeof categoryGroupRecommendations,
  CategoryGroupRecommendation,
  NewCategoryGroupRecommendation,
  UpdateCategoryGroupRecommendationData
> {
  constructor() {
    super(db, categoryGroupRecommendations, "CategoryGroupRecommendation");
  }

  /**
   * Create a new recommendation
   */
  override async create(
    data: NewCategoryGroupRecommendation
  ): Promise<CategoryGroupRecommendation> {
    const [recommendation] = await db.insert(categoryGroupRecommendations).values(data).returning();

    if (!recommendation) {
      throw new Error("Failed to create recommendation");
    }

    return recommendation;
  }

  /**
   * Update recommendation status
   */
  async updateStatus(
    id: number,
    status: CategoryGroupRecommendationStatus
  ): Promise<CategoryGroupRecommendation> {
    const [recommendation] = await db
      .update(categoryGroupRecommendations)
      .set({
        status,
        updatedAt: getCurrentTimestamp(),
      })
      .where(eq(categoryGroupRecommendations.id, id))
      .returning();

    if (!recommendation) {
      throw new NotFoundError("CategoryGroupRecommendation", id);
    }

    return recommendation;
  }

  /**
   * Find all pending recommendations with category names
   */
  async findPending(): Promise<(CategoryGroupRecommendation & { categoryName: string | null })[]> {
    const results = await db
      .select({
        recommendation: categoryGroupRecommendations,
        categoryName: categories.name,
      })
      .from(categoryGroupRecommendations)
      .leftJoin(categories, eq(categoryGroupRecommendations.categoryId, categories.id))
      .where(eq(categoryGroupRecommendations.status, "pending"))
      .orderBy(
        desc(categoryGroupRecommendations.confidenceScore),
        categoryGroupRecommendations.createdAt
      );

    return results.map((row) => ({
      ...row.recommendation,
      categoryName: row.categoryName,
    }));
  }

  /**
   * Find pending recommendations for a specific category
   */
  async findPendingForCategory(categoryId: number): Promise<CategoryGroupRecommendation[]> {
    return await db
      .select()
      .from(categoryGroupRecommendations)
      .where(
        and(
          eq(categoryGroupRecommendations.categoryId, categoryId),
          eq(categoryGroupRecommendations.status, "pending")
        )
      )
      .orderBy(desc(categoryGroupRecommendations.confidenceScore));
  }

  /**
   * Find recommendations by status
   */
  async findByStatus(
    status: CategoryGroupRecommendationStatus
  ): Promise<CategoryGroupRecommendation[]> {
    return await db
      .select()
      .from(categoryGroupRecommendations)
      .where(eq(categoryGroupRecommendations.status, status))
      .orderBy(desc(categoryGroupRecommendations.createdAt));
  }

  /**
   * Delete all recommendations for a category
   */
  async deleteByCategoryId(categoryId: number): Promise<void> {
    await db
      .delete(categoryGroupRecommendations)
      .where(eq(categoryGroupRecommendations.categoryId, categoryId));
  }

  /**
   * Delete all recommendations for a group
   */
  async deleteByGroupId(groupId: number): Promise<void> {
    await db
      .delete(categoryGroupRecommendations)
      .where(eq(categoryGroupRecommendations.suggestedGroupId, groupId));
  }

  /**
   * Get count of pending recommendations
   */
  async getPendingCount(): Promise<number> {
    const [result] = await db
      .select({ count: count(categoryGroupRecommendations.id) })
      .from(categoryGroupRecommendations)
      .where(eq(categoryGroupRecommendations.status, "pending"));

    return result?.count || 0;
  }

  /**
   * Check if a category has any pending recommendations
   */
  async hasPendingRecommendations(categoryId: number): Promise<boolean> {
    const [result] = await db
      .select({ id: categoryGroupRecommendations.id })
      .from(categoryGroupRecommendations)
      .where(
        and(
          eq(categoryGroupRecommendations.categoryId, categoryId),
          eq(categoryGroupRecommendations.status, "pending")
        )
      )
      .limit(1);

    return !!result;
  }
}

// ================================================================================
// CategoryGroupSettingsRepository
// ================================================================================

/**
 * Repository for category_group_settings table operations (singleton)
 */
export class CategoryGroupSettingsRepository extends BaseRepository<
  typeof categoryGroupSettings,
  CategoryGroupSettings,
  NewCategoryGroupSettings,
  Partial<CategoryGroupSettings>
> {
  constructor() {
    super(db, categoryGroupSettings, "CategoryGroupSettings");
  }

  /**
   * Get the singleton settings record
   */
  async getSettings(): Promise<CategoryGroupSettings> {
    const [settings] = await db
      .select()
      .from(categoryGroupSettings)
      .where(eq(categoryGroupSettings.id, 1));

    if (!settings) {
      // Create default settings if they don't exist
      const [newSettings] = await db
        .insert(categoryGroupSettings)
        .values({
          id: 1,
          recommendationsEnabled: true,
          minConfidenceScore: 0.7,
        })
        .returning();

      return newSettings!;
    }

    return settings;
  }

  /**
   * Update settings
   */
  async updateSettings(data: Partial<CategoryGroupSettings>): Promise<CategoryGroupSettings> {
    const [updated] = await db
      .update(categoryGroupSettings)
      .set({
        ...data,
        updatedAt: getCurrentTimestamp(),
      })
      .where(eq(categoryGroupSettings.id, 1))
      .returning();

    if (!updated) {
      throw new NotFoundError("CategoryGroupSettings", 1);
    }

    return updated;
  }

  /**
   * Check if recommendations are enabled
   */
  async areRecommendationsEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.recommendationsEnabled;
  }

  /**
   * Get minimum confidence score threshold
   */
  async getMinConfidenceScore(): Promise<number> {
    const settings = await this.getSettings();
    return settings.minConfidenceScore;
  }
}
